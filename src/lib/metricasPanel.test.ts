import { describe, expect, it } from 'vitest'
import type { Business, Order, Profile, ReporteComunitario, Review } from '@/types'
import {
  type DatosPanel,
  comunasConPresencia,
  inicioDePeriodo,
  negociosPorComuna,
  resumenPanel,
  seriePanel,
} from './metricasPanel'

function perfil(id: string, created_at: string): Profile {
  return {
    id,
    full_name: id,
    phone: null,
    avatar_url: null,
    account_type: 'client',
    neighborhood: null,
    onboarding_completado: true,
    created_at,
  } as Profile
}

function negocio(id: string, extra: Partial<Business> = {}): Business {
  return {
    id,
    owner_id: `o-${id}`,
    name: id,
    description: '',
    category: 'comida',
    phone: null,
    whatsapp: null,
    address: null,
    neighborhood: null,
    lat: 3.4,
    lng: -76.5,
    photos: [],
    hours: [],
    rating_avg: 0,
    rating_count: 0,
    completed_orders: 0,
    verification_status: 'unverified',
    wholesale_enabled: false,
    services_catalog: [],
    is_active: true,
    created_at: '2026-10-05T12:00:00Z',
    ...extra,
  } as Business
}

function pedido(id: string, extra: Partial<Order> = {}): Order {
  return {
    id,
    business_id: 'n1',
    client_id: 'c1',
    title: id,
    description: '',
    status: 'pending',
    photos: [],
    created_at: '2026-10-05T12:00:00Z',
    updated_at: '2026-10-05T12:00:00Z',
    ...extra,
  } as Order
}

const VACIO: DatosPanel = {
  profiles: [],
  businesses: [],
  orders: [],
  reviews: [],
  reportes: [],
}

describe('inicioDePeriodo', () => {
  it('la semana empieza en lunes, como date_trunc(week) de Postgres', () => {
    // 2026-11-03 es martes; su lunes es el 2.
    expect(inicioDePeriodo(new Date('2026-11-03T15:00:00Z'), 'week')).toBe('2026-11-02')
    // Un domingo pertenece a la semana que empezó el lunes anterior, no a la
    // siguiente. Es el caso que rompe la cuenta si se usa getDay() a secas.
    expect(inicioDePeriodo(new Date('2026-11-08T10:00:00Z'), 'week')).toBe('2026-11-02')
    // Y el lunes es su propio inicio.
    expect(inicioDePeriodo(new Date('2026-11-02T00:30:00Z'), 'week')).toBe('2026-11-02')
  })

  it('agrupa por mes y por año', () => {
    expect(inicioDePeriodo(new Date('2026-11-03T15:00:00Z'), 'month')).toBe('2026-11-01')
    expect(inicioDePeriodo(new Date('2026-11-03T15:00:00Z'), 'year')).toBe('2026-01-01')
  })

  it('usa UTC: una hora tardía en Cali no se pasa al día siguiente', () => {
    // 2026-11-02T23:00Z son las 6 de la tarde en Cali. Si la función usara
    // hora local, Postgres y esto dejarían de cuadrar en los bordes del día.
    expect(inicioDePeriodo(new Date('2026-11-02T23:00:00Z'), 'month')).toBe('2026-11-01')
    expect(inicioDePeriodo(new Date('2026-12-01T02:00:00Z'), 'month')).toBe('2026-12-01')
  })
})

describe('resumenPanel', () => {
  it('cuenta negocios activos aparte del total histórico', () => {
    const r = resumenPanel({
      ...VACIO,
      businesses: [
        negocio('n1'),
        negocio('n2', { is_active: false }),
        negocio('n3', { verification_status: 'verified' }),
      ],
    })
    expect(r.negocios).toBe(3)
    expect(r.negociosActivos).toBe(2)
    expect(r.negociosVerificados).toBe(1)
  })

  it('una PQR solo cuenta como abierta mientras está pendiente', () => {
    const reportes = [
      { estado: 'pendiente' },
      { estado: 'pendiente' },
      { estado: 'revisado' },
      { estado: 'descartado' },
    ] as ReporteComunitario[]
    expect(resumenPanel({ ...VACIO, reportes }).pqrAbiertas).toBe(2)
  })

  it('reseña negativa es 1 o 2 estrellas, y 3 no lo es', () => {
    const reviews = [{ rating: 1 }, { rating: 2 }, { rating: 3 }, { rating: 5 }] as Review[]
    expect(resumenPanel({ ...VACIO, reviews }).resenasNegativas).toBe(2)
  })

  it('con la base vacía da ceros, no se cae', () => {
    expect(resumenPanel(VACIO).usuarios).toBe(0)
    expect(resumenPanel(VACIO).pqrAbiertas).toBe(0)
  })
})

