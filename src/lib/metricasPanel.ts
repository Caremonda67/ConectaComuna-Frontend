import type { Business, Order, Profile, ReporteComunitario, Review } from '@/types'

/**
 * Agregación de las métricas del panel de equipo.
 *
 * Vive aparte de la pantalla a propósito. En producción estos números los
 * calcula Postgres con funciones `security definer` que devuelven conteos y
 * nunca filas; en modo demostración los calcula este módulo sobre
 * localStorage. Teniéndolo separado se puede probar la aritmética sin montar
 * una pantalla, que es lo que faltó la vez que el copiloto decía haber
 * guardado cambios que no guardaba.
 *
 * Las dos implementaciones tienen que dar lo mismo, así que las definiciones
 * de aquí son las mismas que las de la migración, una por una.
 */

export type Granularidad = 'week' | 'month' | 'year'

/** Lo de arriba del panel: fotografía de hoy, no del periodo. */
export interface ResumenPanel {
  usuarios: number
  negocios: number
  negociosActivos: number
  negociosVerificados: number
  /**
   * Facilitadores con al menos un sello puesto, no cuentas creadas. La unidad
   * de adopción del proyecto es el facilitador activo, no el usuario
   * registrado (ver vault/DIFERENCIADOR-Y-ADOPCION.md): una cuenta que nunca
   * salió a verificar a nadie no mueve el proyecto y no se cuenta.
   */
  facilitadoresActivos: number
  pedidos: number
  pedidosCompletados: number
  conTratoSeguro: number
  /** Personas distintas que han pedido alguna vez, no número de pedidos. */
  clientesUnicos: number
  pqrAbiertas: number
  resenasNegativas: number
}

/** Una barra del periodo. Son ALTAS del periodo, no acumulados. */
export interface PuntoSerie {
  periodo: string
  usuarios: number
  negocios: number
  clientesActivos: number
  pedidos: number
  pedidosCompletados: number
  conTratoSeguro: number
}

export interface ConteoComuna {
  /** `null` es «sin clasificar»: fuera de Cali o sin resolver. Se muestra. */
  comuna: number | null
  negocios: number
  verificados: number
}

export interface DatosPanel {
  profiles: Profile[]
  businesses: Business[]
  orders: Order[]
  reviews: Review[]
  reportes: ReporteComunitario[]
}

/**
 * Inicio del periodo al que pertenece una fecha, en **UTC**.
 *
 * En UTC y no en hora local porque el equivalente de Postgres es
 * `date_trunc(g, created_at)` sobre un `timestamptz`, y la sesión de Supabase
 * corre en UTC. Calculándolo en hora local, un pedido de las 8 de la noche en
 * Cali caería en el día siguiente para Postgres y en el mismo día aquí, y las
 * dos implementaciones dejarían de cuadrar en los bordes.
 *
 * La semana empieza en **lunes**, como `date_trunc('week')`.
 */
export function inicioDePeriodo(fecha: Date, granularidad: Granularidad): string {
  const d = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  )
  if (granularidad === 'year') {
    d.setUTCMonth(0, 1)
  } else if (granularidad === 'month') {
    d.setUTCDate(1)
  } else {
    // getUTCDay(): 0 es domingo. El lunes de esa semana está 6 días atrás.
    const dia = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - (dia === 0 ? 6 : dia - 1))
  }
  return d.toISOString().slice(0, 10)
}

