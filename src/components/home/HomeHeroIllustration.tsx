import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { MapPin, KeyRound, Wrench, Scissors, Sparkles, ShoppingBag } from 'lucide-react'

interface ServiceNode {
  id: string
  label: string
  slug: string
  icon: typeof KeyRound
  color: string
  bg: string
  borderColor: string
  badgeBg: string
  badgeText: string
  x: number // porcentaje horizontal
  y: number // porcentaje vertical
  floatDuration: number
  floatDelay: number
  rotationRange: number[]
}

const NODES: ServiceNode[] = [
  {
    id: 'tecnologia',
    label: 'Arreglos',
    slug: 'tecnologia',
    icon: Wrench,
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    borderColor: 'border-sky-200 dark:border-sky-800/60',
    badgeBg: 'bg-sky-100 dark:bg-sky-900/60',
    badgeText: 'text-sky-800 dark:text-sky-200',
    x: 50,
    y: 19,
    floatDuration: 4.0,
    floatDelay: 0.3,
    rotationRange: [4, -4, 4],
  },
  {
    id: 'cerrajeria',
    label: 'Cerrajería',
    slug: 'cerrajeria',
    icon: KeyRound,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
    badgeText: 'text-amber-800 dark:text-amber-200',
    x: 20,
    y: 31,
    floatDuration: 4.4,
    floatDelay: 0,
    rotationRange: [-5, 5, -5],
  },
  {
    id: 'belleza',
    label: 'Belleza',
    slug: 'belleza',
    icon: Sparkles,
    color: 'text-pink-600 dark:text-pink-300',
    bg: 'bg-pink-50 dark:bg-pink-950/50',
    borderColor: 'border-pink-200 dark:border-pink-800/60',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/60',
    badgeText: 'text-pink-800 dark:text-pink-200',
    x: 80,
    y: 31,
    floatDuration: 4.8,
    floatDelay: 0.5,
    rotationRange: [0, 5, 0],
  },
  {
    id: 'costura',
    label: 'Costura',
    slug: 'costura',
    icon: Scissors,
    color: 'text-indigo-600 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800/60',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60',
    badgeText: 'text-indigo-800 dark:text-indigo-200',
    x: 24,
    y: 72,
    floatDuration: 5.0,
    floatDelay: 0.8,
    rotationRange: [4, -4, 4],
  },
  {
    id: 'ambulante',
    label: 'Comercio',
    slug: 'ambulante',
    icon: ShoppingBag,
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    x: 76,
    y: 72,
    floatDuration: 4.6,
    floatDelay: 1.2,
    rotationRange: [-4, 4, -4],
  },
]

export function HomeHeroIllustration() {
  const prefersReduced = useReducedMotion()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [burstPing, setBurstPing] = useState(0)

  return (
    <div
      className="relative isolate z-0 h-72 sm:h-80 lg:h-84 w-full overflow-hidden rounded-2xl border border-brand-200/70 dark:border-brand-900/40 bg-gradient-to-br from-brand-50/90 via-white to-brand-100/40 dark:from-brand-950/40 dark:via-cream-50 dark:to-brand-950/20 shadow-xs select-none"
      aria-label="Mapa interactivo animado de servicios de la comuna"
    >
      {/* Patrón de cuadrícula tenue de fondo simulando mapa barrial */}
      <svg
        className="absolute inset-0 h-full w-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-brand-600" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Líneas de conexión radiales entre el centro y los servicios */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        {NODES.map((node) => (
          <line
            key={node.id}
            x1="50%"
            y1="50%"
            x2={`${node.x}%`}
            y2={`${node.y}%`}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-brand-300/80 transition-colors"
          />
        ))}
      </svg>

      {/* Ondas expansivas de radar continuas, sincronizadas y fluidas */}
      {!prefersReduced && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="animate-radar-wave-1 absolute left-1/2 top-1/2 h-16 w-16 rounded-full border-2 border-brand-400/80 shadow-[0_0_12px_rgba(111,178,87,0.25)]" />
          <div className="animate-radar-wave-2 absolute left-1/2 top-1/2 h-16 w-16 rounded-full border-2 border-brand-400/70 shadow-[0_0_10px_rgba(111,178,87,0.2)]" />
          <div className="animate-radar-wave-3 absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-brand-400/60 shadow-[0_0_8px_rgba(111,178,87,0.15)]" />
        </div>
      )}

      {/* NODO CENTRAL: Tu ubicación / El centro de la comuna */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
        {/* Onda expansiva de respuesta al tocar el botón central */}
        {burstPing > 0 && (
          <span
            key={burstPing}
            className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 animate-ping opacity-75"
            style={{ animationDuration: '0.8s', animationIterationCount: 1 }}
          />
        )}

        <motion.button
          type="button"
          onClick={() => setBurstPing((v) => v + 1)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          animate={
            prefersReduced
              ? {}
              : {
                  y: [0, -4, 0],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-600/30 border-2 border-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer"
          title="Toca para emitir señal de búsqueda en tu comuna"
        >
          <MapPin size={28} strokeWidth={2.2} className="drop-shadow-xs" />
          <span className="sr-only">Tu ubicación en la comuna</span>
        </motion.button>

        {/* Sombra de apoyo que respira en sincronía */}
        {!prefersReduced && (
          <motion.span
            animate={{
              scale: [1, 0.8, 1],
              opacity: [0.3, 0.15, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="mt-1 h-1.5 w-7 rounded-full bg-ink-900/30 blur-[1px]"
          />
        )}

        <span className="mt-1 rounded-full bg-white/95 dark:bg-cream-50/95 px-2.5 py-0.5 text-xs font-bold text-brand-800 dark:text-brand-600 shadow-xs border border-brand-200 dark:border-brand-900/60 whitespace-nowrap">
          Tu barrio
        </span>
      </div>

      {/* NODOS DE SERVICIOS ORBITANDO CON ANIMACIÓN */}
      {NODES.map((node) => {
        const Icon = node.icon
        const isHovered = hoveredId === node.id

        return (
          <motion.div
            key={node.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
            }}
            animate={
              prefersReduced
                ? {}
                : {
                    y: [0, -5, 0],
                    rotate: node.rotationRange,
                  }
            }
            transition={{
              duration: node.floatDuration,
              delay: node.floatDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            onMouseEnter={() => setHoveredId(node.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Link
              to={`/explorar?categoria=${node.slug}`}
              className="group flex flex-col items-center focus:outline-hidden"
              title={`Ver servicios de ${node.label}`}
            >
              <motion.div
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl ${node.bg} ${node.color} border ${node.borderColor} shadow-xs group-hover:shadow-md transition-shadow`}
              >
                <Icon
                  size={22}
                  strokeWidth={1.8}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                {/* Chispita o indicador activo en hover */}
                {isHovered && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-500 border-2 border-white"
                  />
                )}
              </motion.div>

              {/* Etiqueta interactiva con nombre del servicio */}
              <motion.span
                animate={{
                  y: isHovered ? -2 : 0,
                  scale: isHovered ? 1.04 : 1,
                }}
                className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight shadow-2xs border ${node.borderColor} ${node.badgeBg} ${node.badgeText} transition-colors whitespace-nowrap`}
              >
                {node.label}
              </motion.span>
            </Link>
          </motion.div>
        )
      })}

      {/* Sugerencia discreta para interactuar */}
      <div className="absolute bottom-2 left-3 z-0 pointer-events-none hidden sm:block">
        <span className="text-xs font-medium text-ink-400">
          ✦ Toca cualquier servicio para explorar
        </span>
      </div>
    </div>
  )
}
