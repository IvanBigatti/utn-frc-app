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
          <h2>1. Información general y responsable del tratamiento</h2>
          <p>
            Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tu información
            personal. Cumplimos con la <strong>Ley 25.326 de Protección de Datos Personales</strong> de
            la República Argentina.
          </p>
          <p>
            El responsable del tratamiento de datos es la plataforma <strong>UTN FRC App</strong>,
            proyecto académico sin personería jurídica, con domicilio de contacto en la ciudad de
            Córdoba, Argentina. Podés contactarnos en{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a> o en{' '}
            <a href="mailto:adolfope04@gmail.com">adolfope04@gmail.com</a>.
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
              <strong>Perfil:</strong> nombre de usuario (username), avatar seleccionado y
              preferencias de personalización.
            </li>
            <li>
              <strong>Actividad en la plataforma:</strong> publicaciones en el foro, comentarios,
              votos emitidos, reportes realizados, archivos subidos, calificaciones de archivos
              y progreso académico registrado.
            </li>
            <li>
              <strong>Archivos:</strong> metadatos de los archivos que subís (nombre, tipo, materia
              asociada). El contenido de los archivos se almacena en Google Drive. Las imágenes
              (JPG/PNG) tienen sus metadatos EXIF eliminados automáticamente antes del almacenamiento
              para proteger tu privacidad.
            </li>
            <li>
              <strong>Registros de moderación:</strong> en caso de sanción, se almacenan datos
              relacionados (motivo del ban, moderador que aplicó la sanción, fecha).
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
            <li>Prevenir abusos, moderar contenido y garantizar la seguridad de la comunidad.</li>
          </ul>
          <p>No vendemos, alquilamos ni compartimos tus datos con terceros con fines comerciales.</p>
        </section>

        <section>
          <h2>4. Servicios de terceros y transferencias internacionales</h2>
          <p>Utilizamos los siguientes servicios externos que procesan datos en tu nombre:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — Base de datos y autenticación. Tus datos se almacenan
              en servidores de Supabase (AWS, EE.UU.). Podés consultar su política en{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                supabase.com/privacy
              </a>.
            </li>
            <li>
              <strong>Google Drive</strong> — Almacenamiento de archivos subidos por los usuarios
              (servidores de Google, EE.UU.). Los archivos quedan accesibles mediante enlace
              público dentro de la plataforma.
            </li>
            <li>
              <strong>Google OAuth</strong> — Opción de inicio de sesión con tu cuenta de Google.
              Solo recibimos tu email y nombre; nunca accedemos a tu contenido de Google.
            </li>
            <li>
              <strong>VirusTotal</strong> — Servicio de análisis de malware (de Alphabet/Google,
              EE.UU.). Todo archivo que subís es enviado a VirusTotal para su análisis antes de
              ser publicado en la plataforma. VirusTotal puede conservar una copia del archivo
              de acuerdo a sus propias políticas. Podés consultar su política en{' '}
              <a href="https://www.virustotal.com/gui/privacy-policy" target="_blank" rel="noopener noreferrer">
                virustotal.com/gui/privacy-policy
              </a>.
            </li>
          </ul>
          <p>
            <strong>Transferencias internacionales:</strong> los servicios mencionados operan desde
            servidores ubicados en los Estados Unidos. Al aceptar esta política y usar la plataforma,
            prestás consentimiento expreso para que tus datos sean transferidos y procesados en
            dicho país, conforme al Art. 12 de la Ley 25.326.
          </p>
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
            Tus datos se conservan mientras tu cuenta esté activa. Si eliminás tu cuenta, <strong>todos
            tus datos personales, publicaciones, comentarios y archivos subidos serán eliminados
            de forma permanente e inmediata</strong>, tanto de nuestra base de datos como de Google Drive.
            Este proceso se completa en el momento de la solicitud o en un plazo máximo de 30 días
            hábiles en caso de demoras técnicas.
          </p>
          <p>
            Podemos conservar datos mínimos por obligaciones legales o de seguridad (por ejemplo,
            registros de sanciones), según lo permita la Ley 25.326.
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
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>, o a{' '}
            <a href="mailto:adolfope04@gmail.com">adolfope04@gmail.com</a>.
          </p>
          <p>
            El organismo de control competente en Argentina es la{' '}
            <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>.
          </p>
        </section>

        <section>
          <h2>8. Seguridad</h2>
          <p>
            Implementamos medidas técnicas razonables para proteger tus datos, incluyendo cifrado
            en tránsito (HTTPS), almacenamiento seguro de contraseñas mediante hash, control de
            acceso basado en roles y análisis de malware en archivos subidos. Sin embargo, ningún
            sistema es 100% seguro — si detectás una vulnerabilidad, reportála en{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>9. Cambios en esta política</h2>
          <p>
            Si realizamos cambios significativos en esta política, lo notificaremos mediante un
            aviso visible dentro de la plataforma. La fecha de última actualización siempre estará
            visible al inicio de esta página.
          </p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad o para ejercer tus derechos, escribinos a{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>, o a{' '}
            <a href="mailto:adolfope04@gmail.com">adolfope04@gmail.com</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
