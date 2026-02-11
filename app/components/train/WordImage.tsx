'use client'

type WordImageProps = {
  src: string | null
  alt?: string
  square?: boolean
}

export function WordImage({ src, alt = 'card', square = true }: WordImageProps) {
  return (
    <div
      className={[
        'h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5',
        square ? 'aspect-square' : '',
      ].join(' ')}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-white/40">No image</div>
      )}
    </div>
  )
}