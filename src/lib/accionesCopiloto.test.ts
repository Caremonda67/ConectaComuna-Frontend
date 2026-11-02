import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Pruebas de las acciones del copiloto contra el backend de demostración, que
 * escribe de verdad en el almacenamiento local.
 *
 * Esto nació de un fallo en uso real: pedir un cambio de precio **creaba un
 * producto nuevo sin nombre** en vez de editar el que ya existía, y el chat
 * decía que el precio estaba actualizado. La lógica vivía dentro de un modal
 * de 1.400 líneas y ninguna prueba la tocaba. Al sacarla aparte, el caso que
 * falló queda cubierto: si una acción vuelve a crear en lugar de editar, aquí
 * se cae.
 */

// El backend de demostración guarda en localStorage. En node no existe, y sin
// él los servicios ni siquiera se pueden importar.
class AlmacenDePrueba {
  private datos = new Map<string, string>()
  getItem(k: string) {
    return this.datos.has(k) ? (this.datos.get(k) as string) : null
  }
  setItem(k: string, v: string) {
    this.datos.set(k, String(v))
  }
  removeItem(k: string) {
    this.datos.delete(k)
  }
  clear() {
    this.datos.clear()
  }
}

const almacen = new AlmacenDePrueba()
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true })

// Forzar modo demostración ANTES de importar nada.
//
// Vitest carga el `.env` del proyecto, y en la máquina de quien desarrolla
// ese archivo tiene credenciales de Supabase: sin esto `isDemoMode` sale
// falso en local y verdadero en CI, y las pruebas medirían cosas distintas
// según dónde corran. La primera vez que pasó, los servicios intentaron
// hablar con Supabase y no escribieron nada, pero las comprobaciones de
// mensaje seguían pasando: medio verde, que es peor que rojo.
vi.stubEnv('VITE_SUPABASE_URL', '')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

const { ejecutarAccionCopiloto } = await import('./accionesCopiloto')
const { readDb } = await import('@/services/demoBackend')
const { isDemoMode } = await import('@/lib/env')

function negocioDeKelly() {
  const b = readDb().businesses.find((x) => x.name.includes('Kelly'))
  if (!b) throw new Error('La semilla de demostración no trae el negocio de Kelly')
  return b
}

// Vaciar el almacén basta: `readDb` vuelve a sembrar la base de ejemplo la
// próxima vez que se la pide, así que cada prueba arranca de cero.
beforeEach(() => {
  almacen.clear()
})

describe('las pruebas corren contra el modo demostración', () => {
  it('está en modo demo, así que los servicios escriben en local', () => {
    expect(isDemoMode).toBe(true)
  })
})

describe('cambiar el precio de un servicio', () => {
  it('EDITA el servicio existente, no crea uno nuevo', async () => {
    const antes = negocioDeKelly()
    const servicio = antes.services_catalog![1]
    const cuantosAntes = antes.services_catalog!.length

    const r = await ejecutarAccionCopiloto(
      {
        tipo: 'cambiar_precio_servicio',
        titulo: 'x',
        descripcion: 'x',
        payload: { servicioId: servicio.id, precioNuevo: 30000 },
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: antes.owner_id, negocio: antes },
    )

    const despues = negocioDeKelly()
    // Lo que fallaba: aparecía un producto de más, sin nombre.
    expect(despues.services_catalog).toHaveLength(cuantosAntes)
    expect(despues.services_catalog!.every((s) => s.name.trim().length > 0)).toBe(true)
    // Y el precio del servicio correcto cambió.
    expect(despues.services_catalog!.find((s) => s.id === servicio.id)!.price).toBe(30000)
    expect(r.mensaje).toContain(servicio.name)
  })

  it('no toca los demás servicios', async () => {
    const antes = negocioDeKelly()
    const [primero, segundo, tercero] = antes.services_catalog!

    await ejecutarAccionCopiloto(
      {
        tipo: 'cambiar_precio_servicio',
        titulo: 'x',
        descripcion: 'x',
        payload: { servicioId: segundo.id, precioNuevo: 99000 },
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: antes.owner_id, negocio: antes },
    )

    const cat = negocioDeKelly().services_catalog!
    expect(cat.find((s) => s.id === primero.id)!.price).toBe(primero.price)
    expect(cat.find((s) => s.id === tercero.id)!.price).toBe(tercero.price)
  })

  it('con un servicioId que no existe no escribe nada', async () => {
    const antes = negocioDeKelly()
    const r = await ejecutarAccionCopiloto(
      {
        tipo: 'cambiar_precio_servicio',
        titulo: 'x',
        descripcion: 'x',
        payload: { servicioId: 'no-existe', precioNuevo: 30000 },
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: antes.owner_id, negocio: antes },
    )
    expect(negocioDeKelly().services_catalog).toHaveLength(antes.services_catalog!.length)
    expect(r.mensaje).toContain('No tengo claro')
  })
})

