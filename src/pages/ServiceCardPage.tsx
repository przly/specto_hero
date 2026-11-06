import { useEffect, useRef, useState, type DragEvent } from 'react'
import ServiceCard from '../components/ServiceCard'
import { SERVICE_ITEMS } from '../components/serviceItems'
import './ServiceCardPage.css'

const SPEEDS = [1, 2, 4] as const
type Speed = (typeof SPEEDS)[number]

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)$/i
const isVideoFile = (file: File) => file.type.startsWith('video/') || VIDEO_EXT.test(file.name)

/* A video loaded into a card. Nothing is uploaded anywhere: it stays in the
   browser as an object URL. `null` → the card's default from SERVICE_ITEMS. */
type LoadedVideo = { name: string; src: string }

const revoke = (video: LoadedVideo | null) => video && URL.revokeObjectURL(video.src)

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

export default function ServiceCardPage() {
  const [videos, setVideos] = useState<(LoadedVideo | null)[]>(() => SERVICE_ITEMS.map(() => null))
  const [errors, setErrors] = useState<(string | null)[]>(() => SERVICE_ITEMS.map(() => null))
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickTarget = useRef(0)
  const videosRef = useRef(videos)

  useEffect(() => {
    videosRef.current = videos
  }, [videos])

  // Free any loaded videos when leaving the page.
  useEffect(() => () => videosRef.current.forEach(revoke), [])

  const setSlot = (index: number, next: LoadedVideo | null) => {
    setVideos((prev) => {
      revoke(prev[index])
      return prev.map((v, i) => (i === index ? next : v))
    })
  }

  const setError = (index: number, message: string | null) =>
    setErrors((prev) => prev.map((e, i) => (i === index ? message : e)))

  const load = (index: number, files: File[]) => {
    const file = files.find(isVideoFile)
    if (!file) {
      setError(index, 'No video in that drop.')
      return
    }
    setError(index, null)
    setSlot(index, { name: file.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(file) })
  }

  const onCardDrop = (index: number, event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTarget(null)
    load(index, Array.from(event.dataTransfer.files))
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
            const loaded = videos[index]

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
                  <ServiceCard {...item} video={loaded?.src ?? item.video} rate={speed} />
                  {dropTarget === index && (
                    <div className="service-card-drop-overlay" aria-hidden="true">
                      Drop to play on {item.title}
                    </div>
                  )}
                </div>

                <div className="video-slot">
                  <div className="video-slot-info">
                    <span className="video-slot-name">{loaded?.name ?? item.title}</span>
                    <span className="video-slot-meta">{errors[index] ?? (loaded ? 'Your video' : 'Default video')}</span>
                  </div>
                  <div className="video-slot-actions">
                    {loaded && (
                      <button
                        type="button"
                        className="video-slot-button"
                        onClick={() => {
                          setError(index, null)
                          setSlot(index, null)
                        }}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      className="video-slot-button video-slot-button-primary"
                      aria-label={`Choose a video for ${item.title}`}
                      onClick={() => {
                        pickTarget.current = index
                        inputRef.current?.click()
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
            Hover a card to play its video. Drop a video onto a card, or use its Video button, to swap it.
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
        className="video-slot-input"
        type="file"
        accept="video/*"
        onChange={(e) => {
          load(pickTarget.current, Array.from(e.target.files ?? []))
          e.target.value = '' // allow re-picking the same file
        }}
      />
    </main>
  )
}
