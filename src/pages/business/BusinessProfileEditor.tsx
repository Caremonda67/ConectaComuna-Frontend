import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { businessService } from '@/services/businessService'
import { facilitadorService } from '@/services/facilitadorService'
import { LazyMap } from '@/components/map/LazyMap'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { CATEGORIES } from '@/data/categories'
import { COMUNA_CENTER } from '@/lib/env'
import { geocodificar, reverseGeocodificar } from '@/services/direccionService'
import type { UbicacionGeocodificada } from '@/services/direccionService'
import { DAY_NAMES, cn, formatCurrency } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'
import type { Business, BusinessHours, CategorySlug, Coordinates, ServiceCatalogItem } from '@/types'
import { FormSkeleton } from '@/components/ui/Skeleton'
import { SeccionFicha } from '@/components/business/SeccionFicha'
import { ProgresoFicha, type PasoFicha } from '@/components/business/ProgresoFicha'

const schema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  category: z.string().min(1, 'Elige tu oficio.'),
  description: z
    .string()
    .min(40, 'Cuenta en al menos 40 caracteres qué haces: ayuda a que te contraten.'),
  phone: z
    .string()
    .regex(/^3\d{9}$/, 'Celular de 10 dígitos (ej: 3001234567).')
    .optional()
    .or(z.literal('')),
  whatsapp: z
    .string()
    .regex(/^3\d{9}$/, 'Celular de 10 dígitos.')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
})
type Values = z.infer<typeof schema>

const emptyHours = (): BusinessHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    opens: '08:00',
    closes: '18:00',
    closed: day === 0,
  }))

interface FormProps {
  managedBusiness: Business | null
  userId: string
  onSaved: () => Promise<void>
}

export default function BusinessProfileEditor() {
  usePageMeta({
    title: 'Editar Perfil de Oficio · ConectaComuna',
    description: 'Edita la información, ubicación, horarios y catálogo de tu negocio u oficio.',
  })

  const { userId, business, profile, activeRole, setActiveRole, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedBusinessId = new URLSearchParams(location.search).get('id')
  const [targetBusiness, setTargetBusiness] = useState<Business | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(Boolean(requestedBusinessId))
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!requestedBusinessId || !userId) return

    const safeUserId = userId
    const safeBusinessId = requestedBusinessId
    let alive = true

    async function loadTargetBusiness(uid: string, bid: string) {
      try {
        setLoadingBusiness(true)
        const target = await businessService.getById(bid)
        if (!target) {
          if (alive) {
            setAccessDenied(true)
            setTargetBusiness(null)
          }
          return
        }

        const isOwner = target.owner_id === uid
        const isApprovedFacilitador =
          profile?.account_type === 'facilitador' &&
          (await facilitadorService.getNegociosVinculados(uid)).some(
            ({ vinculacion, negocio }) =>
              negocio.id === target.id && vinculacion.estado_vinculacion === 'aprobado',
          )

        if (!isOwner && !isApprovedFacilitador) {
          if (alive) {
            setAccessDenied(true)
            setTargetBusiness(null)
          }
          return
        }

        if (alive) {
          setTargetBusiness(target)
          setAccessDenied(false)
        }
      } catch {
        if (alive) {
          setAccessDenied(true)
          setTargetBusiness(null)
        }
      } finally {
        if (alive) setLoadingBusiness(false)
      }
    }

    void loadTargetBusiness(safeUserId, safeBusinessId)

    return () => {
      alive = false
    }
  }, [requestedBusinessId, userId, profile?.account_type])

  if (loadingBusiness) {
    return <FormSkeleton campos={6} />
  }

  if (accessDenied) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">No tienes acceso a este negocio</h1>
        <p className="mt-2 text-sm text-ink-600">
          Solo el dueño del negocio o un facilitador aprobado puede editar este perfil.
        </p>
        <Button className="mt-4" onClick={() => navigate('/panel')}>
          Volver al panel
        </Button>
      </div>
    )
  }

  // Una cuenta de negocio en rol Cliente podia abrir el editor y guardar, y
  // terminaba en "Mis Solicitudes" sin ver el acuse de guardado, que vive en
  // el panel de negocio. No es un problema de permisos —la ficha es suya— sino
  // de coherencia: se estaba editando el negocio desde la vista que no lo
  // muestra. Se pide el cambio de rol en vez de rebotar sin explicacion.
  if (profile?.account_type === 'business' && activeRole !== 'business') {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">Estás en modo Cliente</h1>
        <p className="mt-2 text-sm text-ink-600">
          Tu ficha de negocio se edita desde el modo Negocio. Así, al guardar, vuelves a tu
          panel de pedidos y ves el cambio reflejado.
        </p>
        <Button className="mt-4" onClick={() => setActiveRole('business')}>
          Cambiar a modo Negocio
        </Button>
      </div>
    )
  }

  // Un facilitador que entra sin indicar negocio caia en el formulario de
  // creacion: `business` es null para el, y el formulario sin negocio es el de
  // "Crear mi negocio". Su papel es acompañar los oficios de otros, no abrir
  // uno propio, asi que aqui se le manda a elegir cual va a editar.
  if (profile?.account_type === 'facilitador' && !requestedBusinessId) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">Elige el negocio que vas a editar</h1>
        <p className="mt-2 text-sm text-ink-600">
          Como facilitador acompañas los oficios de tus vecinos: puedes editar las fotos, los
          precios y los horarios de los negocios que te dieron acceso, pero no abrir uno propio
          desde esta cuenta.
        </p>
        <Button className="mt-4" onClick={() => navigate('/panel')}>
          Ver los negocios que apoyo
        </Button>
      </div>
    )
  }

  const activeBusiness = requestedBusinessId ? targetBusiness : business

  return (
    <BusinessProfileEditorForm
      key={activeBusiness?.id ?? 'nuevo'}
      managedBusiness={activeBusiness}
      userId={userId ?? ''}
      onSaved={async () => {
        await refresh()
        // El acuse viaja con la navegacion: mostrarlo aqui seria inutil
        // porque esta pantalla se desmonta en el mismo instante.
        navigate('/panel', { state: { guardado: 'Negocio guardado' } })
      }}
    />
  )
}