describe('seriePanel', () => {
  it('cuenta clientes DISTINTOS, no pedidos', () => {
    const datos: DatosPanel = {
      ...VACIO,
      orders: [
        pedido('p1', { client_id: 'ana' }),
        pedido('p2', { client_id: 'ana' }),
        pedido('p3', { client_id: 'ana' }),
        pedido('p4', { client_id: 'beto' }),
      ],
    }
    const [mes] = seriePanel(datos, 'month')
    expect(mes.pedidos).toBe(4)
    expect(mes.clientesActivos).toBe(2)
  })

  it('separa completados y Trato Seguro dentro del mismo periodo', () => {
    const datos: DatosPanel = {
      ...VACIO,
      orders: [
        pedido('p1', { status: 'completed', advance_payment: 20000 }),
        pedido('p2', { status: 'completed' }),
        pedido('p3', { status: 'pending', advance_payment: 0 }),
      ],
    }
    const [mes] = seriePanel(datos, 'month')
    expect(mes.pedidos).toBe(3)
    expect(mes.pedidosCompletados).toBe(2)
    expect(mes.conTratoSeguro).toBe(1)
  })

  it('reparte en periodos distintos y los devuelve en orden', () => {
    const datos: DatosPanel = {
      ...VACIO,
      profiles: [
        perfil('a', '2026-09-10T12:00:00Z'),
        perfil('b', '2026-10-10T12:00:00Z'),
        perfil('c', '2026-10-20T12:00:00Z'),
      ],
    }
    const serie = seriePanel(datos, 'month')
    expect(serie.map((p) => p.periodo)).toEqual(['2026-09-01', '2026-10-01'])
    expect(serie.map((p) => p.usuarios)).toEqual([1, 2])
  })

  it('no inventa periodos vacíos entre medio', () => {
    const datos: DatosPanel = {
      ...VACIO,
      profiles: [perfil('a', '2026-01-10T12:00:00Z'), perfil('b', '2026-10-10T12:00:00Z')],
    }
    expect(seriePanel(datos, 'month')).toHaveLength(2)
  })

  it('respeta el límite quedándose con los periodos MÁS RECIENTES', () => {
    const datos: DatosPanel = {
      ...VACIO,
      profiles: Array.from({ length: 6 }, (_, i) =>
        perfil(`u${i}`, `2026-0${i + 1}-10T12:00:00Z`),
      ),
    }
    const serie = seriePanel(datos, 'month', 2)
    expect(serie.map((p) => p.periodo)).toEqual(['2026-05-01', '2026-06-01'])
  })

  it('ignora fechas inválidas en vez de producir un periodo basura', () => {
    const datos: DatosPanel = {
      ...VACIO,
      profiles: [perfil('malo', 'no es una fecha'), perfil('bueno', '2026-10-10T12:00:00Z')],
    }
    const serie = seriePanel(datos, 'month')
    expect(serie).toHaveLength(1)
    expect(serie[0].usuarios).toBe(1)
  })
})

describe('negociosPorComuna', () => {
  it('devuelve las 22 comunas más la fila de sin clasificar', () => {
    const filas = negociosPorComuna([])
    expect(filas).toHaveLength(23)
    expect(filas.filter((f) => f.comuna === null)).toHaveLength(1)
  })

  it('las comunas en cero se muestran: ahí es donde falta un facilitador', () => {
    const filas = negociosPorComuna([negocio('n1', { comuna: 15 })])
    expect(filas.find((f) => f.comuna === 15)?.negocios).toBe(1)
    expect(filas.find((f) => f.comuna === 3)?.negocios).toBe(0)
  })

  it('un negocio sin comuna se cuenta aparte, no se pierde', () => {
    const filas = negociosPorComuna([
      negocio('n1', { comuna: 15 }),
      negocio('n2', { comuna: null }),
      negocio('n3'),
    ])
    expect(filas.find((f) => f.comuna === null)?.negocios).toBe(2)
  })

  it('los números del mapa suman el total de negocios activos', () => {
    // Si esto falla, el mapa está mintiendo aunque cada celda se vea bien.
    const negocios = [
      negocio('n1', { comuna: 15 }),
      negocio('n2', { comuna: 15 }),
      negocio('n3', { comuna: 16 }),
      negocio('n4', { comuna: null }),
      negocio('n5', { comuna: 15, is_active: false }),
    ]
    const suma = negociosPorComuna(negocios).reduce((a, f) => a + f.negocios, 0)
    expect(suma).toBe(4)
  })

  it('cuenta los verificados dentro de cada comuna', () => {
    const filas = negociosPorComuna([
      negocio('n1', { comuna: 15, verification_status: 'verified' }),
      negocio('n2', { comuna: 15 }),
    ])
    const c15 = filas.find((f) => f.comuna === 15)
    expect(c15).toMatchObject({ negocios: 2, verificados: 1 })
  })
})

describe('métricas de adopción', () => {
  it('cuenta facilitadores que pusieron un sello, no cuentas creadas', () => {
    // La unidad de adopción es el facilitador activo. Dos sellos de la misma
    // persona son una persona, y un sello sin firma no cuenta a nadie.
    const r = resumenPanel({
      ...VACIO,
      businesses: [
        negocio('n1', { verification_status: 'verified', verification_by: 'ana' }),
        negocio('n2', { verification_status: 'verified', verification_by: 'ana' }),
        negocio('n3', { verification_status: 'verified', verification_by: 'luis' }),
        negocio('n4', { verification_status: 'verified' }),
        negocio('n5'),
      ],
    })
    expect(r.facilitadoresActivos).toBe(2)
    expect(r.negociosVerificados).toBe(4)
  })

  it('Trato Seguro son los pedidos con anticipo', () => {
    const r = resumenPanel({
      ...VACIO,
      orders: [
        pedido('p1', { advance_payment: 10000 }),
        pedido('p2', { advance_payment: 0 }),
        pedido('p3'),
      ],
    })
    expect(r.conTratoSeguro).toBe(1)
    expect(r.pedidos).toBe(3)
  })

  it('la cobertura cuenta comunas con negocios, no la fila de sin clasificar', () => {
    const conteos = negociosPorComuna([
      negocio('n1', { comuna: 15 }),
      negocio('n2', { comuna: 15 }),
      negocio('n3', { comuna: 16 }),
      negocio('n4', { comuna: null }),
    ])
    expect(comunasConPresencia(conteos)).toBe(2)
  })

  it('sin negocios la cobertura es cero, no 22', () => {
    expect(comunasConPresencia(negociosPorComuna([]))).toBe(0)
  })
})
