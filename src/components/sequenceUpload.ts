/* Turn a user-supplied folder (file picker or drag & drop) into a sorted list
   of frame URLs for FrameSequence. Nothing is uploaded anywhere: frames stay
   in the browser as object URLs. */

const IMAGE_EXT = /\.(png|webp|jpe?g|avif|gif)$/i

export type LoadedSequence = { name: string; frames: string[] }

// Natural sort so "frame2.png" comes before "frame10.png", whatever the padding.
const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

const relativePath = (file: File) =>
  (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

export function filesToSequence(files: File[], fallbackName = 'Uploaded'): LoadedSequence | null {
  const images = files
    .filter((file) => IMAGE_EXT.test(file.name) && !file.name.startsWith('.'))
    .sort((a, b) => naturalCompare(relativePath(a), relativePath(b)))

  if (images.length === 0) return null

  const firstPath = relativePath(images[0])
  const name = firstPath.includes('/') ? firstPath.split('/')[0] : fallbackName

  return { name, frames: images.map((file) => URL.createObjectURL(file)) }
}

export function revokeSequence(sequence: LoadedSequence | null) {
  sequence?.frames.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  })
}

/* Drag & drop: walk dropped folders recursively. Dropping loose files also
   works. Uses the entries API, which is what exposes folder contents. */
export async function dataTransferToFiles(dataTransfer: DataTransfer): Promise<{ files: File[]; name?: string }> {
  const entries = Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry))

  if (entries.length === 0) return { files: Array.from(dataTransfer.files) }

  const files: { file: File; path: string }[] = []

  const readAllEntries = (reader: FileSystemDirectoryReader) =>
    new Promise<FileSystemEntry[]>((resolve, reject) => {
      const all: FileSystemEntry[] = []
      // readEntries returns results in batches (~100); keep reading until empty.
      const next = () =>
        reader.readEntries((batch) => {
          if (batch.length === 0) resolve(all)
          else {
            all.push(...batch)
            next()
          }
        }, reject)
      next()
    })

  const walk = async (entry: FileSystemEntry, path: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      )
      files.push({ file, path: `${path}${file.name}` })
    } else if (entry.isDirectory) {
      const children = await readAllEntries((entry as FileSystemDirectoryEntry).createReader())
      await Promise.all(children.map((child) => walk(child, `${path}${entry.name}/`)))
    }
  }

  await Promise.all(entries.map((entry) => walk(entry, '')))
  files.sort((a, b) => naturalCompare(a.path, b.path))

  const folder = entries.length === 1 && entries[0].isDirectory ? entries[0].name : undefined
  return { files: files.map((f) => f.file), name: folder }
}

/* ---------- Video → frame sequence ----------
   A dropped video is cut into still frames at `fps` (seek, draw, encode), so
   it plays through FrameSequence exactly like a PNG folder: forward on hover,
   backward from the current frame on leave. <video> can't play in reverse
   reliably, so we don't play the video itself. */

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)$/i

export const isVideoFile = (file: File) => file.type.startsWith('video/') || VIDEO_EXT.test(file.name)

const abortError = () => new DOMException('Aborted', 'AbortError')

// Resolve on `event`, reject on a media error or abort.
function once(video: HTMLVideoElement, event: string, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const cleanup = () => {
      video.removeEventListener(event, onEvent)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }
    const onEvent = () => (cleanup(), resolve())
    const onError = () => (cleanup(), reject(new Error("Couldn't read that video.")))
    const onAbort = () => (cleanup(), reject(abortError()))
    video.addEventListener(event, onEvent)
    video.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort)
  })
}

type VideoOptions = {
  fps?: number
  /** Longest side of the extracted frames, px. Matches the bundled 400×400 sequences. */
  maxSize?: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

export async function videoToSequence(
  file: File,
  { fps = 60, maxSize = 400, signal, onProgress }: VideoOptions = {},
): Promise<LoadedSequence> {
  const src = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = src

  const frames: string[] = []
  try {
    await once(video, 'loadeddata', signal)
    const { duration, videoWidth, videoHeight } = video
    if (!videoWidth || !Number.isFinite(duration) || duration <= 0) {
      throw new Error("Couldn't read that video's length.")
    }

    const total = Math.max(1, Math.round(duration * fps))
    const scale = Math.min(1, maxSize / Math.max(videoWidth, videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(videoWidth * scale)
    canvas.height = Math.round(videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable.')

    for (let i = 0; i < total; i++) {
      // Seek to the middle of frame i so rounding never lands on a neighbour.
      video.currentTime = Math.min((i + 0.5) / fps, duration - 0.001)
      await once(video, 'seeked', signal)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      // WebP keeps alpha (e.g. VP9-alpha WebM); browsers without WebP encode fall back to PNG.
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92))
      if (!blob) throw new Error("Couldn't encode a frame.")
      if (signal?.aborted) throw abortError()
      frames.push(URL.createObjectURL(blob))
      onProgress?.(i + 1, total)
    }

    return { name: file.name.replace(/\.[^.]+$/, ''), frames }
  } catch (error) {
    frames.forEach((url) => URL.revokeObjectURL(url))
    throw error
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(src)
  }
}
