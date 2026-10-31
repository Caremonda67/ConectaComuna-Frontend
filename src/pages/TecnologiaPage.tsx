import { Link } from 'react-router-dom'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/Button'
import { UI_ICONS, type LucideIcon } from '@/components/ui/icons'

interface Pieza {
  icon: LucideIcon
  titulo: string
  que: string
  porque: string
}

/**
 * Esta página no documenta lo que nos gustaría tener: documenta lo que corre.
 * Cada afirmación de aquí se puede comprobar en vivo delante de quien pregunte,
 * y bajo cada bloque está dicho cómo.
 */
const PIEZAS: Pieza[] = [
  {
    icon: UI_ICONS.shieldCheck,
    titulo: 'La base de datos decide quién ve qué',
    que: 'Postgres con seguridad por fila (RLS) y permisos por columna. El teléfono de una persona no sale de la base si quien pregunta no tiene un pedido o un vínculo con ella.',
    porque:
      'Si el permiso viviera en la pantalla, bastaría con abrir la consola del navegador para saltárselo. Viviendo en la base, no hay forma de pedirlo de más.',
  },
  {
    icon: UI_ICONS.dashboard,
    titulo: 'Los estados de un pedido son una máquina, no un campo',
    que: 'Una función en la base valida cada cambio: pendiente → aceptado → en proceso → finalizado, y nada más.',
    porque:
      'Dos personas usando la aplicación a la vez no pueden dejar un pedido en un estado imposible, aunque toquen el mismo botón en el mismo segundo.',
  },
  {
    icon: UI_ICONS.store,
    titulo: 'Las cifras se calculan, no se escriben',
    que: 'Disparadores en la base recalculan los trabajos finalizados y el promedio de reseñas cada vez que algo cambia.',
    porque:
      'Un contador que alguien pueda escribir a mano es un contador en el que no se puede confiar. Lo que muestra la ficha siempre cuadra con lo que lista la pantalla.',
  },
  {
    icon: UI_ICONS.inbox,
    titulo: 'El panel se entera solo',
    que: 'Suscripción en tiempo real: cuando entra un pedido, aparece en el panel del negocio sin recargar.',
    porque:
      'Quien está trabajando en su taller no va a estar recargando una página para ver si le llegó algo.',
  },
  {
    icon: UI_ICONS.map,
    titulo: 'El mapa cubre todo el país',
    que: 'Leaflet con OpenStreetMap para marcar el punto, y geocodificación contra Nominatim restringida a Colombia.',
    porque:
      'El piloto arrancó en la Comuna 20, pero nada en el código obliga a que sea Cali: un negocio puede marcar su punto en cualquier barrio o municipio.',
  },
  {
    icon: UI_ICONS.bot,
    titulo: 'El asistente no lleva la llave puesta',
    que: 'Las consultas al modelo pasan por un servicio propio en Node/Express con límite de peticiones; la credencial vive en el servidor.',
    porque:
      'Una clave de IA en el navegador es una clave pública. Cualquiera podría leerla desde el código de la página y gastarla.',
  },
]

const CAPAS = [
  {
    nombre: 'Lo que ves',
    detalle: 'React 19 y TypeScript, empaquetado con Vite. Tailwind para los estilos.',
  },
  {
    nombre: 'Lo que decide',
    detalle: 'Postgres en Supabase: políticas por fila, funciones y disparadores.',
  },
  {
    nombre: 'Lo que consulta',
    detalle: 'Un servicio en Node/Express que habla con el modelo de IA y guarda la credencial.',
  },
  {
    nombre: 'Lo que lo sostiene',
    detalle: 'Pruebas automáticas y revisión de tipos y estilo en cada envío de código.',
  },
]

export default function TecnologiaPage() {
  usePageMeta({
    title: 'Cómo está construida · ConectaComuna',
    description:
      'La arquitectura de ConectaComuna en lenguaje llano: React 19, Postgres con seguridad por fila en Supabase, un servicio en Express para la IA y Leaflet para el mapa.',
  })

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold leading-tight">
          Cómo está <span className="text-brand-600">construida</span>
        </h1>
        <p className="mt-2 text-ink-500">
          Sin tecnicismos y sin promesas: lo que sigue es lo que efectivamente corre cuando usas
          la aplicación, y por qué está hecho así y no de otra manera.
        </p>
      </header>

      <section aria-labelledby="capas" className="card p-6 space-y-4">
        <h2 id="capas" className="text-lg font-bold">
          Las cuatro capas
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {CAPAS.map((c, i) => (
            <li key={c.nombre} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{c.nombre}</p>
                <p className="text-sm text-ink-500">{c.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="decisiones" className="space-y-4">
        <h2 id="decisiones" className="text-xl font-bold">
          Seis decisiones que se pueden comprobar
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PIEZAS.map((p) => (
            <li key={p.titulo} className="card p-5">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700"
              >
                <p.icon size={21} strokeWidth={1.75} />
              </span>
              <h3 className="mt-3 font-bold text-ink-900">{p.titulo}</h3>
              <p className="mt-1 text-sm text-ink-600">{p.que}</p>
              <p className="mt-2 text-sm text-ink-500">
                <span className="font-semibold text-ink-700">Por qué: </span>
                {p.porque}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-soft flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="max-w-xl">
          <h2 className="text-lg font-bold">¿Prefieres verlo funcionando?</h2>
          <p className="text-sm text-ink-700">
            El comprobante de Trato Seguro se puede consultar sin tener cuenta: es la forma más
            corta de ver la seguridad por fila haciendo su trabajo.
          </p>
        </div>
        <Link to="/trato-seguro/verificar/CC-DEMO2026">
          <Button>Ver un comprobante real</Button>
        </Link>
      </section>
    </div>
  )
}
