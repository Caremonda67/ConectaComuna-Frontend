const CLAVE = 'conectacomuna.auth.from'

/** Recuerda a dónde volver después de entrar o de un OAuth. */
export function rememberAuthFrom(path: string): void {
  try {
    sessionStorage.setItem(CLAVE, path)
  } catch {
    // modo privado: el state de React Router cubre el caso normal
  }
}

export function peekAuthFrom(): string | null {
  try {
    return sessionStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function takeAuthFrom(fallback = '/panel'): string {
  const stored = peekAuthFrom()
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // ignore
  }
  return stored || fallback
}