function BusinessProfileEditorForm({ managedBusiness, userId, onSaved }: FormProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: managedBusiness?.name ?? '',
      category: managedBusiness?.category ?? '',
      description: managedBusiness?.description ?? '',
      phone: managedBusiness?.phone ?? '',
      whatsapp: managedBusiness?.whatsapp ?? '',
      address: managedBusiness?.address ?? '',
      neighborhood: managedBusiness?.neighborhood ?? '',
    },
  })

  const [position, setPosition] = useState<Coordinates>(
    managedBusiness ? { lat: managedBusiness.lat, lng: managedBusiness.lng } : COMUNA_CENTER,
  )
  const [resolviendoBarrio, setResolviendoBarrio] = useState(false)
  const inputFotosRef = useRef<HTMLInputElement>(null)
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [opcionesDireccion, setOpcionesDireccion] = useState<UbicacionGeocodificada[]>([])
  const [avisoDireccion, setAvisoDireccion] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>(managedBusiness?.photos ?? [])

  /**
   * El barrio sale del punto que la persona marca, no de lo que escriba. Así
   * "El Rodeo", "el rodeo" y "Barrio El Rodeo" dejan de ser tres zonas
   * distintas, y la ciudad entra sola para quien no está en Cali.
   */
  async function marcarPunto(punto: Coordinates) {
    setPosition(punto)
    setResolviendoBarrio(true)
    try {
      const geo = await reverseGeocodificar(punto)
      if (geo?.etiqueta && !geo.etiqueta.startsWith('Punto (')) {
        setValue('neighborhood', geo.etiqueta, { shouldDirty: true })
      }
    } catch {
      // Sin red el campo queda como estaba y la persona lo escribe.
    } finally {
      setResolviendoBarrio(false)
    }
  }
  /**
   * Busca en el mapa la dirección escrita y mueve el punto allí.
   *
   * Hasta ahora esto iba en un solo sentido: el punto rellenaba el barrio,
   * pero la dirección escrita no hacía nada. Se podía tener "cra 39 #52-56"
   * con el punto a diez cuadras y nada avisaba, porque son dos datos que
   * nunca se hablaban. El que manda para las búsquedas por cercanía es el
   * punto, así que la dirección quedaba de adorno.
   *
   * No se busca mientras se escribe, a propósito: el geocodificador de
   * OpenStreetMap pide como mucho una consulta por segundo, y un punto que
   * salta solo mientras tecleas asusta. Lo pide la persona cuando acaba.
   */
  async function buscarDireccionEnMapa() {
    const direccion = (getValues('address') ?? '').trim()
    if (!direccion) {
      setAvisoDireccion('Escribe primero la dirección o un punto de referencia.')
      return
    }

    setBuscandoDireccion(true)
    setAvisoDireccion(null)
    setOpcionesDireccion([])
    try {
      // Una dirección suelta como "cra 39 #52-56" existe en media Colombia.
      // Se le añade el barrio y la ciudad que ya haya para acotar la búsqueda.
      const pistas = (getValues('neighborhood') ?? '').trim()
      const consulta = pistas ? `${direccion}, ${pistas}` : `${direccion}, Cali`
      const hits = await geocodificar(consulta)

      if (hits.length === 0) {
        setAvisoDireccion(
          'No encontré esa dirección en el mapa. Puedes marcar el punto a mano tocando el mapa: eso es lo que de verdad usan los vecinos para encontrarte.',
        )
        return
      }
      if (hits.length === 1) {
        await marcarPunto(hits[0].center)
        setAvisoDireccion('Listo, moví el punto a esa dirección. Revisa que sea el sitio correcto.')
        return
      }
      setOpcionesDireccion(hits)
    } catch {
      setAvisoDireccion(
        'No se pudo consultar el mapa en este momento. Marca el punto a mano tocando el mapa.',
      )
    } finally {
      setBuscandoDireccion(false)
    }
  }

  const [hours, setHours] = useState<BusinessHours[]>(
    managedBusiness?.hours?.length ? managedBusiness.hours : emptyHours(),
  )
  const [wholesaleEnabled, setWholesaleEnabled] = useState(managedBusiness?.wholesale_enabled ?? false)
  const [wholesaleMinOrder, setWholesaleMinOrder] = useState(managedBusiness?.wholesale_min_order ?? '')
  const [wholesaleTerms, setWholesaleTerms] = useState(managedBusiness?.wholesale_terms ?? '')
  const [servicesCatalog, setServicesCatalog] = useState<ServiceCatalogItem[]>(
    managedBusiness?.services_catalog ?? [],
  )
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const description = useWatch({ control, name: 'description' }) ?? ''

  function handleAddService() {
    setServicesCatalog((prev) => [
      ...prev,
      { id: `srv-${Date.now()}`, name: '', price: null, description: '' },
    ])
  }

  function updateService(index: number, field: keyof ServiceCatalogItem, value: unknown) {
    setServicesCatalog((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function removeService(index: number) {
    setServicesCatalog((prev) => prev.filter((_, i) => i !== index))
  }

  // El avance se mide sobre lo que hay escrito ahora mismo, no sobre lo
  // guardado: quien acaba de llenar el nombre ve el contador subir en el acto.
  // `useWatch` en vez de `watch()`: el segundo devuelve una funcion que el
  // compilador de React no puede memorizar y hace que se salte el componente
  // entero.
  const vistos = useWatch({ control })
  const tieneBasico =
    (vistos.name ?? '').trim().length > 0 &&
    (vistos.category ?? '').trim().length > 0 &&
    (vistos.description ?? '').trim().length > 0
  const tieneContacto =
    ((vistos.phone ?? '').trim().length > 0 || (vistos.whatsapp ?? '').trim().length > 0) &&
    (vistos.neighborhood ?? '').trim().length > 0
  const tieneCatalogo = servicesCatalog.some((s) => s.name.trim().length > 0)

  const pasos: PasoFicha[] = [
    { id: 'ficha-basico', etiqueta: 'Nombre, oficio y descripción', listo: tieneBasico, esencial: true },
    // Las fotos van en segundo lugar, igual que en la página: es lo que más
    // convence a un vecino y lo que la persona tiene más a mano en el celular.
    // Dejarlas al final hacía que mucha ficha se publicara sin ninguna.
    { id: 'ficha-fotos', etiqueta: 'Fotos de tus trabajos', listo: photos.length > 0, esencial: false },
    { id: 'ficha-contacto', etiqueta: 'Contacto y punto en el mapa', listo: tieneContacto, esencial: true },
    { id: 'ficha-catalogo', etiqueta: 'Precios de referencia', listo: tieneCatalogo, esencial: true },
    { id: 'ficha-horarios', etiqueta: 'Horarios de atención', listo: hours.some((h) => !h.closed), esencial: false },
  ]

  async function onSubmit(values: Values) {
    if (!userId) return
    const ownerId = managedBusiness?.owner_id ?? userId
    setServerError(null)
    try {
      await businessService.upsert(ownerId, {
        name: values.name,
        category: values.category as CategorySlug,
        description: values.description,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        address: values.address || null,
        neighborhood: values.neighborhood || null,
        lat: position.lat,
        lng: position.lng,
        photos,
        hours,
        wholesale_enabled: wholesaleEnabled,
        wholesale_min_order: wholesaleEnabled ? wholesaleMinOrder.trim() || null : null,
        wholesale_terms: wholesaleEnabled ? wholesaleTerms.trim() || null : null,
        services_catalog: servicesCatalog.filter((s) => s.name.trim().length > 0),
        is_active: true,
      })
      await onSaved()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos guardar tu negocio.')
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !userId) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 6 - photos.length)) {
        urls.push(await businessService.uploadPhoto(userId, file))
      }
      setPhotos((p) => [...p, ...urls])
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos subir la foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <h1 className="text-xl font-bold">
        {/* Un facilitador edita la ficha de un vecino, no la suya. */}
        {!managedBusiness
          ? 'Crear mi negocio'
          : profile?.account_type === 'facilitador'
            ? `Editar la ficha de ${managedBusiness.name}`
            : 'Editar mi negocio'}
      </h1>

      <ProgresoFicha pasos={pasos} />

      {managedBusiness?.verification_status === 'verified' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <UI_ICONS.shieldCheck size={20} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm">Tu negocio cuenta con el Sello de Verificación en Territorio</span>
            <span className="text-emerald-800 dark:text-emerald-300">
              {managedBusiness.verification_note || 'Validado en persona en la comuna por un facilitador de la red.'}
            </span>
          </div>
        </div>
      )}

      {managedBusiness && managedBusiness.verification_status !== 'verified' && (
        <div className="rounded-xl border border-ink-200 bg-cream-100 p-3.5 text-xs text-ink-700 flex items-start gap-2.5">
          <UI_ICONS.shieldCheck size={20} className="text-ink-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm text-ink-900">¿Cómo obtener el Sello de Verificación en Territorio?</span>
            <p className="mt-0.5 text-ink-600 leading-relaxed">
              Un facilitador de la red visita tu negocio o taller y confirma que existe en el barrio. Para eso necesita el código de apadrinamiento que generas más abajo; él registra la visita y queda el sello.
            </p>
          </div>
        </div>
      )}

      <SeccionFicha
        id="ficha-basico"
        icon={UI_ICONS.store}
        titulo="Lo básico"
        porQue="Es lo primero que lee un vecino cuando te encuentra."
        completa={tieneBasico}
      >
        <TextField
          label="Nombre del negocio"
          hint="Usa el nombre con el que te conocen en el barrio."
          error={errors.name?.message}
          {...register('name')}
        />
        <SelectField label="Oficio" error={errors.category?.message} {...register('category')}>
          <option value="">Selecciona…</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="¿Qué ofreces?"
          error={errors.description?.message}
          hint={`${description.length}/40 caracteres mínimos. Menciona precios aproximados y tiempos de entrega.`}
          {...register('description')}
        />
      </SeccionFicha>

      <SeccionFicha
        id="ficha-fotos"
        icon={UI_ICONS.gallery}
        titulo="Fotos de tus trabajos"
        porQue="Una foto real de lo que haces convence más que cualquier descripción."
        completa={photos.length > 0}
      >
        <p className="text-sm text-ink-500">
          Sube hasta 6 fotos. Con una ya se nota la diferencia. La que marques como
          portada es la que ven los vecinos en el directorio y en el mapa.
        </p>
        {/*
          Sin `capture="environment"`.
          Ese atributo obligaba al celular a abrir la camara: no dejaba elegir
          una foto que la persona ya tuviera en la galeria, que es como la
          mayoria tiene las fotos de sus trabajos. Sin el, Android e iOS
          ofrecen las dos cosas, camara y galeria, y la persona decide.

          El `input` va oculto y el boton de al lado lo dispara: el control
          nativo de archivos es diminuto y en un celular no se ve que sea algo
          que hay que tocar.
        */}
        <input
          ref={inputFotosRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || photos.length >= 6}
          className="sr-only"
          aria-label="Subir fotos del portafolio"
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          loading={uploading}
          disabled={photos.length >= 6}
          onClick={() => inputFotosRef.current?.click()}
        >
          {photos.length === 0 ? 'Agregar fotos de mis trabajos' : 'Agregar más fotos'}
        </Button>
        <p className="text-xs text-ink-500">
          Puedes tomar una foto en el momento o escoger una que ya tengas guardada.
          {photos.length > 0 && ` Llevas ${photos.length} de 6.`}
        </p>
        {uploading && <p className="text-sm text-ink-500">Subiendo fotos…</p>}
        {/*
          La portada es la PRIMERA foto del arreglo: así la lee `BusinessCard`
          y así la toma la vista previa al compartir el enlace. Antes eso no se
          decía en ninguna parte y no había forma de cambiarla, de modo que la
          foto de la tarjeta la decidía el orden en que se subieron los
          archivos. Quien subía primero una foto del local y después la del
          trabajo terminado se quedaba con la peor de las dos en el directorio,
          sin saber por qué.

          Elegir portada reordena en vez de guardar un campo nuevo: no toca el
          esquema, y una columna más en `businesses` habría que añadirla además
          a los permisos por columna de `anon` —el olvido que tumbó el
          directorio al aplicar `migracion-codigo-no-publico.sql`—.
        */}
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => {
              const esPortada = i === 0
              return (
                <li key={src} className="relative">
                  <img
                    src={src}
                    alt={esPortada ? 'Foto de portada del negocio' : `Foto ${i + 1} del portafolio`}
                    loading="lazy"
                    className={cn(
                      'aspect-square w-full rounded-xl object-cover',
                      esPortada && 'ring-2 ring-brand-600 ring-offset-2 ring-offset-cream-100',
                    )}
                  />

                  {esPortada ? (
                    <span className="absolute left-1 top-1 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white dark:text-brand-50">
                      Portada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((p) => [src, ...p.filter((x) => x !== src)])
                      }
                      className="absolute left-1 top-1 rounded-full bg-black/60 hover:bg-brand-700 px-2 py-0.5 text-xs text-white hover:scale-105 active:scale-90 transition-all duration-150 cursor-pointer"
                    >
                      Usar de portada
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 hover:bg-rose-600 px-2 py-0.5 text-xs text-white hover:scale-105 active:scale-90 transition-all duration-150 cursor-pointer"
                  >
                    Quitar<span className="sr-only"> foto {i + 1}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SeccionFicha>

      <SeccionFicha
        id="ficha-contacto"
        icon={UI_ICONS.map}
        titulo="Contacto y ubicación"
        porQue="Sin un punto en el mapa no apareces en las búsquedas por cercanía."
        completa={tieneContacto}
      >
        <TextField
          label="Celular"
          type="tel"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />
        <div className="space-y-2">
          <TextField
            label="Dirección o punto de referencia"
            hint="Escríbela y toca «Buscar en el mapa» para que el punto se ponga solo. Si no la encuentra, marca el punto a mano: eso es lo que vale."
            error={errors.address?.message}
            {...register('address')}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={buscandoDireccion}
            onClick={buscarDireccionEnMapa}
          >
            Buscar en el mapa
          </Button>

          {avisoDireccion && (
            <p role="status" className="text-xs text-ink-600">
              {avisoDireccion}
            </p>
          )}

          {/* Con varios resultados no se elige por la persona: una dirección
              como "cra 39 #52-56" existe en varios barrios, y poner el punto
              en el equivocado manda a los vecinos a otro lado. */}
          {opcionesDireccion.length > 1 && (
            <div className="rounded-xl border border-ink-200 p-2">
              <p className="mb-1 text-xs font-medium text-ink-700">
                Encontré varios sitios. ¿Cuál es el tuyo?
              </p>
              <ul className="space-y-1">
                {opcionesDireccion.map((o) => (
                  <li key={`${o.etiqueta}-${o.center.lat}-${o.center.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        void marcarPunto(o.center)
                        setOpcionesDireccion([])
                        setAvisoDireccion('Listo, moví el punto ahí. Revisa que sea el sitio correcto.')
                      }}
                      className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-cream-200 cursor-pointer"
                    >
                      {/* El detalle va primero porque es lo que diferencia una
                          opción de otra: sin él, dos resultados distintos se
                          leían igual, "El Retiro, Cali", y no había forma de
                          elegir. */}
                      <span className="block text-sm font-medium text-ink-800">
                        {o.detalle || o.etiqueta}
                      </span>
                      {o.detalle && (
                        <span className="block text-xs text-ink-500">{o.etiqueta}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <TextField
          label="Barrio"
          hint={
            resolviendoBarrio
              ? 'Leyendo el punto del mapa…'
              : 'Se completa solo al mover el punto. Puedes corregirlo si tu barrio se llama de otra forma.'
          }
          error={errors.neighborhood?.message}
          {...register('neighborhood')}
        />

        <div>
          <p className="mb-1 text-sm font-medium text-ink-700">
            Toca el mapa para marcar dónde te encuentran
          </p>
          <LazyMap
            center={position}
            pickable
            pickedPosition={position}
            onPick={marcarPunto}
            showUser={false}
            height="260px"
            zoom={16}
          />
          <p className="mt-1 text-xs text-ink-500">
            Este punto es el que usan las búsquedas por cercanía. Si no coincide con la
            dirección que escribiste, manda el punto.
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            Coordenadas: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        </div>
      </SeccionFicha>

      {/* Venta al por mayor y distribuidores */}
      <SeccionFicha
        id="ficha-mayoreo"
        icon={UI_ICONS.package}
        titulo="Venta al por mayor"
        porQue="¿Vendes por lotes o atiendes a tiendas de barrio? Actívalo solo si aplica."
        opcional
        completa={wholesaleEnabled}
        acción={
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={wholesaleEnabled}
                onChange={(e) => setWholesaleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-cream-300 dark:bg-cream-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
        }
      >

        {wholesaleEnabled && (
          <div className="space-y-3 pt-2 border-t border-ink-100">
            <TextField
              label="Pedido mínimo al por mayor"
              value={wholesaleMinOrder}
              onChange={(e) => setWholesaleMinOrder(e.target.value)}
              placeholder="Ej: A partir de media docena (6 unidades) o $100.000"
              hint="Indica la cantidad o monto mínimo para acceder a precio mayorista."
            />
            <TextAreaField
              label="Condiciones o descuentos mayoristas"
              value={wholesaleTerms}
              onChange={(e) => setWholesaleTerms(e.target.value)}
              placeholder="Ej: 20% de descuento sobre precio al detal. Entrega en 48 horas para dotaciones o revendedores."
              hint="Explica cómo manejas los precios o entregas para otros comerciantes de la comuna."
            />
          </div>
        )}
      </SeccionFicha>

      {/*
        Catálogo de servicios.

        Antes eran tres cajas iguales por servicio —nombre, tarifa y
        descripción, las tres con su borde y su etiqueta diminuta—, así que el
        apartado se leía como una tabla de base de datos y el emprendedor nunca
        veía lo que iba a ver el cliente. Ahora cada fila tiene la forma de la
        tarjeta que sale publicada: el nombre grande, el precio a la derecha y
        el detalle debajo. Se escribe encima del resultado.
      */}
      <SeccionFicha
        id="ficha-catalogo"
        icon={UI_ICONS.fileText}
        titulo="Lo que ofreces y a qué precio"
        porQue="Los vecinos preguntan el precio primero; tenerlo escrito ahorra media conversación."
        completa={servicesCatalog.some((s) => s.name.trim().length > 0)}
        acción={
          servicesCatalog.length > 0 ? (
            <Button type="button" size="sm" variant="secondary" onClick={handleAddService}>
              <UI_ICONS.package size={15} />
              Añadir otro
            </Button>
          ) : undefined
        }
      >

        {servicesCatalog.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-5 text-center">
            <p className="text-sm font-semibold text-ink-900">
              Todavía no has puesto ningún precio
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-600">
              Los vecinos preguntan primero por el precio. Poner dos o tres de los trabajos que
              más te piden evita media conversación por WhatsApp.
            </p>
            <p className="mt-2 text-xs text-ink-500">
              Por ejemplo: <span className="font-semibold text-ink-700">Ruedo de pantalón</span>
              {' · '}
              <span className="font-semibold text-ink-700">{formatCurrency(15000)}</span>
            </p>
            <div className="mt-3 flex justify-center">
              <Button type="button" size="sm" onClick={handleAddService}>
                Añadir mi primer servicio
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {servicesCatalog.map((item, idx) => (
              <li
                key={item.id || idx}
                className="rounded-xl border border-ink-200 bg-white dark:bg-cream-100 p-3 transition-colors focus-within:border-brand-400"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      aria-label={`Nombre del servicio ${idx + 1}`}
                      placeholder="Ej: Ruedo de pantalón"
                      value={item.name}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      /* Sin borde: el campo se ve como el título que será, y
                         solo se marca al enfocarlo. */
                      className="w-full rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:bg-cream-100 dark:focus:bg-cream-50 focus:outline-none"
                    />
                    <input
                      type="text"
                      aria-label={`Detalle del servicio ${idx + 1}`}
                      placeholder="Detalle breve (opcional): tela estándar, a mano o a máquina…"
                      value={item.description ?? ''}
                      onChange={(e) => updateService(idx, 'description', e.target.value)}
                      className="mt-0.5 w-full rounded-md bg-transparent px-1 py-0.5 text-xs text-ink-600 placeholder:text-ink-400 focus:bg-cream-100 dark:focus:bg-cream-50 focus:outline-none"
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex items-center rounded-lg border border-ink-200 bg-cream-50 dark:bg-cream-200/40 px-2 focus-within:border-brand-500">
                      <span aria-hidden="true" className="text-sm font-semibold text-ink-500">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Precio del servicio ${idx + 1} en pesos`}
                        placeholder="15.000"
                        value={item.price == null ? '' : item.price.toLocaleString('es-CO')}
                        onChange={(e) => {
                          // Se escribe con puntos de mil a la vista, pero se
                          // guarda el número limpio: "15.000" es legible y
                          // 15000 es lo que entiende la base.
                          const digitos = e.target.value.replace(/\D/g, '')
                          updateService(idx, 'price', digitos ? Number(digitos) : null)
                        }}
                        className="w-20 bg-transparent py-1.5 text-right text-sm font-semibold text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:outline-none"
                      />
                    </div>
                    {/* 44 px de área táctil, como el resto de los botones: la
                        "✕" anterior medía 26 y había que apuntarle. */}
                    <button
                      type="button"
                      onClick={() => removeService(idx)}
                      aria-label={`Quitar ${item.name.trim() || `el servicio ${idx + 1}`}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                    >
                      <UI_ICONS.close size={17} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SeccionFicha>

      <SeccionFicha
        id="ficha-horarios"
        icon={UI_ICONS.calendar}
        titulo="Horarios de atención"
        porQue={'Activa el indicador "Abierto ahora" para que no te escriban a deshora.'}
        opcional
        completa={hours.some((h) => !h.closed)}
      >
        <ul className="divide-y divide-ink-100">
          {hours.map((h, i) => (
            <li key={h.day} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:min-w-28">
                <span className="w-12 font-semibold text-ink-900">{DAY_NAMES[h.day]}</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={!h.closed}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, closed: !e.target.checked } : x)),
                      )
                    }
                    className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>{!h.closed ? 'Abierto' : 'Cerrado'}</span>
                </label>
              </div>

              {!h.closed ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-500">De</span>
                  <input
                    type="time"
                    aria-label={`Hora de apertura ${DAY_NAMES[h.day]}`}
                    value={h.opens ?? '08:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, opens: e.target.value } : x)),
                      )
                    }
                    className="min-h-8 w-24 rounded-lg border border-ink-200 bg-white dark:bg-cream-50 px-1.5 text-xs text-ink-900 focus:border-brand-500 focus:ring-brand-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <span className="text-ink-500">a</span>
                  <input
                    type="time"
                    aria-label={`Hora de cierre ${DAY_NAMES[h.day]}`}
                    value={h.closes ?? '18:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, closes: e.target.value } : x)),
                      )
                    }
                    className="min-h-8 w-24 rounded-lg border border-ink-200 bg-white dark:bg-cream-50 px-1.5 text-xs text-ink-900 focus:border-brand-500 focus:ring-brand-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              ) : (
                <span className="text-xs text-ink-400 italic">No atiende este día</span>
              )}
            </li>
          ))}
        </ul>
      </SeccionFicha>

      {serverError && (
        <p role="alert" className="text-sm text-rose-700">
          {serverError}
        </p>
      )}

      <div className="rounded-xl border border-ink-200 bg-cream-50 p-3.5 space-y-1.5 text-xs text-ink-600">
        <p className="flex items-center gap-1.5 font-semibold text-ink-800">
          <UI_ICONS.shieldCheck size={16} className="text-brand-700 shrink-0" />
          Aviso de publicación y protección de datos
        </p>
        <p>
          Al guardar este negocio, autorizas que el nombre del oficio, fotos y número de WhatsApp se
          muestren públicamente en el directorio conforme a nuestra{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline font-medium">
            Política de Privacidad
          </Link>{' '}
          y los{' '}
          <Link to="/terminos" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline font-medium">
            Términos de Uso
          </Link>
          . Tu dirección residencial exacta nunca se expone en mapas públicos.
        </p>
        {profile?.account_type === 'facilitador' && (
          <p className="pt-1 text-ink-800 font-medium">
            Como facilitador, declaras bajo la gravedad de juramento que cuentas con la autorización
            expresa del titular del oficio para publicar su información en ConectaComuna.
          </p>
        )}
      </div>

      {/*
        Los dos botones en FILA también en el celular.
        Apilados medían 122 px y, con el menú inferior de 57, tapaban casi una
        cuarta parte de una pantalla de 812: la persona escribía en un campo
        que la barra le estaba cubriendo. En fila bajan a unos 60.

        "Guardar" se lleva el ancho y "Cancelar" solo el suyo, para que la
        acción que la gente busca sea la grande.
      */}
      <div className="sticky bottom-20 flex flex-row items-center gap-2 bg-white/95 dark:bg-cream-50/95 p-3 rounded-2xl border border-ink-200 shadow-md backdrop-blur-xs">
        <Button type="submit" fullWidth loading={isSubmitting}>
          Guardar negocio
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/panel')}
          disabled={isSubmitting}
          className="shrink-0"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
