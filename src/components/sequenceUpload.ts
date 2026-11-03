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
