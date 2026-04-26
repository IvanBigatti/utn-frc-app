import type { Metadata } from 'next'
import './terminos.css'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — UTN FRC',
}

export default function TerminosPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">

        <header className="legal-header">
          <h1>Términos y Condiciones</h1>
          <p className="legal-updated">Última actualización: abril de 2026</p>
        </header>

        <section>
          <h2>1. Aceptación</h2>
          <p>
            Al crear una cuenta o usar esta plataforma, aceptás estos Términos y Condiciones en su
            totalidad. Si no estás de acuerdo, no podés usar el servicio.
          </p>
        </section>

        <section>
          <h2>2. Quién puede usar la plataforma</h2>
          <p>
            Esta plataforma está destinada exclusivamente a estudiantes y docentes universitarios.
            El registro requiere un email de un proveedor reconocido (Gmail, Outlook, Hotmail,
            Yahoo, iCloud, ProtonMail) o de dominio institucional UTN (<code>frc.utn.edu.ar</code>,{' '}
            <code>utn.edu.ar</code>). Podés crear una sola cuenta por email.
          </p>
        </section>

        <section>
          <h2>3. Uso del foro</h2>
          <p>Al publicar en el foro, te comprometés a:</p>
          <ul>
            <li>No publicar contenido ofensivo, discriminatorio o acosador.</li>
            <li>No compartir material protegido por derechos de autor sin autorización.</li>
            <li>No publicar datos personales de terceros sin su consentimiento.</li>
            <li>No usar el foro para publicidad, spam o contenido irrelevante a la comunidad universitaria.</li>
            <li>Respetar a los demás usuarios y a los moderadores.</li>
          </ul>
        </section>

        <section>
          <h2>4. Archivos subidos</h2>
          <p>
            Sos responsable del contenido que subís a la plataforma. Al subir un archivo, declarás
            que tenés los derechos necesarios para compartirlo y que su distribución no viola
            derechos de terceros. La plataforma actúa como intermediaria de almacenamiento y no
            se hace responsable por el contenido subido por los usuarios.
          </p>
          <p>
            Los archivos se almacenan en Google Drive con acceso público mediante enlace. La
            plataforma puede eliminar archivos que reciban reportes válidos o que violen estas
            condiciones.
          </p>
        </section>

        <section>
          <h2>5. Moderación y sanciones</h2>
          <p>
            La plataforma cuenta con moderadores que pueden eliminar publicaciones, comentarios
            o archivos que violen estas condiciones. En casos graves o reiterados, una cuenta puede
            ser suspendida temporalmente o permanentemente. Si tu cuenta fue suspendida y creés
            que fue un error, podés contactarnos para solicitar una revisión.
          </p>
        </section>

        <section>
          <h2>6. Propiedad intelectual</h2>
          <p>
            El contenido que publiques en el foro o subas como archivo sigue siendo tuyo.
            Al publicarlo en esta plataforma, nos otorgás una licencia no exclusiva para mostrarlo
            a los demás usuarios dentro de la plataforma. No vendemos ni cedemos tu contenido a terceros.
          </p>
        </section>

        <section>
          <h2>7. Limitación de responsabilidad</h2>
          <p>
            La plataforma se provee tal como está, sin garantías de disponibilidad continua.
            No somos responsables por pérdida de datos, contenido incorrecto publicado por usuarios,
            o interrupciones del servicio. Los archivos y publicaciones son aportados por la
            comunidad y no han sido verificados por el equipo de la plataforma.
          </p>
        </section>

        <section>
          <h2>8. Cambios en los términos</h2>
          <p>
            Podemos actualizar estos términos en cualquier momento. Te notificaremos si los cambios
            son significativos. Continuar usando la plataforma después de la actualización implica
            aceptar los nuevos términos.
          </p>
        </section>

        <section>
          <h2>9. Contacto</h2>
          <p>
            Para consultas sobre estos términos, escribinos a{' '}
            <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>, o a{' '}
            <a href="mailto:adolfope04@gmail.com">adolfope04@gmail.com</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
