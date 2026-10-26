import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  animated?: boolean
}

const sizeConfig = {
  sm: { width: 72, height: 72, viewBox: '0 0 120 120', textR: 38, fontTop: 7.5, fontBottom: 6.5 },
  md: { width: 104, height: 104, viewBox: '0 0 120 120', textR: 38, fontTop: 7.5, fontBottom: 6.5 },
  lg: { width: 136, height: 136, viewBox: '0 0 120 120', textR: 38, fontTop: 7.5, fontBottom: 6.5 },
}

export function SelloOficialComunal({
  size = 'md',
  className,
  animated = true,
}: Props) {
  const prefersReduced = useReducedMotion()
  const conf = sizeConfig[size]

  const animProps = animated && !prefersReduced
    ? {
        initial: { scale: 1.35, rotate: -15, opacity: 0 },
        animate: { scale: 1, rotate: -3.5, opacity: 1 },
        whileHover: { scale: 1.05, rotate: 0 },
        whileTap: { scale: 0.95 },
        transition: { type: 'spring' as const, damping: 20, stiffness: 260, delay: 0.15 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2 },
      }

  return (
    <motion.div
      {...animProps}
      className={cn('inline-flex items-center justify-center select-none shrink-0 drop-shadow-md', className)}
      title="Sello de Garantía Comunal respaldado por la Junta de Acción Comunal (JAC)"
      aria-label="Sello Oficial de Trato Seguro Comunal"
    >
      <svg
        width={conf.width}
        height={conf.height}
        viewBox={conf.viewBox}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Trayectorias circulares superior e inferior para el texto en arco */}
          <path id="curve-seal-top" d="M 22,60 A 38,38 0 0,1 98,60" fill="none" />
          <path id="curve-seal-bottom" d="M 98,60 A 38,38 0 0,1 22,60" fill="none" />
        </defs>

        {/* Borde exterior dentado / linograbado popular */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          className="text-emerald-800 dark:text-emerald-400 opacity-90"
        />

        {/* Disco interior con tinte de caucho de imprenta */}
        <circle
          cx="60"
          cy="60"
          r="49"
          className="fill-emerald-900/90 dark:fill-emerald-950 stroke-emerald-400 dark:stroke-emerald-500"
          strokeWidth="1.75"
        />

        {/* Filete concéntrico interno */}
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2 2"
          className="text-emerald-300/60 dark:text-emerald-400/40"
        />

        {/* Texto superior arqueado */}
        <text
          fontSize="7.5"
          fontWeight="900"
          letterSpacing="1"
          className="fill-emerald-100 dark:fill-emerald-200 uppercase"
        >
          <textPath href="#curve-seal-top" startOffset="50%" text-anchor="middle">
            • CONECTA COMUNA •
          </textPath>
        </text>

        {/* Icono central de apretón de manos de honor con escudo */}
        <g transform="translate(42, 44)">
          <path
            d="M18 20l-4-4 2-2 4 4M2 14l6-6 4 4-6 6M10 8l4-4 4 4-4 4"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="18" r="1.5" fill="#FDE68A" />
        </g>

        {/* Textos centrales: AVALADO JAC & TOPE 50% */}
        <text
          x="60"
          y="76"
          fontSize="7.5"
          fontWeight="900"
          letterSpacing="0.8"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          AVALADO JAC
        </text>
        <text
          x="60"
          y="85"
          fontSize="6"
          fontWeight="800"
          fill="#86EFAC"
          textAnchor="middle"
        >
          TOPE 50% MÁX
        </text>

        {/* Texto inferior arqueado */}
        <text
          fontSize="6.8"
          fontWeight="800"
          letterSpacing="0.5"
          className="fill-emerald-200 dark:fill-emerald-300 uppercase"
        >
          <textPath href="#curve-seal-bottom" startOffset="50%" text-anchor="middle">
            TRATO SEGURO COMUNAL
          </textPath>
        </text>
      </svg>
    </motion.div>
  )
}
