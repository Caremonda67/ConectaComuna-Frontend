import { createElement } from 'react'
import { categoryIcon } from '@/data/categories'

/**
 * Resolver el icono de una categoría devuelve un componente distinto por
 * categoría. Si esa referencia se usa directamente dentro del render de otro
 * componente, React la trata como un tipo nuevo y remonta el subárbol cada vez
 * que cambia. Este envoltorio es un componente estable que recibe el slug como
 * dato, así el árbol se mantiene y el linter deja de avisar.
 *
 * Usamos `createElement` en vez de JSX porque el icono es un valor dinámico,
 * no un componente declarado en el módulo.
 */
export function CategoryGlyph({
  category,
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  category: string
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return createElement(categoryIcon(category), {
    size,
    strokeWidth,
    className,
    'aria-hidden': true,
  })
}
