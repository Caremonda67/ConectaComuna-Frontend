import { Link } from 'react-router-dom'
import { UI_ICONS } from '@/components/ui/icons'

export default function TermsPage() {
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
            <UI_ICONS.fileText size={14} className="text-ink-600" />
            Marco legal y condiciones de uso
          </span>
          <span className="text-xs text-ink-500">Vigente desde septiembre de 2026 · Colombia</span>
        </div>

        <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl leading-tight">
          Términos y Condiciones de Uso
        </h1>
        <p className="max-w-3xl text-sm sm:text-base text-ink-600 leading-relaxed">
          Bienvenido a ConectaComuna. Antes de navegar, registrarte o publicar un oficio en la
          plataforma, lee atentamente estos términos. Al utilizar nuestros servicios, aceptas
          cumplir las presentes condiciones.
        </p>
      </header>

      {/* Aviso destacado de portal de contacto */}
      <div className="card p-5 border-brand-200 dark:border-brand-800/60 bg-brand-50/60 dark:bg-brand-950/30 space-y-2">
        <div className="flex items-center gap-2 text-brand-900 dark:text-brand-300 font-bold text-sm sm:text-base">
          <UI_ICONS.shieldCheck size={20} className="text-brand-700 dark:text-brand-400 shrink-0" />
          <span>Aviso legal prioritario: Portal de Contacto Comunitario</span>
        </div>
        <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
          Conforme al <strong>Artículo 53 de la Ley 1480 de 2011 (Estatuto del Consumidor de Colombia)</strong>,
          ConectaComuna actúa de manera exclusiva como un <strong>portal digital de contacto e información comunitaria</strong>.
          La plataforma facilita el encuentro entre vecinos que ofrecen oficios y vecinos que los
          requieren. ConectaComuna no presta directamente los servicios exhibidos, no vende productos,
          no fija tarifas y no forma parte de la relación contractual, civil o comercial que se
          acuerde entre las partes.
        </p>
      </div>

      {/* Cláusulas */}
      <div className="space-y-6 text-xs sm:text-sm text-ink-700 leading-relaxed">
        {/* 1 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              1
            </span>
            Objeto de la plataforma y gratuidad
          </h2>
          <p>
            ConectaComuna es un directorio web local cuyo propósito es visibilizar micro-oficios,
            artesanías y servicios de barrio en la comuna (Cali, Colombia), facilitando la inclusión
            de personas con baja alfabetización digital.
          </p>
          <p>
            El uso del directorio para consultar oficios, buscar números de contacto y publicar
            fichas básicas es <strong>completamente gratuito</strong>. ConectaComuna <strong>no cobra
            comisiones</strong> porcentuales sobre los trabajos realizados ni retiene porcentaje alguno
            del dinero pactado entre cliente y trabajador.
          </p>
        </section>

        {/* 2 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              2
            </span>
            Autonomía de los emprendedores y deslinde de responsabilidad
          </h2>
          <p>
            Cada emprendedor, artesano o prestador de servicio registrado en ConectaComuna actúa de
            manera <strong>100% independiente y autónoma</strong>. No existe subordinación laboral,
            sociedad, mandato, agencia comercial ni relación de dependencia entre ConectaComuna y
            quienes publican sus oficios (en los términos del Código Sustantivo del Trabajo de
            Colombia).
          </p>
          <p>
            En consecuencia, en aplicación de las normas de <strong>responsabilidad civil del Código
            Civil Colombiano</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-600">
            <li>
              Los precios, plazos de entrega, garantías, métodos de pago y condiciones técnicas del
              trabajo son acordados libre y directamente entre el cliente y el prestador por canales
              externos (WhatsApp, llamada telefónica o acuerdo presencial).
            </li>
            <li>
              ConectaComuna <strong>no garantiza ni se hace responsable</strong> por la idoneidad,
              calidad, puntualidad, daños a materiales, pérdidas económicas, extravíos, accidentes en
              visitas domiciliarias o fallas técnicas derivadas de los trabajos convenidos.
            </li>
            <li>
              Recomendamos expresamente a ambas partes guiarse por las pautas del{' '}
              <Link to="/trato-seguro" className="text-brand-700 font-semibold underline">
                Trato Seguro Comunal
              </Link>
              , especialmente acordar el pago contra entrega y dejar los presupuestos por escrito.
            </li>
          </ul>
        </section>

        {/* 3 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              3
            </span>
            Capacidad legal y registro de usuarios
          </h2>
          <p>
            Para registrar una cuenta como cliente o para publicar un negocio en ConectaComuna, el
            usuario debe ser mayor de dieciocho (18) años y tener plena capacidad legal conforme a las
            leyes colombianas. Al registrarse, el usuario garantiza la autenticidad y exactitud de
            los datos suministrados (nombre real, celular de contacto y ubicación aproximada).
          </p>
          <p>
            El usuario es el único responsable de custodiar la confidencialidad de su contraseña y
            de toda actividad realizada a través de su cuenta.
          </p>
        </section>

        {/* 4 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              4
            </span>
            Régimen especial para Facilitadores Comunitarios
          </h2>
          <p>
            La plataforma incluye la figura del <strong>Facilitador</strong> para apoyar a adultos
            mayores o personas con barreras tecnológicas en la apertura y gestión de su catálogo
            digital.
          </p>
          <p>
            Al registrar o editar el perfil de un emprendedor, el Facilitador declara bajo la
            gravedad de juramento que cuenta con la <strong>autorización previa, expresa e informada
            (verbal o por escrito)</strong> del titular del oficio para suministrar su nombre, número
            telefónico de WhatsApp, fotografías del taller y ubicación general. El Facilitador se
            compromete a obrar con lealtad y sin ánimo de lucro indebido sobre el titular.
          </p>
        </section>

        {/* 5 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              5
            </span>
            Contenido subido por usuarios y propiedad intelectual
          </h2>
          <p>
            El usuario que cargue fotografías, textos descriptivos o logotipos garantiza que es el
            autor de los mismos o que cuenta con la debida autorización de sus titulares conforme a
            la <strong>Ley 23 de 1982 de Derechos de Autor</strong> y la Decisión Andina 351.
          </p>
          <p>
            Al subir contenido a ConectaComuna, el usuario concede a la plataforma una licencia no
            exclusiva, gratuita y de ámbito territorial para almacenar, adaptar al tamaño de pantalla
            y exhibir dicho contenido dentro del directorio con el único fin de promocionar su oficio.
          </p>
          <p>
            <strong>Mecanismo de notificación y retiro:</strong> Si cualquier persona considera que
            una fotografía o publicación vulnera derechos de autor o de imagen, puede notificarlo a
            través de los canales de contacto de la plataforma para su retiro preventivo inmediato.
          </p>
        </section>

        {/* 6 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              6
            </span>
            Conductas prohibidas y convivencia comunitaria
          </h2>
          <p>Está estrictamente prohibido en ConectaComuna:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-600">
            <li>Ofrecer servicios o productos ilícitos, armas, pólvora o sustancias controladas.</li>
            <li>Suplantar la identidad de personas, talleres o establecimientos comerciales.</li>
            <li>Publicar contenido engañoso, precios señuelo o fotos falsas de otros negocios.</li>
            <li>
              Realizar actos de acoso, discriminación, extorsión o mensajes denigrantes hacia vecinos
              o clientes.
            </li>
            <li>
              Dejar reseñas falsas, ofensivas o malintencionadas con el propósito de perjudicar la
              honra o clientela de un vecino.
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              7
            </span>
            Moderación, reportes y suspensión de cuentas
          </h2>
          <p>
            ConectaComuna cuenta con herramientas de reporte ciudadano en cada perfil de negocio. El
            equipo administrador se reserva el derecho de revisar, suspender de forma temporal o
            eliminar definitivamente cualquier cuenta, oficio o comentario que incumpla estos
            términos, que acumule quejas fundamentadas de la comunidad o que ponga en riesgo la
            seguridad del barrio.
          </p>
        </section>

        {/* 8 */}
        <section className="card p-6 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold shrink-0">
              8
            </span>
            Legislación aplicable y jurisdicción
          </h2>
          <p>
            Estos Términos y Condiciones se rigen de manera integral por las leyes de la{' '}
            <strong>República de Colombia</strong>. Cualquier diferencia, duda o reclamación que no
            pueda solucionarse mediante diálogo directo o mediación comunitaria será tramitada ante
            las autoridades y jueces competentes de la ciudad de Cali, Valle del Cauca.
          </p>
        </section>
      </div>

      {/* Enlaces de pie */}
      <footer className="card-soft p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-ink-600">
          ¿Tienes inquietudes sobre el tratamiento de tus datos personales?
        </span>
        <div className="flex gap-4 font-semibold text-brand-700">
          <Link to="/privacidad" className="hover:underline">
            Ver Política de Privacidad y Datos →
          </Link>
          <Link to="/trato-seguro" className="hover:underline">
            Ver Trato Seguro Comunal →
          </Link>
        </div>
      </footer>
    </div>
  )
}
