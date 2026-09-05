import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RatingInput } from '@/components/ui/Rating'
import { TextAreaField } from '@/components/ui/Field'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TRANSITIONS,
  cn,
  formatCurrency,
  formatDate,
} from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

interface Props {
  order: Order
  /** 'business' habilita las transiciones de estado; 'client' habilita reseñar. */
  perspective: 'client' | 'business'
  onStatusChange?: (status: OrderStatus) => Promise<void>
  onReview?: (rating: number, comment: string) => Promise<void>
}

export function OrderCard({ order, perspective, onStatusChange, onReview }: Props) {
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const transitions = ORDER_TRANSITIONS[order.status]
  // El cliente solo puede cancelar; el negocio gestiona el flujo del trabajo.
  const allowed =
    perspective === 'business' ? transitions : transitions.filter((t) => t === 'cancelled')

  async function change(status: OrderStatus) {
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange(status)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{order.title}</h3>
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            {perspective === 'client' ? (
              <>
                <CategoryGlyph
                  category={order.business?.category ?? 'otros'}
                  size={13}
                  strokeWidth={1.75}
                  className="shrink-0"
                />
                {order.business ? (
                  <Link to={`/negocio/${order.business.id}`} className="underline">
                    {order.business.name}
                  </Link>
                ) : (
                  'Negocio'
                )}
              </>
            ) : (
              `Cliente: ${order.client?.full_name ?? 'Vecino'}`
            )}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
            ORDER_STATUS_STYLE[order.status],
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {order.description && (
        <p className="mt-2 text-sm text-ink-700">{order.description}</p>
      )}

      <dl className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink-500">
        <div className="flex gap-1">
          <dt>Solicitado:</dt>
          <dd>{formatDate(order.created_at)}</dd>
        </div>
        {order.scheduled_for && (
          <div className="flex gap-1">
            <dt>Para:</dt>
            <dd>{formatDate(order.scheduled_for)}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt>Valor:</dt>
          <dd>{formatCurrency(order.price_estimate)}</dd>
        </div>
      </dl>

      {allowed.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {allowed.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === 'cancelled' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => change(status)}
            >
              {status === 'accepted' && 'Aceptar'}
              {status === 'in_progress' && 'Empezar trabajo'}
              {status === 'completed' && 'Marcar finalizado'}
              {status === 'cancelled' && 'Cancelar'}
            </Button>
          ))}
        </div>
      )}

      {perspective === 'client' && order.status === 'completed' && !order.review && onReview && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          {!reviewing ? (
            <Button size="sm" variant="secondary" onClick={() => setReviewing(true)}>
              <Star aria-hidden="true" size={15} strokeWidth={1.75} />
              Calificar este servicio
            </Button>
          ) : (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                try {
                  await onReview(rating, comment)
                  setReviewing(false)
                } finally {
                  setBusy(false)
                }
              }}
            >
              <RatingInput value={rating} onChange={setRating} />
              <TextAreaField
                label="Comentario (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="¿Cómo te fue con el servicio?"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy}>
                  Enviar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setReviewing(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  )
}
