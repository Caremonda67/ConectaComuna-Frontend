import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { UI_ICONS } from '@/components/ui/icons'

interface Props {
  images: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
  title?: string
}

export function ImageLightboxModal({
  images,
  initialIndex = 0,
  open,
  onClose,
  title,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Bloqueo de scroll en el fondo mientras el visor está abierto
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const goNext = useCallback(() => {
    if (images.length <= 1) return
    setIsZoomed(false)
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    if (images.length <= 1) return
    setIsZoomed(false)
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  // Atajos de teclado para accesibilidad y navegación fluida
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false)
        } else {
          onClose()
        }
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === '+' || e.key === '=') {
        setIsZoomed(true)
      } else if (e.key === '-') {
        setIsZoomed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isZoomed, onClose, goNext, goPrev])

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isZoomed) {
      setIsZoomed(false)
      return
    }

    // Calcula el punto donde hizo clic para hacer zoom centrado allí
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomOrigin({ x, y })
    setIsZoomed(true)
  }

  if (!open || images.length === 0) return null

  const currentImage = images[currentIndex] || images[0]

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Visor de imagen de portafolio'}
        className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none touch-none text-white"
        ref={containerRef}
      >
        {/* Barra superior de controles */}
        <header className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs">
              {currentIndex + 1} de {images.length}
            </span>
            {title && (
              <span className="text-xs sm:text-sm text-white/85 truncate hidden xs:inline">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botón de alternar zoom */}
            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer"
              title={isZoomed ? 'Reducir tamaño (Esc)' : 'Ampliar imagen (Clic en foto)'}
              aria-label={isZoomed ? 'Reducir zoom' : 'Aumentar zoom'}
            >
              {isZoomed ? (
                <>
                  <UI_ICONS.zoomOut size={16} />
                  <span className="hidden sm:inline">Alejar</span>
                </>
              ) : (
                <>
                  <UI_ICONS.zoomIn size={16} />
                  <span className="hidden sm:inline">Zoom</span>
                </>
              )}
            </button>

            {/* Botón de cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white transition-all cursor-pointer"
              title="Cerrar visor (Esc)"
              aria-label="Cerrar visor"
            >
              <UI_ICONS.close size={20} />
            </button>
          </div>
        </header>

        {/* Área principal de visualización */}
        <div
          className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-default"
          onClick={(e) => {
            // Si hace clic en el fondo oscuro fuera de la imagen y no está en zoom, cierra
            if (e.target === e.currentTarget && !isZoomed) {
              onClose()
            }
          }}
        >
          {/* Navegación anterior */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 sm:left-4 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/45 hover:bg-black/75 active:scale-90 text-white transition-all backdrop-blur-xs cursor-pointer shadow-md"
              title="Foto anterior (Flecha izquierda)"
              aria-label="Foto anterior"
            >
              <UI_ICONS.chevronLeft size={24} />
            </button>
          )}

          {/* Imagen con zoom y transición suave */}
          <div className="relative max-h-full max-w-full flex items-center justify-center overflow-hidden">
            <motion.img
              key={currentImage}
              src={currentImage}
              alt={title || `Foto ${currentIndex + 1} del portafolio`}
              onClick={handleImageClick}
              style={{
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
              }}
              animate={{
                scale: isZoomed ? 2.3 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 28,
              }}
              className={`max-h-[82vh] max-w-[94vw] rounded-lg object-contain select-none transition-shadow ${
                isZoomed ? 'cursor-zoom-out shadow-2xl' : 'cursor-zoom-in hover:brightness-105'
              }`}
              draggable={false}
            />
          </div>

          {/* Navegación siguiente */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 sm:right-4 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/45 hover:bg-black/75 active:scale-90 text-white transition-all backdrop-blur-xs cursor-pointer shadow-md"
              title="Siguiente foto (Flecha derecha)"
              aria-label="Siguiente foto"
            >
              <UI_ICONS.chevronRight size={24} />
            </button>
          )}
        </div>

        {/* Tira inferior de miniaturas e indicación rápida */}
        <footer className="relative z-20 flex flex-col items-center gap-2 pb-4 pt-2 px-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-[11px] text-neutral-300">
            {isZoomed
              ? 'Toca la foto o presiona Esc para volver al tamaño original'
              : 'Toca la foto para ampliar con zoom · Usa las flechas para navegar'}
          </p>

          {images.length > 1 && (
            <div className="flex items-center gap-2 max-w-full overflow-x-auto py-1 px-2 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => {
                    setIsZoomed(false)
                    setCurrentIndex(idx)
                  }}
                  className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'border-brand-400 scale-105 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-100'
                  }`}
                  aria-label={`Ver foto ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    className="h-10 w-10 sm:h-12 sm:w-12 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </footer>
      </div>
    </AnimatePresence>
  )
}
