/**
 * Marca propia en SVG en vez de un emoji.
 *
 * Tres nodos unidos representan vecinos conectados: la idea del producto.
 * Al ser SVG hereda `currentColor`, escala sin perder nitidez y no depende
 * de cómo cada sistema operativo dibuje una fuente de emoji.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 8.5 12 6l4.5 2.5" />
          <path d="M7.5 8.5v5L12 16l4.5-2.5v-5" />
          <circle cx="12" cy="4.6" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="6.2" cy="14.6" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="17.8" cy="14.6" r="1.9" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-ink-900">ConectaComuna</span>
    </span>
  )
}
