/**
 * Voz del asistente: la que lee y la que escucha.
 *
 * Estaba todo dentro del modal, que ya pasa de 1.300 líneas, y arrastraba dos
 * problemas que se notan al usarlo. Aquí se arreglan los dos.
 */

/* ------------------------------------------------------------------ */
/* Leer en voz alta                                                     */
/* ------------------------------------------------------------------ */

let vozElegida: SpeechSynthesisVoice | null = null
let vozResuelta = false

/**
 * `getVoices()` devuelve una lista **vacía** hasta que el navegador termina de
 * cargar las voces, y avisa con el evento `voiceschanged`. Sin esperarlo, la
 * primera lectura tras abrir la página no encuentra ninguna voz, no se asigna
 * ninguna, y el navegador recurre a la suya por defecto: la robótica. Ese es
 * el motivo de que a veces suene bien y a veces no.
 */
function esperarVoces(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolver) => {
    const yaEstan = window.speechSynthesis.getVoices()
    if (yaEstan.length > 0) return resolver(yaEstan)

    const alCargar = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', alCargar)
      resolver(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', alCargar)
    // Algunos navegadores no llegan a emitir el evento; a los 2 s se sigue con
    // lo que haya en vez de quedarse mudo esperando.
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', alCargar)
      resolver(window.speechSynthesis.getVoices())
    }, 2000)
  })
}

/** Cuánto vale una voz para nosotros. Más alto, mejor. */
function puntuar(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase()
  let p = 0
  // Las "Natural" y "Neural" del sistema son las que no suenan a robot; pesan
  // más que el acento, porque una voz mexicana natural se oye mucho mejor que
  // una colombiana sintetizada a la antigua.
  if (n.includes('natural') || n.includes('neural')) p += 60
  if (n.includes('online')) p += 25
  if (n.includes('google')) p += 20
  if (v.lang.includes('CO')) p += 15
  if (/419|MX|US|AR|PE/.test(v.lang)) p += 8
  if (v.localService) p += 3
  return p
}

/** La mejor voz en español disponible, resuelta una sola vez. */
export async function mejorVozEspanol(): Promise<SpeechSynthesisVoice | null> {
  if (vozResuelta) return vozElegida
  const voces = await esperarVoces()
  const enEspanol = voces.filter((v) => v.lang.toLowerCase().startsWith('es'))
  vozElegida = enEspanol.sort((a, b) => puntuar(b) - puntuar(a))[0] ?? null
  vozResuelta = true
  return vozElegida
}

/**
 * Parte el texto en frases. Chrome corta las lecturas largas por un fallo
 * conocido (se queda mudo pasados unos quince segundos), y además leer frase a
 * frase deja las pausas donde van, que es parte de que no suene plano.
 */
function enFrases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?¿¡:;])\s+/u)
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
}

export interface OpcionesLectura {
  alTerminar?: () => void
  alFallar?: () => void
}

/** Lee un texto completo. Devuelve una función para cortarlo. */
export async function leerEnVozAlta(
  texto: string,
  { alTerminar, alFallar }: OpcionesLectura = {},
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const limpio = texto.replace(/[#*•_]/gu, '').trim()
  if (!limpio) return

  const voz = await mejorVozEspanol()
  const frases = enFrases(limpio)

  frases.forEach((frase, i) => {
    const u = new SpeechSynthesisUtterance(frase)
    u.lang = voz?.lang ?? 'es-CO'
    if (voz) u.voice = voz
    u.rate = 0.96
    // Una pizca de variación entre frases: todas al mismo tono es justo lo que
    // hace que una lectura larga suene a máquina.
    u.pitch = i % 2 === 0 ? 1.02 : 0.98
    if (i === frases.length - 1) u.onend = () => alTerminar?.()
    u.onerror = () => alFallar?.()
    window.speechSynthesis.speak(u)
  })
}

export function detenerLectura(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/* ------------------------------------------------------------------ */
/* Escuchar                                                             */
/* ------------------------------------------------------------------ */

/**
 * Palabras que el dictado confunde una y otra vez, porque son de oficio o de
 * barrio y no están en el vocabulario general del reconocedor. La clave es lo
 * que suele transcribir; el valor, lo que la persona dijo.
 *
 * La API web ya no admite gramáticas (`SpeechGrammarList` no hace nada en
 * Chrome), así que corregir después es lo único que queda.
 */
const CORRECCIONES: ReadonlyArray<readonly [RegExp, string]> = [
  // El grupo ya se lleva el "er": con 'cerrajer$1' salia "cerrajerero".
  [/\bserraj(er[ií]a|ero)\b/giu, 'cerraj$1'],
  [/\bcerraje r[ií]a\b/giu, 'cerrajería'],
  [/\bmanicur(e|a|ista)\b/giu, 'manicure'],
  [/\bpedicur(e|a)\b/giu, 'pedicure'],
  [/\bdomicil(i|l)os\b/giu, 'domicilios'],
  [/\btrato segur[oa]\b/giu, 'Trato Seguro'],
  [/\bcomuna veinte\b/giu, 'Comuna 20'],
  [/\bsilo[eé]\b/giu, 'Siloé'],
  [/\bel rode[oó]\b/giu, 'El Rodeo'],
  [/\bantonio nari[ñn]o\b/giu, 'Antonio Nariño'],
  [/\bnueva floresta\b/giu, 'Nueva Floresta'],
  [/\bballado\b/giu, 'Vallado'],
  [/\bsan judas?\b/giu, 'San Judas'],
  [/\bciudad c[oó]rdoba\b/giu, 'Ciudad Córdoba'],
  [/\bmariano ramos\b/giu, 'Mariano Ramos'],
  [/\brep[uú]blica de israel\b/giu, 'República de Israel'],
]

/** Arregla los nombres de oficio y de barrio que el dictado suele errar. */
export function corregirDictado(texto: string): string {
  let salida = texto.replace(/\s+/gu, ' ').trim()
  for (const [patron, reemplazo] of CORRECCIONES) {
    salida = salida.replace(patron, reemplazo)
  }
  return salida
}

/**
 * De las alternativas que ofrece el reconocedor, se queda con la que más
 * palabras conocidas del dominio contiene. Cuando dudan entre "cerrajería" y
 * "cerrar ahí", esto desempata.
 */
const PALABRAS_DEL_DOMINIO = [
  'cerrajería', 'costura', 'modista', 'manicure', 'pedicure', 'peluquería',
  'barbería', 'comida', 'almuerzo', 'domicilio', 'arreglo', 'ruedo', 'cierre',
  'celular', 'reparar', 'negocio', 'servicio', 'barrio', 'comuna', 'vecino',
  'precio', 'pedido', 'trato', 'seguro',
]

export function mejorAlternativa(alternativas: string[]): string {
  if (alternativas.length <= 1) return alternativas[0] ?? ''
  let mejor = alternativas[0]
  let mejorPuntaje = -1
  for (const alt of alternativas) {
    const bajo = alt.toLowerCase()
    const puntaje = PALABRAS_DEL_DOMINIO.reduce(
      (acc, p) => acc + (bajo.includes(p) ? 1 : 0),
      0,
    )
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = alt
    }
  }
  return mejor
}
