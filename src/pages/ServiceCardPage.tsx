import { useEffect, useRef, useState, type DragEvent } from 'react'
import ServiceCard from '../components/ServiceCard'
import { SERVICE_ITEMS } from '../components/serviceItems'
import { cubesFrames, curveFrames, fullFrames } from '../assets/sequences'
import {
  dataTransferToFiles,
  filesToSequence,
  isVideoFile,
  revokeSequence,
  videoToSequence,
  type LoadedSequence,
} from '../components/sequenceUpload'
import './ServiceCardPage.css'

const BASE_FPS = 60
const VIDEO_FPS = 60 // dropped videos are cut into frames at this rate
const SPEEDS = [1, 2, 4] as const
type Speed = (typeof SPEEDS)[number]

/* Default graphic per card. `null` → the card's still image from
   SERVICE_ITEMS until a folder is loaded into it. */
const DEFAULT_SEQUENCES: (LoadedSequence | null)[] = [
  { name: 'Cubes', frames: cubesFrames },
  { name: 'Curve', frames: curveFrames },
  { name: 'Full', frames: fullFrames },
  null,
]

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

export default function ServiceCardPage() {
  const [sequences, setSequences] = useState(DEFAULT_SEQUENCES)
  const [errors, setErrors] = useState<(string | null)[]>(() => SERVICE_ITEMS.map(() => null))
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  // Video decode progress per card (0..1), null when idle.
  const [decoding, setDecoding] = useState<(number | null)[]>(() => SERVICE_ITEMS.map(() => null))
  const [speed, setSpeed] = useState<Speed>(1)
  const fps = BASE_FPS * speed
  const inputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const decodeControllers = useRef<(AbortController | null)[]>(SERVICE_ITEMS.map(() => null))
  const pickTarget = useRef(0)
  const sequencesRef = useRef(sequences)

  useEffect(() => {
    sequencesRef.current = sequences
  }, [sequences])

  // `webkitdirectory` isn't in React's input typings, so set it directly.
  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  // Free any uploaded frames and stop decodes when leaving the page.
  useEffect(
    () => () => {
      decodeControllers.current.forEach((c) => c?.abort())
      sequencesRef.current.forEach((s, i) => s !== DEFAULT_SEQUENCES[i] && revokeSequence(s))
    },
    [],
  )

  const setSlot = (index: number, next: LoadedSequence | null) => {
    setSequences((prev) => {
      const old = prev[index]
      if (old !== DEFAULT_SEQUENCES[index]) revokeSequence(old)
      return prev.map((s, i) => (i === index ? next : s))
    })
  }

  const setError = (index: number, message: string | null) =>
    setErrors((prev) => prev.map((e, i) => (i === index ? message : e)))

  const setDecodeProgress = (index: number, value: number | null) =>
    setDecoding((prev) => prev.map((d, i) => (i === index ? value : d)))

  // Stop a video still decoding into this card (a newer load or reset wins).
  const cancelDecode = (index: number) => {
    decodeControllers.current[index]?.abort()
    decodeControllers.current[index] = null
    setDecodeProgress(index, null)
  }

  const loadVideo = async (index: number, file: File) => {
    cancelDecode(index)
    const controller = new AbortController()
    decodeControllers.current[index] = controller
    setError(index, null)
    setDecodeProgress(index, 0)

    try {
      const next = await videoToSequence(file, {
        fps: VIDEO_FPS,
        signal: controller.signal,
        onProgress: (done, total) => setDecodeProgress(index, done / total),
      })
      if (controller.signal.aborted) return revokeSequence(next)
      setSlot(index, next)
    } catch (error) {
      if (controller.signal.aborted) return
      setError(index, error instanceof Error ? error.message : "Couldn't read that video.")
    } finally {
      if (decodeControllers.current[index] === controller) {
        decodeControllers.current[index] = null
        setDecodeProgress(index, null)
      }
    }
  }

  const load = (index: number, files: File[], name?: string) => {
    const video = files.find(isVideoFile)
    if (video) {
      loadVideo(index, video)
      return
    }
    cancelDecode(index)
    const next = filesToSequence(files, name)
    if (!next) {
      setError(index, 'No images or video in that drop.')
      return
    }
    setError(index, null)
    setSlot(index, name ? { ...next, name } : next)
  }

  const onCardDrop = async (index: number, event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTarget(null)
    const { files, name } = await dataTransferToFiles(event.dataTransfer)
    load(index, files, name)
  }

  return (
    <main
      className="service-card-page"
      // Swallow drops that miss a card so the browser doesn't open the file.
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        setDropTarget(null)
      }}
    >
      <div className="service-card-page-container">
        <div className="service-card-page-grid">
          {SERVICE_ITEMS.map((item, index) => {
            const sequence = sequences[index]
            const isDefault = sequence === DEFAULT_SEQUENCES[index]
            const progress = decoding[index]

            return (
              <div className="service-card-page-column" key={item.title}>
                <div
                  className="service-card-drop"
                  data-drop-active={dropTarget === index || undefined}
                  onDragEnter={(e) => {
                    if (!hasFiles(e)) return
                    e.preventDefault()
                    setDropTarget(index)
                  }}
                  onDragOver={(e) => {
                    if (!hasFiles(e)) return
                    e.preventDefault()
                    if (dropTarget !== index) setDropTarget(index)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setDropTarget((current) => (current === index ? null : current))
                    }
                  }}
                  onDrop={(e) => onCardDrop(index, e)}
                >
                  <ServiceCard
                    {...item}
                    image={sequence ? undefined : item.image}
                    frames={sequence?.frames}
                    fps={fps}
                  />
                  {dropTarget === index && (
                    <div className="service-card-drop-overlay" aria-hidden="true">
                      Drop to play on {item.title}
                    </div>
                  )}
                </div>

                <div className="sequence-slot">
                  <div className="sequence-slot-info">
                    <span className="sequence-slot-name">{sequence?.name ?? 'Still image'}</span>
                    <span className="sequence-slot-meta">
                      {progress !== null
                        ? `Decoding video… ${Math.round(progress * 100)}%`
                        : errors[index] ??
                        (sequence
                          ? `${sequence.frames.length} frames · ${(sequence.frames.length / fps).toFixed(2)}s`
                          : 'No sequence')}
                    </span>
                  </div>
                  <div className="sequence-slot-actions">
                    {(!isDefault || progress !== null) && (
                      <button
                        type="button"
                        className="sequence-slot-button"
                        onClick={() => {
                          cancelDecode(index)
                          setError(index, null)
                          setSlot(index, DEFAULT_SEQUENCES[index])
                        }}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      className="sequence-slot-button sequence-slot-button-primary"
                      aria-label={`Choose a frame folder for ${item.title}`}
                      onClick={() => {
                        pickTarget.current = index
                        inputRef.current?.click()
                      }}
                    >
                      Folder
                    </button>
                    <button
                      type="button"
                      className="sequence-slot-button sequence-slot-button-primary"
                      aria-label={`Choose a video for ${item.title}`}
                      onClick={() => {
                        pickTarget.current = index
                        videoInputRef.current?.click()
                      }}
                    >
                      Video
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="service-card-page-toolbar">
          <p className="service-card-page-hint">
            Hover a card to play its sequence. Drop a folder of frames or a video (cut into frames at 60fps) onto a
            card, or use its buttons, to swap it.
          </p>
          <div className="speed-control" role="group" aria-label="Playback speed">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                className="speed-control-button"
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        className="sequence-slot-input"
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          load(pickTarget.current, Array.from(e.target.files ?? []))
          e.target.value = '' // allow re-picking the same folder
        }}
      />
      <input
        ref={videoInputRef}
        className="sequence-slot-input"
        type="file"
        accept="video/*"
        onChange={(e) => {
          load(pickTarget.current, Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </main>
  )
}
