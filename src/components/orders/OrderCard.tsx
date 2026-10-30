import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RatingInput } from '@/components/ui/Rating'
import { TextAreaField } from '@/components/ui/Field'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import { TratoSeguroReceiptModal } from '@/components/trust/TratoSeguroReceiptModal'
import { AceptarPedidoModal } from './AceptarPedidoModal'
import { CancelarPedidoModal } from './CancelarPedidoModal'
import { NotaAvanceModal } from './NotaAvanceModal'
import { UI_ICONS } from '@/components/ui/icons'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TRANSITIONS,
  cn,
  formatCurrency,
  formatDate,
} from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'
import type { UpdateOrderStatusOptions } from '@/services/orderService'

interface Props {
  order: Order
  /** 'business' habilita las transiciones de estado; 'client' habilita reseñar. */
  perspective: 'client' | 'business'
  onStatusChange?: (status: OrderStatus, options?: UpdateOrderStatusOptions) => Promise<void>
  onReview?: (rating: number, comment: string) => Promise<void>
}

export function OrderCard({ order, perspective, onStatusChange, onReview }: Props) {
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  // Qué modal está abierto. Cada modal se encarga de su propio formulario.
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [acceptingOpen, setAcceptingOpen] = useState(false)
  const [cancellingOpen, setCancellingOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const transitions = ORDER_TRANSITIONS[order.status]
  const allowed =
    perspective === 'business' ? transitions : transitions.filter((t) => t === 'cancelled')

  const targetPhone =
    perspective === 'business'
      ? order.client?.phone
      : order.business?.phone

  const targetName =
    perspective === 'business'
      ? order.client?.full_name ?? 'Vecino cliente'
      : order.business?.name ?? 'Taller comunitario'

  async function handleStatusClick(status: OrderStatus) {
    if (!onStatusChange) return
    if (status === 'accepted' && perspective === 'business') {
      setAcceptingOpen(true)
      return
    }
    if (status === 'cancelled') {
      setCancellingOpen(true)
      return
    }
    setBusy(true)
    try {
      await onStatusChange(status)
    } finally {
      setBusy(false)
    }
  }

  async function aceptarPedido(valores: { finalPrice: number; advancePayment: number }) {
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange('accepted', valores)
      setAcceptingOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function cancelarPedido(motivo: string) {
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange('cancelled', { cancellationReason: motivo })
      setCancellingOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function guardarNota(nota: string | null) {
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange(order.status, { businessNotes: nota })
      setNoteOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const precioFinal = order.final_price ?? order.price_estimate
  const anticipo = order.advance_payment ?? 0
  const saldo = precioFinal ? Math.max(0, precioFinal - anticipo) : null

  return (
    <article className="card p-4 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink-900">{order.title}</h3>
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

      {/* Modalidad y dirección */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-cream-200 px-2 py-0.5 font-medium text-ink-700">
          {order.service_location_type === 'home_delivery' ? '🛵 A domicilio' : '🏠 En taller / local'}
        </span>
        {order.delivery_address && (
          <span className="text-ink-500 truncate max-w-xs">
            {order.delivery_address}
          </span>
        )}
      </div>

      {/* Fotos de referencia */}
      {order.photos && order.photos.length > 0 && (
        <ul className="mt-2.5 flex gap-2 flex-wrap">
          {order.photos.map((src, i) => (
            <li key={src}>
              <img
                src={src}
                alt={`Foto ${i + 1} del pedido`}
                loading="lazy"
                decoding="async"
                className="h-16 w-16 rounded-lg object-cover border border-ink-200 shadow-2xs"
              />
            </li>
          ))}
        </ul>
      )}

      {/* Nota de avance si el taller la dejó */}
      {order.business_notes && (
        <div className="mt-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-semibold flex items-center gap-1">
            <span>💬</span> Nota de avance del taller:
          </p>
          <p className="mt-0.5">{order.business_notes}</p>
        </div>
      )}

      {/* Motivo de cancelación si fue cancelado */}
      {order.status === 'cancelled' && order.cancellation_reason && (
        <div className="mt-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-2.5 text-xs text-rose-800 dark:text-rose-200">
          <span className="font-semibold">Motivo de cancelación:</span> {order.cancellation_reason}
        </div>
      )}

      {/* Desglose financiero */}
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500 border-t border-ink-200 pt-2.5">
        <div className="flex gap-1">
          <dt>Solicitado:</dt>
          <dd className="font-medium text-ink-700">{formatDate(order.created_at)}</dd>
        </div>
        {order.scheduled_for && (
          <div className="flex gap-1">
            <dt>Para:</dt>
            <dd className="font-medium text-ink-700">{formatDate(order.scheduled_for)}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt>{order.final_price ? 'Valor acordado:' : 'Presupuesto:'}</dt>
          <dd className="font-semibold text-ink-900">{formatCurrency(precioFinal)}</dd>
        </div>
        {anticipo > 0 && (
          <>
            <div className="flex gap-1 text-emerald-700 dark:text-emerald-400">
              <dt>Anticipo:</dt>
              <dd className="font-medium">{formatCurrency(anticipo)}</dd>
            </div>
            {saldo !== null && (
              <div className="flex gap-1 font-bold text-brand-700">
                <dt>Saldo contra entrega:</dt>
                <dd>{formatCurrency(saldo)}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {/* Botones de acción según el estado */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {allowed.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === 'cancelled' ? 'danger' : 'primary'}
            loading={busy}
            onClick={() => handleStatusClick(status)}
          >
            {status === 'accepted' && 'Aceptar y fijar precio'}
            {status === 'in_progress' && 'Empezar trabajo'}
            {status === 'completed' && 'Marcar finalizado'}
            {status === 'cancelled' && 'Cancelar'}
          </Button>
        ))}

        {perspective === 'business' && order.status === 'in_progress' && (
          <Button size="sm" variant="secondary" onClick={() => setNoteOpen(true)}>
            Nota de avance
          </Button>
        )}

        {/* Comprobante de Trato Seguro si no está cancelado */}
        {order.status !== 'cancelled' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setReceiptOpen(true)}
            className="text-brand-700"
          >
            <span aria-hidden="true">🤝</span>
            {order.status === 'pending' ? 'Comprobante de solicitud' : 'Comprobante de acuerdo'}
          </Button>
        )}

        {/* Contacto por WhatsApp directo con mensaje contextual */}
        {targetPhone && (
          <a
            href={`https://wa.me/57${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hola ${targetName}, te contacto desde ConectaComuna sobre el pedido "${order.title}" (Estado: ${ORDER_STATUS_LABEL[order.status]}).`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer transition-all duration-200"
          >
            <UI_ICONS.whatsapp size={14} className="shrink-0 transition-transform duration-200 group-hover:scale-115 group-hover:-rotate-6" />
            WhatsApp
          </a>
        )}
      </div>

      {/* Reseña registrada del servicio si ya fue calificado */}
      {order.review && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
            <Star aria-hidden="true" size={14} className="fill-amber-500 text-amber-500" />
            <span>{perspective === 'client' ? 'Tu calificación:' : 'Calificación del cliente:'} {order.review.rating}.0 / 5.0</span>
          </div>
          {order.review.comment && (
            <p className="mt-1 italic text-ink-700">
              &ldquo;{order.review.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Calificación para clientes en trabajos completados */}
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

      {/* Aceptar pedido y pactar precio / anticipo */}
      {acceptingOpen && (
        <AceptarPedidoModal
          priceEstimate={order.price_estimate}
          busy={busy}
          onClose={() => setAcceptingOpen(false)}
          onConfirm={aceptarPedido}
        />
      )}

      {/* Cancelar con motivo */}
      {cancellingOpen && (
        <CancelarPedidoModal
          busy={busy}
          onClose={() => setCancellingOpen(false)}
          onConfirm={cancelarPedido}
        />
      )}

      {/* Nota de avance */}
      {noteOpen && (
        <NotaAvanceModal
          notaInicial={order.business_notes ?? ''}
          busy={busy}
          onClose={() => setNoteOpen(false)}
          onConfirm={guardarNota}
        />
      )}

      {/* Modal de Comprobante de Trato Seguro */}
      <TratoSeguroReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        order={order}
      />
    </article>
  )
}
