import { Link } from 'react-router-dom'
import { Logo } from './Logo'

/**
 * Lucide no incluye logos de marca (restricciones de licencia de las marcas),
 * así que los glifos de redes van como SVG inline. Son los trazados oficiales
 * simplificados y heredan `currentColor`.
 */
const SOCIAL = [
  {
    label: 'Facebook',
    path: 'M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z',
  },
  {
    label: 'Instagram',
    path: 'M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.9 4.9 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.9 4.9 0 0 1-1.153 1.772 4.9 4.9 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.9 4.9 0 0 1-1.772-1.153 4.9 4.9 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.9 4.9 0 0 1 1.153-1.772A4.9 4.9 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  },
  {
    label: 'WhatsApp',
    path: 'M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.42 1.31-1.96 1.36-.5.05-.97.23-3.27-.68-2.76-1.09-4.5-3.9-4.64-4.08-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.25-.27.54-.34.72-.34l.52.01c.17 0 .39-.06.61.47.23.54.78 1.87.85 2 .07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.35-.41.47-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34z',
  },
]

const columns = [
  {
    title: 'Enlaces',
    links: [
      { to: '/', label: 'Inicio' },
      { to: '/explorar', label: 'Explorar servicios' },
      { to: '/panel/negocio', label: 'Publicar servicio' },
      { to: '/como-funciona', label: 'Cómo funciona' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { to: '/como-funciona', label: 'Centro de ayuda' },
      { to: '/como-funciona', label: 'Políticas de uso' },
      { to: '/como-funciona', label: 'Privacidad' },
      { to: '/como-funciona', label: 'Contacto' },
    ],
  },
]

/** Footer presente en todas las páginas (bloque 8 del diseño). */
export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-56 text-sm text-ink-500">
            Plataforma local para conectar personas y servicios en tu comuna.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold text-ink-900">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-ink-500 hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Síguenos</h2>
          <ul className="mt-3 flex gap-2">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a
                  href="/"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-white transition-colors hover:bg-brand-600"
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="border-t border-ink-100 px-4 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} ConectaComuna. Todos los derechos reservados.
      </p>
    </footer>
  )
}
