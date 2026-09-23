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
  // Posiciones relativas en porcentaje para que escale tanto en móvil como en escritorio
  mobile: { x: number; y: number }
  desktop: { x: number; y: number }
  floatDuration: number
  floatDelay: number
  rotationRange: number[]
}

const NODES: ServiceNode[] = [
  {
    id: 'cerrajeria',
    label: 'Cerrajería',
    slug: 'cerrajeria',
    icon: KeyRound,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    mobile: { x: 14, y: 20 },
    desktop: { x: 12, y: 22 },
    floatDuration: 4.2,
    floatDelay: 0,
    rotationRange: [-10, 10, -10],
  },
  {
    id: 'belleza',
    label: 'Belleza',
    slug: 'belleza',
    icon: Sparkles,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    borderColor: 'border-pink-200',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800',
    mobile: { x: 84, y: 22 },
    desktop: { x: 82, y: 24 },
    floatDuration: 4.8,
    floatDelay: 0.5,
    rotationRange: [0, 8, 0],
  },
  {
    id: 'costura',
    label: 'Costura',
    slug: 'costura',
    icon: Scissors,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    mobile: { x: 20, y: 78 },
    desktop: { x: 22, y: 76 },
    floatDuration: 5.1,
    floatDelay: 0.8,
    rotationRange: [6, -6, 6],
  },
  {
    id: 'ambulante',
    label: 'Comercio',
    slug: 'ambulante',
    icon: ShoppingBag,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    mobile: { x: 82, y: 76 },
    desktop: { x: 80, y: 75 },
    floatDuration: 4.5,
    floatDelay: 1.2,
    rotationRange: [-5, 5, -5],
  },
  {
    id: 'tecnologia',
    label: 'Arreglos',
    slug: 'tecnologia',
    icon: Wrench,
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    mobile: { x: 50, y: 14 },
    desktop: { x: 50, y: 12 },
    floatDuration: 3.9,
    floatDelay: 0.3,
    rotationRange: [8, -8, 8],
  },
]

export function HomeHeroIllustration() {
  const prefersReduced = useReducedMotion()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [radarTrigger, setRadarTrigger] = useState(0)

  return (
    <div
      className="relative h-64 sm:h-72 lg:h-80 w-full overflow-hidden rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50/90 via-white to-brand-100/40 shadow-xs select-none"
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
            x2={`${node.desktop.x}%`}
            y2={`${node.desktop.y}%`}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-brand-300/80 transition-colors"
          />
        ))}
      </svg>

      {/* Ondas expansivas de radar desde el centro */}
      {!prefersReduced && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            key={`radar-1-${radarTrigger}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-400"
            initial={{ width: 40, height: 40, opacity: 0.7, scale: 0.8 }}
            animate={{ width: 220, height: 220, opacity: 0, scale: 1.4 }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            key={`radar-2-${radarTrigger}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-300"
            initial={{ width: 40, height: 40, opacity: 0.6, scale: 0.8 }}
            animate={{ width: 220, height: 220, opacity: 0, scale: 1.4 }}
            transition={{
              duration: 3.2,
              delay: 1.6,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </div>
      )}

      {/* NODO CENTRAL: Tu ubicación / El centro de la comuna */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <motion.button
          type="button"
          onClick={() => setRadarTrigger((v) => v + 1)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          animate={
            prefersReduced
              ? {}
              : {
                  y: [0, -5, 0],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-600/30 border-2 border-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer"
          title="Toca para emitir señal de búsqueda en tu comuna"
        >
          <MapPin size={32} strokeWidth={2.2} className="drop-shadow-xs" />
          <span className="sr-only">Tu ubicación en la comuna</span>

          {/* Anillo de pulso sutil del botón central */}
          <span className="absolute -inset-1 rounded-full border border-brand-400 animate-ping opacity-30 pointer-events-none" />
        </motion.button>

        {/* Sombra de apoyo que respira en sincronía */}
        {!prefersReduced && (
          <motion.span
            animate={{
              scale: [1, 0.75, 1],
              opacity: [0.3, 0.15, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="mt-1 h-1.5 w-8 rounded-full bg-ink-900/40 blur-[1px]"
          />
        )}

        <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-brand-800 shadow-xs border border-brand-200">
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
              left: `${node.desktop.x}%`,
              top: `${node.desktop.y}%`,
            }}
            animate={
              prefersReduced
                ? {}
                : {
                    y: [0, -8, 0],
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
                whileHover={{ scale: 1.18, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl ${node.bg} ${node.color} border ${node.borderColor} shadow-sm group-hover:shadow-md transition-shadow`}
              >
                <Icon
                  size={24}
                  strokeWidth={1.8}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                {/* Chispita o indicador activo en hover */}
                {isHovered && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand-500 border-2 border-white"
                  />
                )}
              </motion.div>

              {/* Etiqueta interactiva con nombre del servicio */}
              <motion.span
                animate={{
                  y: isHovered ? -2 : 0,
                  scale: isHovered ? 1.05 : 1,
                }}
                className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-tight shadow-2xs border ${node.borderColor} ${node.badgeBg} ${node.badgeText} transition-colors`}
              >
                {node.label}
              </motion.span>
            </Link>
          </motion.div>
        )
      })}

      {/* Sugerencia discreta para interactuar */}
      <div className="absolute bottom-2 left-3 z-0 pointer-events-none hidden sm:block">
        <span className="text-[10px] font-medium text-ink-400">
          ✦ Toca cualquier servicio para explorar
        </span>
      </div>
    </div>
  )
}
