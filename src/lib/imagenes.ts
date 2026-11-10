/**
 * Compresión de fotos antes de subirlas.
 *
 * Hasta ahora el archivo viajaba tal cual lo tomó el teléfono. Medido contra
 * producción: la portada de un negocio pesaba 2.588 KB, cuando TODO el código
 * de la aplicación —JavaScript y CSS comprimidos— son 283 KB. Una sola foto
 * pesaba nueve veces más que la aplicación entera.
 *
 * Eso contradice de frente la promesa de que esto funciona en el celular de
 * cualquiera: en datos móviles son casi megas que la persona paga, y la
 * mayoría de esos píxeles no se ven nunca, porque la foto más grande que
 * pinta la aplicación ocupa poco más de mil puntos de ancho.
 *
 * No se usa ninguna librería: `createImageBitmap` y un lienzo bastan, y en
 * una pantalla donde la gente sube fotos desde un teléfono modesto no tiene
 * sentido descargar un paquete para esto.
 */

/** Lado mayor al que se reduce. Por encima de esto no se gana nitidez visible. */
export const LADO_MAXIMO = 1600

/** Calidad JPEG. 0,82 es donde deja de notarse la pérdida en fotos de cámara. */
export const CALIDAD = 0.82

/**
 * Por debajo de esto no se toca el archivo. Comprimir una foto ya pequeña la
 * deja igual o peor, y encima la vuelve a codificar perdiendo algo cada vez.
 */
export const PESO_MINIMO = 320 * 1024

/**
 * Tamaño de destino conservando la proporción. Devuelve el original si la
 * imagen ya cabe: nunca agranda, que sería inventar píxeles y pesar más.
 */
export function dimensionesDestino(
  ancho: number,
  alto: number,
  ladoMaximo = LADO_MAXIMO,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= ladoMaximo || mayor === 0) return { ancho, alto }
  const factor = ladoMaximo / mayor
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  }
}

/**
 * Si vale la pena tocar este archivo. Los PNG y los GIF se dejan en paz: un
 * PNG suele ser un logo o una captura con texto, y pasarlo a JPEG le mete
 * suciedad alrededor de las letras.
 */
export function valeLaPenaComprimir(tipo: string, peso: number): boolean {
  if (!tipo.startsWith('image/')) return false
  if (tipo === 'image/gif' || tipo === 'image/png') return false
  return peso > PESO_MINIMO
}

/** Cambia la extensión a .jpg sin perder el resto del nombre. */
function nombreJpg(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, '') + '.jpg'
}

/**
 * Devuelve la foto reducida, o **el archivo original** si no hace falta
 * tocarla o si algo falla.
 *
 * Lo segundo es deliberado: que alguien no pueda publicar su negocio porque
 * el navegador no supo decodificar su foto sería mucho peor que subirla
 * pesada. La compresión es una mejora, nunca un requisito.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (!valeLaPenaComprimir(archivo.type, archivo.size)) return archivo
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return archivo
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(archivo)
    const { ancho, alto } = dimensionesDestino(bitmap.width, bitmap.height)

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) return archivo
    ctx.drawImage(bitmap, 0, 0, ancho, alto)

    const blob = await new Promise<Blob | null>((listo) =>
      lienzo.toBlob(listo, 'image/jpeg', CALIDAD),
    )
    if (!blob) return archivo

    // Si el resultado no es más liviano, nos quedamos con el original: pasa
    // con fotos ya optimizadas, y volver a codificarlas solo las degrada.
    if (blob.size >= archivo.size) return archivo

    return new File([blob], nombreJpg(archivo.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return archivo
  } finally {
    bitmap?.close()
  }
}