describe('la prueba de la prueba', () => {
  it('el precio de partida NO es el que vamos a poner', () => {
    // Si la semilla ya trajera 30.000, la prueba de arriba pasaría aunque la
    // acción no escribiera nada. Esto lo impide.
    const cat = negocioDeKelly().services_catalog!
    expect(cat[1].price).not.toBe(30000)
    expect(cat[1].price).toBe(22000)
  })
})

describe('la acción vacía no hace nada', () => {
  it('sin acción NO activa el negocio', async () => {
    const antes = negocioDeKelly()
    const r = await ejecutarAccionCopiloto(undefined, { userId: antes.owner_id, negocio: antes })
    // El fallo anterior: cualquier confirmación mal formada caía en
    // `activar_negocio` y cambiaba el tipo de cuenta de la persona.
    expect(r.navegarA).toBeUndefined()
    expect(r.mensaje).toContain('No me quedó claro')
  })

  it('una acción desconocida avisa en vez de quedarse girando', async () => {
    const r = await ejecutarAccionCopiloto(
      {
        tipo: 'vincular_facilitador',
        titulo: 'x',
        descripcion: 'x',
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: 'u1', negocio: null },
    )
    expect(r.mensaje).toContain('todavía no la puedo hacer')
  })
})

describe('código de apadrinamiento', () => {
  it('lo genera de verdad y avisa de no compartirlo', async () => {
    const antes = negocioDeKelly()
    const r = await ejecutarAccionCopiloto(
      {
        tipo: 'generar_codigo_apadrinamiento',
        titulo: 'x',
        descripcion: 'x',
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: antes.owner_id, negocio: antes },
    )
    const codigo = negocioDeKelly().codigo_apadrinamiento
    expect(codigo).toBeTruthy()
    expect(r.mensaje).toContain(codigo!)
    expect(r.mensaje).toMatch(/en persona|no lo publiques/i)
  })

  it('sin negocio no lo genera', async () => {
    const r = await ejecutarAccionCopiloto(
      {
        tipo: 'generar_codigo_apadrinamiento',
        titulo: 'x',
        descripcion: 'x',
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: 'u1', negocio: null },
    )
    expect(r.mensaje).toContain('primero necesitas tener tu negocio')
  })
})

describe('horario', () => {
  it('cambia solo los días indicados', async () => {
    const antes = negocioDeKelly()
    const domingoAntes = antes.hours.find((h) => h.day === 0)

    await ejecutarAccionCopiloto(
      {
        tipo: 'actualizar_horario',
        titulo: 'x',
        descripcion: 'x',
        payload: { dias: [6], opens: '09:00', closes: '14:00', cerrado: false },
        botonConfirmar: 'x',
        botonCancelar: 'x',
      },
      { userId: antes.owner_id, negocio: antes },
    )

    const horas = negocioDeKelly().hours
    const sabado = horas.find((h) => h.day === 6)!
    expect(sabado.opens).toBe('09:00')
    expect(sabado.closes).toBe('14:00')
    expect(sabado.closed).toBe(false)
    // El domingo se queda como estaba.
    expect(horas.find((h) => h.day === 0)).toEqual(domingoAntes)
  })
})
