import { Link } from 'react-router-dom'
import { UI_ICONS } from '@/components/ui/icons'

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2 sm:py-4">
      {/* Cabecera */}
      <header className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-ink-800 border border-ink-200">
            <UI_ICONS.shieldCheck size={14} className="text-brand-700" />
            Protección de datos y Habeas Data
          </span>
          <span className="text-xs text-ink-500">Ley 1581 de 2012 · Decreto 1377 de 2013</span>
        </div>

        <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl leading-tight">
          Política de Privacidad y Tratamiento de Datos
        </h1>
        <p className="max-w-3xl text-sm sm:text-base text-ink-600 leading-relaxed">
          En ConectaComuna respetamos la privacidad y la tranquilidad de las familias y trabajadores
          de la comuna. En esta política te explicamos de forma transparente qué información
          recolectamos, para qué la usamos, cómo la protegemos y cómo puedes ejercer tus derechos.
        </p>
      </header>

      {/* Regla de oro de privacidad comunal */}
      <div className="card p-5 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2">
        <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm sm:text-base">
          <UI_ICONS.shieldCheck size={20} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>Regla de oro: Tu barrio, nunca tu dirección privada exacta</span>
        </div>
        <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100/90 leading-relaxed">
          Por seguridad de las familias del barrio, ConectaComuna <strong>no expone la dirección exacta
          residencial</strong> (número de manzana, casa o apartamento) en los mapas públicos sin tu
          consentimiento explícito. Mostramos el <strong>barrio</strong> y el sector de referencia
          para que los vecinos sepan que estás cerca, protegiendo en todo momento la intimidad de tu hogar.
        </p>
      </div>

      {/* Articulado de la política */}
      <div className="space-y-6 text-xs sm:text-sm text-ink-700 leading-relaxed">
        {/* 1 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              1
            </span>
            Responsable del tratamiento de tus datos
          </h2>
          <p>
            El responsable del tratamiento de los datos personales recopilados a través de esta
            plataforma es el proyecto <strong>ConectaComuna</strong>, con sede de operación en la
            ciudad de Cali, Colombia.
          </p>
          <p>
            Para cualquier solicitud, rectificación o consulta sobre tus datos personales, puedes
            comunicarte con nosotros a través de:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600">
            <li>
              <strong>Línea de soporte comunitario por WhatsApp:</strong>{' '}
              <a
                href="https://wa.me/573001234567?text=Hola,%20tengo%20una%20consulta%20sobre%20mis%20datos%20en%20ConectaComuna"
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 font-semibold underline"
              >
                +57 300 123 4567
              </a>
            </li>
            <li>
              <strong>Gestión directa:</strong> Desde tu panel de usuario («Mi cuenta») puedes
              actualizar o solicitar la baja de tu información en cualquier momento.
            </li>
          </ul>
        </section>

        {/* 2 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              2
            </span>
            Datos que recolectamos y finalidades específicas
          </h2>
          <p>Recopilamos únicamente los datos necesarios para el funcionamiento del directorio:</p>
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-ink-100 bg-cream-50 p-3.5 space-y-1.5">
              <strong className="block text-ink-900 font-semibold">Datos para crear tu cuenta</strong>
              <p className="text-xs text-ink-600">
                Nombre completo, correo electrónico, contraseña cifrada, teléfono celular y barrio.
              </p>
              <span className="block text-[11px] text-brand-800 font-medium">
                Finalidad: autenticación, seguridad de acceso y recuperación de cuenta.
              </span>
            </div>
            <div className="rounded-xl border border-ink-100 bg-cream-50 p-3.5 space-y-1.5">
              <strong className="block text-ink-900 font-semibold">Datos del perfil de negocio</strong>
              <p className="text-xs text-ink-600">
                Nombre del oficio, descripción de servicios, fotos de trabajos, teléfono público de
                WhatsApp y horario de atención.
              </p>
              <span className="block text-[11px] text-brand-800 font-medium">
                Finalidad: publicación en el directorio web para que vecinos te contacten.
              </span>
            </div>
          </div>
          <p className="pt-2">
            <strong>Cero venta de datos:</strong> ConectaComuna <strong>no comercializa, no alquila ni
            comparte</strong> tus datos personales con empresas de publicidad invasiva, bases de datos
            comerciales ni centrales de riesgo.
          </p>
        </section>

        {/* 3 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              3
            </span>
            Autorización previa y consentimiento informado
          </h2>
          <p>
            Conforme a la <strong>Ley Estatutaria 1581 de 2012</strong>, todo tratamiento de datos
            personales requiere la autorización previa, expresa e informada del titular. Al marcar la
            casilla de registro o guardar un perfil de negocio, el usuario autoriza de manera libre y
            voluntaria el tratamiento de sus datos conforme a esta política.
          </p>
          <p>
            En el caso de <strong>Facilitadores</strong> que registran perfiles de adultos mayores o
            artesanos que no usan celulares inteligentes, el facilitador certifica que cuenta con la
            autorización expresa del titular del oficio para suministrar sus datos.
          </p>
        </section>

        {/* 4 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              4
            </span>
            Tus derechos como titular (Habeas Data)
          </h2>
          <p>Como titular de tus datos personales, la ley colombiana te otorga los siguientes derechos:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-600">
            <li>
              <strong>Conocer:</strong> Solicitar en cualquier momento qué información tuya reposa en
              nuestras bases de datos.
            </li>
            <li>
              <strong>Actualizar y rectificar:</strong> Modificar datos parciales, inexactos,
              incompletos o desactualizados directamente desde tu panel o solicitándolo a soporte.
            </li>
            <li>
              <strong>Suprimir o revocar la autorización:</strong> Pedir el borrado de tu cuenta o
              retirar tu negocio del directorio cuando lo desees.
            </li>
            <li>
              <strong>Presentar quejas:</strong> Ante la Superintendencia de Industria y Comercio
              (SIC) por presuntas infracciones al régimen de protección de datos personales.
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              5
            </span>
            Procedimiento y plazos para peticiones y reclamos (PQR)
          </h2>
          <p>
            Si deseas solicitar la actualización o supresión de tus datos, puedes enviar un mensaje
            indicando tu nombre completo, correo asociado y el motivo de tu solicitud.
          </p>
          <p>
            Conforme al Artículo 15 de la Ley 1581 de 2012, responderemos a tu solicitud en un término
            máximo de <strong>quince (15) días hábiles</strong> contados a partir del día siguiente a la
            recepción de la misma.
          </p>
        </section>

        {/* 6 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0 border border-brand-200">
              6
            </span>
            Seguridad técnica y almacenamiento local
          </h2>
          <p>
            Protegemos la información de los usuarios mediante buenas prácticas de desarrollo web:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-600">
            <li>
              <strong>Seguridad en base de datos:</strong> Empleamos políticas RLS (Row Level
              Security) que aíslan la información privada para que solo el propietario de la cuenta
              pueda modificar sus datos.
            </li>
            <li>
              <strong>Contraseñas seguras:</strong> Las contraseñas se almacenan mediante algoritmos
              de dispersión criptográfica unidireccional (hashing); ningún miembro del equipo de
              ConectaComuna puede ver tu contraseña en texto plano.
            </li>
            <li>
              <strong>Almacenamiento local del navegador (`localStorage`):</strong> Guardamos
              únicamente datos técnicos necesarios para tu experiencia de usuario (el rol activo en
              el que estás navegando y si activaste el botón A+ de lectura cómoda). No utilizamos
              cookies de rastreo publicitario entre sitios web.
            </li>
          </ul>
        </section>
      </div>

      {/* Enlaces de pie */}
      <footer className="card-soft p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-ink-600">
          ¿Deseas consultar las normas de uso de la plataforma?
        </span>
        <div className="flex gap-4 font-semibold text-brand-700">
          <Link to="/terminos" className="hover:underline">
            Ver Términos y Condiciones de Uso →
          </Link>
          <Link to="/trato-seguro" className="hover:underline">
            Ver Trato Seguro Comunal →
          </Link>
        </div>
      </footer>
    </div>
  )
}
