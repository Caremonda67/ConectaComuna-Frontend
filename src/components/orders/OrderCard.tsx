import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RatingInput } from '@/components/ui/Rating'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import { TratoSeguroReceiptModal } from '@/components/trust/TratoSeguroReceiptModal'
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

  // Modales interactivos
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [acceptingOpen, setAcceptingOpen] = useState(false)
  const [cancellingOpen, setCancellingOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  // Estados de formularios de acción
  const [inputFinalPrice, setInputFinalPrice] = useState(
    order.price_estimate ? String(order.price_estimate) : '',
  )
  const [inputAdvance, setInputAdvance] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [newNote, setNewNote] = useState(order.business_notes ?? '')

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

  async function confirmAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!onStatusChange) return
    setBusy(true)
    try {
      const priceVal = inputFinalPrice ? Number(inputFinalPrice) : order.price_estimate
      const advVal = inputAdvance ? Number(inputAdvance) : 0
      await onStatusChange('accepted', {
        finalPrice: priceVal,
        advancePayment: advVal,
      })
      setAcceptingOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function confirmCancel(e: React.FormEvent) {
    e.preventDefault()
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange('cancelled', {
        cancellationReason: cancelReason.trim() || 'Cancelado por el usuario',
      })
      setCancellingOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function confirmNote(e: React.FormEvent) {
    e.preventDefault()
    if (!onStatusChange) return
    setBusy(true)
    try {
      await onStatusChange(order.status, {
        businessNotes: newNote.trim() || null,
      })
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
              <div className="flex gap-1 font-bold text-brand-700 dark:text-brand-300">
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
            className="text-brand-700 dark:text-brand-300"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer transition-colors"
          >
            <UI_ICONS.whatsapp size={14} className="shrink-0" />
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

      {/* Modal para aceptar pedido y pactar precio / anticipo */}
      {acceptingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-ink-900">
              Aceptar pedido y confirmar cotización
            </h3>
            <p className="text-xs text-ink-600">
              El cliente propuso un estimado de <strong>{formatCurrency(order.price_estimate)}</strong>. Puedes confirmarlo o ajustarlo antes de empezar.
            </p>
            <form onSubmit={confirmAccept} className="space-y-3">
              <TextField
                label="Precio final acordado (COP)"
                type="number"
                min="0"
                step="500"
                value={inputFinalPrice}
                onChange={(e) => setInputFinalPrice(e.target.value)}
                required
              />
              <TextField
                label="Anticipo acordado / recibido (opcional)"
                type="number"
                min="0"
                step="500"
                value={inputAdvance}
                onChange={(e) => setInputAdvance(e.target.value)}
                hint="Tope sugerido de Trato Seguro: 50% para materiales."
              />
              {inputFinalPrice && (
                <div className="rounded-lg bg-cream-50 dark:bg-cream-100 p-2.5 text-xs flex justify-between font-semibold">
                  <span>Saldo contra entrega:</span>
                  <span className="text-brand-700 dark:text-brand-300">
                    {formatCurrency(
                      Math.max(0, Number(inputFinalPrice) - (inputAdvance ? Number(inputAdvance) : 0)),
                    )}
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" loading={busy} fullWidth>
                  Confirmar trabajo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setAcceptingOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para cancelar con motivo */}
      {cancellingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-rose-700 dark:text-rose-400">
              ¿Deseas cancelar esta solicitud?
            </h3>
            <p className="text-xs text-ink-600">
              Indica un motivo para que la otra parte comprenda lo ocurrido y se mantenga la confianza en la comuna.
            </p>
            <form onSubmit={confirmCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Motivo de cancelación
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 bg-white dark:bg-cream-50 p-2 text-xs text-ink-900"
                  required
                >
                  <option value="">Selecciona un motivo...</option>
                  <option value="Sin disponibilidad en la fecha requerida">
                    Sin disponibilidad en la fecha requerida
                  </option>
                  <option value="No cuento con los insumos o materiales necesarios">
                    No cuento con los insumos o materiales necesarios
                  </option>
                  <option value="No se llegó a un acuerdo en el precio">
                    No se llegó a un acuerdo en el precio
                  </option>
                  <option value="El cliente canceló por imprevisto familiar">
                    El cliente canceló por imprevisto familiar
                  </option>
                  <option value="Otro motivo coordinado entre las partes">
                    Otro motivo coordinado entre las partes
                  </option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" variant="danger" loading={busy} fullWidth>
                  Confirmar cancelación
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setCancellingOpen(false)}
                >
                  Volver
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para nota de avance */}
      {noteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-ink-900">
              Añadir nota de avance del trabajo
            </h3>
            <p className="text-xs text-ink-600">
              Esta nota la verá el cliente en su panel (ej: "Prenda lista para prueba", "Material comprado").
            </p>
            <form onSubmit={confirmNote} className="space-y-3">
              <TextAreaField
                label="Nota del taller"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ej: Ya compré los hilos y cierres, entrego mañana a las 3:00 p.m."
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy} fullWidth>
                  Guardar nota
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setNoteOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
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
