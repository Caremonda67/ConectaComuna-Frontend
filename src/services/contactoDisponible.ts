import { requireSupabase } from '@/lib/supabase'

let hayTabla: boolean | null = null

/**
 * ¿Existe ya `perfil_contacto` en esta base?
 *
 * La tabla llega con `migracion-contacto-perfiles.sql`, y el repositorio tiene
 * por norma desplegar el frontend antes que la migración. En esa ventana,
 * pedir `contacto:perfil_contacto(phone)` dentro de un embed no devuelve el
 * teléfono vacío: PostgREST rechaza **la consulta entera** con PGRST205, así
 * que la pantalla completa cae al estado de error aunque el resto de los datos
 * estuviera disponible. Fue lo que dejó sin servicio a «Gestión de
 * Facilitadores» en producción.
 *
 * Se pregunta una sola vez por sesión y el resultado elige el `select`. Sin la
 * tabla todo se ve igual, solo que sin el teléfono de la contraparte.
 */
export async function hayTablaDeContacto(): Promise<boolean> {
  if (hayTabla === null) {
    const { error } = await requireSupabase().from('perfil_contacto').select('profile_id').limit(1)
    hayTabla = !error
  }
  return hayTabla
}

/** Solo para las pruebas: olvida lo aprendido sobre la base. */
export function olvidarDeteccionDeContacto(): void {
  hayTabla = null
}