function fechaValida(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Pedidos que pactaron Trato Seguro: los que dejaron un anticipo.
 * Mide si el mecanismo de confianza se usa, que es la métrica que de verdad
 * dice algo sobre el producto.
 */
function tieneTratoSeguro(o: Order): boolean {
  return (o.advance_payment ?? 0) > 0
}

export function resumenPanel(datos: DatosPanel): ResumenPanel {
  const selladores = new Set(
    datos.businesses
      .filter((b) => b.verification_status === 'verified' && b.verification_by)
      .map((b) => b.verification_by as string),
  )

  return {
    usuarios: datos.profiles.length,
    negocios: datos.businesses.length,
    negociosActivos: datos.businesses.filter((b) => b.is_active).length,
    negociosVerificados: datos.businesses.filter((b) => b.verification_status === 'verified')
      .length,
    facilitadoresActivos: selladores.size,
    pedidos: datos.orders.length,
    pedidosCompletados: datos.orders.filter((o) => o.status === 'completed').length,
    conTratoSeguro: datos.orders.filter(tieneTratoSeguro).length,
    clientesUnicos: new Set(datos.orders.map((o) => o.client_id).filter(Boolean)).size,
    pqrAbiertas: datos.reportes.filter((r) => r.estado === 'pendiente').length,
    resenasNegativas: datos.reviews.filter((r) => r.rating <= 2).length,
  }
}

/**
 * Cuántas de las 22 comunas tienen al menos un negocio.
 *
 * Es la métrica de cobertura territorial: dice dónde llegó el proyecto mucho
 * mejor que el total de negocios, porque veinte negocios en una sola comuna y
 * veinte repartidos en diez no son lo mismo.
 */
export function comunasConPresencia(conteos: ConteoComuna[]): number {
  return conteos.filter((c) => c.comuna != null && c.negocios > 0).length
}

/**
 * La serie por periodo, de la más vieja a la más reciente.
 *
 * Solo aparecen los periodos **con actividad**: un mes sin nada no sale. Con
 * los datos que hay hoy, rellenar los huecos con ceros daría una gráfica casi
 * toda plana que parece un fallo.
 */
export function seriePanel(
  datos: DatosPanel,
  granularidad: Granularidad,
  limite = 12,
): PuntoSerie[] {
  const por = new Map<string, PuntoSerie & { clientes: Set<string> }>()

  const dame = (iso: string) => {
    let p = por.get(iso)
    if (!p) {
      p = {
        periodo: iso,
        usuarios: 0,
        negocios: 0,
        clientesActivos: 0,
        pedidos: 0,
        pedidosCompletados: 0,
        conTratoSeguro: 0,
        clientes: new Set<string>(),
      }
      por.set(iso, p)
    }
    return p
  }

  for (const p of datos.profiles) {
    const f = fechaValida(p.created_at)
    if (f) dame(inicioDePeriodo(f, granularidad)).usuarios += 1
  }
  for (const b of datos.businesses) {
    const f = fechaValida(b.created_at)
    if (f) dame(inicioDePeriodo(f, granularidad)).negocios += 1
  }
  for (const o of datos.orders) {
    const f = fechaValida(o.created_at)
    if (!f) continue
    const p = dame(inicioDePeriodo(f, granularidad))
    p.pedidos += 1
    if (o.status === 'completed') p.pedidosCompletados += 1
    if (tieneTratoSeguro(o)) p.conTratoSeguro += 1
    // Clientes DISTINTOS: tres pedidos de la misma persona son un cliente.
    if (o.client_id) p.clientes.add(o.client_id)
  }

  return [...por.values()]
    .map(({ clientes, ...resto }) => ({ ...resto, clientesActivos: clientes.size }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .slice(-limite)
}

/**
 * Negocios por comuna, incluidas **las comunas en cero y las sin clasificar**.
 *
 * Las dos se muestran a propósito. Una comuna sin negocios no es un hueco del
 * mapa: es exactamente donde hace falta un facilitador, que es la unidad de
 * adopción del proyecto. Y esconder los «sin clasificar» haría que los números
 * del mapa no sumaran el total, que es peor que enseñar el hueco.
 *
 * `comuna` la pone Postgres al guardar la ficha. En modo demostración no hay
 * Postgres, así que la pantalla la resuelve antes de llamar aquí con
 * `comunaDePunto`. Este módulo no importa las siluetas a propósito: así los
 * 17 KB de geometría viajan solo en el trozo del panel y no en el que descarga
 * cualquiera que entre al directorio.
 */
export function negociosPorComuna(businesses: Business[]): ConteoComuna[] {
  const activos = businesses.filter((b) => b.is_active)
  const filas: ConteoComuna[] = []

  for (let n = 1; n <= 22; n++) {
    const suyos = activos.filter((b) => b.comuna === n)
    filas.push({
      comuna: n,
      negocios: suyos.length,
      verificados: suyos.filter((b) => b.verification_status === 'verified').length,
    })
  }

  const sinClasificar = activos.filter((b) => b.comuna == null)
  filas.push({
    comuna: null,
    negocios: sinClasificar.length,
    verificados: sinClasificar.filter((b) => b.verification_status === 'verified').length,
  })

  return filas
}
