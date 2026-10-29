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
      title="Sello de verificación en territorio de Conecta Comuna"
      aria-label="Sello de verificación en territorio"
    >
      <svg
        width={conf.width}
        height={conf.height}
        viewBox={conf.viewBox}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Trayectorias circulares superior e inferior con radio 40.5 para no invadir el centro */}
          <path id="curve-seal-top" d="M 19.5,60 A 40.5,40.5 0 0,1 100.5,60" fill="none" />
          <path id="curve-seal-bottom" d="M 100.5,60 A 40.5,40.5 0 0,1 19.5,60" fill="none" />
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
          <textPath href="#curve-seal-top" startOffset="50%" textAnchor="middle">
            • CONECTA COMUNA •
          </textPath>
        </text>

        {/* Icono central: Apretón de manos nítido posicionado arriba con amplitud */}
        <g transform="translate(46, 31)">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-xs"
          >
            <path d="m11 17 2 2a1 1 0 1 0 3-3" />
            <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
            <path d="m21 3 1 11h-2" />
            <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
            <path d="M3 4h8" />
          </svg>
        </g>

        {/* Textos centrales con respiro amplio: solo 2 líneas para evitar choques con el arco inferior */}
        <text
          x="60"
          y="66"
          fontSize="6.8"
          fontWeight="900"
          letterSpacing="0.6"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          VERIFICACIÓN
        </text>
        <text
          x="60"
          y="75"
          fontSize="5.4"
          fontWeight="800"
          letterSpacing="0.4"
          fill="#86EFAC"
          textAnchor="middle"
        >
          EN TERRITORIO
        </text>

        {/* Texto inferior arqueado pegado al borde exterior sin invadir el centro */}
        <text
          fontSize="5.8"
          fontWeight="800"
          letterSpacing="0.5"
          className="fill-emerald-200 dark:fill-emerald-300 uppercase"
        >
          <textPath href="#curve-seal-bottom" startOffset="50%" textAnchor="middle">
            RED DE FACILITADORES
          </textPath>
        </text>
      </svg>
    </motion.div>
  )
}
