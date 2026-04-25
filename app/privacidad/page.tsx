import type { Metadata } from 'next'
import '../terminos/terminos.css'

export const metadata: Metadata = {
  title: 'Política de Privacidad — UTN FRC',
}

export default function PrivacidadPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">

        <header className="legal-header">
          <h1>Política de Privacidad</h1>
          <p className="legal-updated">Última actualización: abril de 2026</p>
        </header>

        <section>
          <h2>1. Información general</h2>
          <p>
            Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tu información
            personal. Cumplimos con la <strong>Ley 25.326 de Protección de Datos Personales</strong> de
            la República Argentina.
          </p>
        </section>

        <section>
          <h2>2. Datos que recopilamos</h2>
          <p>Al usar la plataforma, recopilamos los siguientes datos:</p>
          <ul>
            <li>
              <strong>Datos de cuenta:</strong> dirección de email y contraseña (almacenada de forma
              segura mediante hash). Si iniciás sesión con Google, recibimos tu email y nombre
              proporcionados por Google.
            </li>
            <li>
              <strong>Perfil:</strong> avatar seleccionado y preferencias de personalización.
            </li>
            <li>
              <strong>Actividad en la plataforma:</strong> publicaciones en el foro, comentarios,
              votos, archivos subidos, calificaciones de archivos y progreso académico registrado.
            </li>
            <li>
              <strong>Archivos:</strong> metadatos de los archivos que subís (nombre, tipo, materia
              asociada). El contenido de los archivos se almacena en Google Drive.
            </li>
          </ul>
          <p>
            <strong>No recopilamos</strong> datos de pago, ubicación geográfica, ni instalamos
            cookies de seguimiento o publicidad de ningún tipo.
          </p>
        </section>

        <section>
          <h2>3. Cómo usamos tus datos</h2>
          <p>Usamos tu información exclusivamente para:</p>
          <ul>
            <li>Autenticarte y mantener tu sesión activa.</li>
            <li>Mostrar tu perfil y actividad dentro de la plataforma.</li>
            <li>Habilitar las funciones del foro, archivos y progreso.</li>
            <li>Prevenir abusos y garantizar la seguridad de la comunidad.</li>
          </ul>
          <p>No vendemos, alquilamos ni compartimos tus datos con terceros con fines comerciales.</p>
        </section>

        <section>
          <h2>4. Servicios de terceros</h2>
          <p>Utilizamos los siguientes servicios externos que procesan datos en tu nombre:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — Base de datos y autenticación. Tus datos se almacenan
              en servidores de Supabase (AWS). Podés consultar su política en{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                supabase.com/privacy
              </a>.
            </li>
            <li>
              <strong>Google Drive</strong> — Almacenamiento de archivos subidos por los usuarios.
              Los archivos quedan accesibles mediante enlace público dentro de la plataforma.
            </li>
            <li>
              <strong>Google OAuth</strong> — Opción de inicio de sesión con tu cuenta de Google.
              Solo recibimos tu email y nombre; nunca accedemos a tu contenido de Google.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Cookies y sesión</h2>
          <p>
            Usamos cookies técnicas necesarias para mantener tu sesión iniciada. No usamos cookies
            de publicidad, analítica de terceros ni seguimiento entre sitios. La sesión se mantiene
            mediante cookies HTTP-only seguras gestionadas por Supabase.
          </p>
        </section>

        <section>
          <h2>6. Retención de datos</h2>
          <p>
            Tus datos se conservan mientras tu cuenta esté activa. Si eliminás tu cuenta, tus datos
            personales serán eliminados de la plataforma en un plazo de 30 días hábiles, excepto
            aquellos que debamos conservar por obligaciones legales o de seguridad.
          </p>
          <p>
            Las publicaciones y archivos que hayas subido pueden permanecer en la plataforma de
            forma anónima o ser eliminados según tu solicitud.
          </p>
        </section>

        <section>
          <h2>7. Tus derechos (Ley 25.326)</h2>
          <p>
            Conforme a la Ley de Protección de Datos Personales de Argentina, tenés derecho a:
          </p>
          <ul>
            <li><strong>Acceder</strong> a los datos personales que tenemos sobre vos.</li>
            <li><strong>Rectificar</strong> datos incorrectos o incompletos.</li>
            <li><strong>Suprimir</strong> tus datos cuando ya no sean necesarios.</li>
            <li><strong>Oponerte</strong> al tratamiento de tus datos en determinadas circunstancias.</li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, contactanos en{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>. Responderemos en
            un plazo máximo de 5 días hábiles.
          </p>
          <p>
            La Dirección Nacional de Protección de Datos Personales es el organismo de control
            competente en Argentina.
          </p>
        </section>

        <section>
          <h2>8. Seguridad</h2>
          <p>
            Implementamos medidas técnicas razonables para proteger tus datos, incluyendo cifrado
            en tránsito (HTTPS), almacenamiento seguro de contraseñas mediante hash, y control de
            acceso basado en roles. Sin embargo, ningún sistema es 100% seguro — si detectás una
            vulnerabilidad, reportála en{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>9. Cambios en esta política</h2>
          <p>
            Si realizamos cambios significativos en esta política, lo notificaremos dentro de la
            plataforma. La fecha de última actualización siempre estará visible al inicio de esta
            página.
          </p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad o para ejercer tus derechos, escribinos a{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
