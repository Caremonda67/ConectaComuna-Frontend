import { useMemo } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface Props {
  active?: boolean
  className?: string
}

interface Particle {
  id: number
  type: 'rect' | 'circle' | 'star'
  xApex: number
  yApex: number
  xEnd: number
  yEnd: number
  size: number
  color: string
  delay: number
  duration: number
  rotateZ: number
  rotateX: number
}

// Paleta festiva caleña y comunal: Esmeralda Samán, Oro Caleño, Ámbar Cálido y Crema
const FESTIVE_COLORS = [
  '#10B981', // Esmeralda vivo
  '#059669', // Verde samán profundo
  '#F59E0B', // Oro caleño
  '#FBBF24', // Ámbar brillante
  '#D97706', // Ocre tostado
  '#34D399', // Menta claro
  '#FEF3C7', // Crema festivo
  '#38BDF8', // Acento cielo caleño
]

function generateParticles(count = 28): Particle[] {
  const particles: Particle[] = []

  for (let i = 0; i < count; i++) {
    // Distribución en abanico hacia arriba: entre -145° (hacia la izquierda y arriba) y -35° (hacia la derecha y arriba)
    const normalizedIndex = i / (count - 1)
    const baseAngle = -145 + normalizedIndex * 110 + (Math.sin(i * 3.7) * 12)
    const angleRad = (baseAngle * Math.PI) / 180

    // Impulso inicial: fuerza variable
    const distance = 65 + (Math.abs(Math.sin(i * 2.1)) * 55)
    const xApex = Math.cos(angleRad) * distance
    const yApex = Math.sin(angleRad) * distance // Negativo (hacia arriba)

    // Caída con gravedad y deriva horizontal por resistencia del aire
    const gravityDrop = 35 + (Math.abs(Math.cos(i * 1.7)) * 45)
    const driftX = (Math.sin(i * 4.3) * 20)
    const xEnd = xApex + driftX
    const yEnd = yApex + gravityDrop // Cae por debajo del ápice

    const typeRandom = (i % 5)
    const type: Particle['type'] = typeRandom === 0 || typeRandom === 3 ? 'rect' : typeRandom === 1 ? 'circle' : 'star'

    particles.push({
      id: i,
      type,
      xApex,
      yApex,
      xEnd,
      yEnd,
      size: type === 'rect' ? 8 : type === 'star' ? 14 : 7,
      color: FESTIVE_COLORS[i % FESTIVE_COLORS.length],
      delay: (i % 6) * 0.02,
      duration: 1.15 + (Math.sin(i) * 0.25),
      rotateZ: -180 + (i * 37) % 360,
      rotateX: 180 + (i * 43) % 540,
    })
  }

  return particles
}

export function SparkleCelebration({ active = false, className }: Props) {
  const prefersReduced = useReducedMotion()
  const particles = useMemo(() => generateParticles(28), [])

  if (prefersReduced) return null

  return (
    <AnimatePresence>
      {active && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 overflow-visible',
            className,
          )}
        >
          {particles.map((p) => {
            const isRect = p.type === 'rect'
            const isStar = p.type === 'star'

            return (
              <motion.span
                key={p.id}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 0,
                  rotateZ: 0,
                  rotateX: 0,
                }}
                animate={{
                  x: [0, p.xApex * 0.6, p.xApex, p.xEnd],
                  y: [0, p.yApex * 0.8, p.yApex, p.yEnd],
                  scale: [0, 1.25, 1, 0.85, 0],
                  opacity: [0, 1, 1, 0.9, 0],
                  rotateZ: [0, p.rotateZ * 0.5, p.rotateZ],
                  rotateX: [0, p.rotateX * 0.5, p.rotateX],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  times: [0, 0.25, 0.45, 1],
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  color: p.color,
                }}
                className="flex items-center justify-center transform-gpu will-change-transform"
              >
                {isStar ? (
                  /* Estrellita de brillo artesanal */
                  <svg
                    width={p.size}
                    height={p.size}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="drop-shadow-xs"
                  >
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                ) : isRect ? (
                  /* Papelito rectangular que aletea en 3D */
                  <span
                    style={{
                      width: p.size,
                      height: p.size * 1.6,
                      backgroundColor: p.color,
                      borderRadius: 1.5,
                    }}
                    className="block shadow-2xs"
                  />
                ) : (
                  /* Lunarcito de papel redondo */
                  <span
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                    }}
                    className="block rounded-full shadow-2xs"
                  />
                )}
              </motion.span>
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}
