# UTN FRC — Plataforma de Material de Estudio

Plataforma web para que los alumnos de la UTN Facultad Regional Córdoba puedan **compartir y encontrar material de estudio, participar en el foro y armar sus horarios**: resúmenes, parciales y trabajos prácticos, organizados por carrera, año y materia.

---

## ¿Qué hace la aplicación?

- **Búsqueda de material**: filtrás por carrera, año y materia, y ves todos los archivos disponibles. Funciona para todas las ingenierías: Sistemas, Civil, Eléctrica, Electrónica, Industrial, Mecánica, Metalúrgica y Química.
- **Subida de archivos**: los usuarios registrados pueden subir PDFs o imágenes (resúmenes, parciales, TPs). Los archivos se almacenan en Google Drive.
- **Eliminación de archivos propios**: el usuario que subió un archivo puede eliminarlo (se borra también de Google Drive).
- **Sistema de puntuación**: los usuarios logueados pueden puntuar el material con 1 a 5 estrellas. El material se ordena del mejor al peor puntuado.
- **Contador de descargas**: cada vez que alguien descarga un archivo, el contador sube.
- **Foro**: los usuarios pueden publicar posts con etiquetas (Consulta, Información, Debate, Recurso, Examen, Proyecto, Otro). Cada post tiene su hilo de comentarios.
- **Sistema de reportes**: cualquier usuario logueado puede reportar posts, comentarios y archivos. Al alcanzar 3 reportes, el contenido se elimina automáticamente. El reporte se puede quitar si fue un error.
- **Moderadores**: usuarios con rol de moderador pueden eliminar cualquier post, comentario o archivo, independientemente de quién lo subió.
- **Perfil con avatares**: cada usuario tiene una página de perfil con avatar personalizable.
- **Armador de Horarios**: herramienta para armar el horario semanal eligiendo comisiones por materia, detectando conflictos de superposición.
- **Seguridad de contenido**: los posts y comentarios del foro no permiten incluir URLs de dominios no conocidos (ni con protocolo ni como dominio desnudo tipo `link.com`).
- **Login con Google o email/contraseña**: autenticación completa con sesión persistente.

---

## Tecnologías utilizadas

### Frontend
- **Next.js 16** — el framework principal. Permite hacer páginas web con React, con la ventaja de que parte del código corre en el servidor (más rápido y más seguro). Usamos el sistema de carpetas `app/` (App Router).
- **React 19** — la librería de interfaz de usuario. Todo lo que el usuario ve está hecho con componentes de React.
- **TypeScript** — JavaScript con tipos. Ayuda a detectar errores antes de ejecutar el código.
- **Tailwind CSS v4** — librería de estilos. En vez de escribir CSS tradicional, usás clases directamente en el HTML (`className="flex items-center gap-4"`).

### Backend / Base de datos
- **Supabase** — plataforma que nos da base de datos PostgreSQL, autenticación de usuarios y API automática. Es el "backend" principal de la app.
  - Tablas principales: `archivos`, `puntuaciones`, `materia`, `comision`, `ingenieria`, `ComisionMaterias`, `foro_posts`, `foro_comments`, `foro_report`, `foro_comment_report`, `archivo_report`, `moderadores`
  - Vista SQL `archivos_con_rating`: calcula el promedio de estrellas y total de votos en la base de datos directamente.
  - RLS (Row Level Security): reglas en la base de datos que controlan quién puede leer o escribir cada fila.

### Autenticación
- **Supabase Auth** — maneja el registro, login y sesiones de los usuarios.
- **@supabase/ssr** — paquete que permite leer la sesión del usuario tanto en el servidor como en el cliente, usando cookies.
- **Google OAuth** — permite iniciar sesión con una cuenta de Google.

### Almacenamiento de archivos
- **Google Drive API** — los archivos subidos por los usuarios se guardan en una carpeta de Google Drive. Usamos OAuth 2.0 con un refresh token para que la app tenga permiso de escribir y eliminar en ese Drive.
- **googleapis** — el paquete oficial de Node.js para interactuar con las APIs de Google.

---

## Arquitectura general (cómo está organizado el código)

```
utn-frc-app/
├── app/
│   ├── actions/              # Server Actions: código que corre en el servidor
│   │   ├── auth.ts           # Login, registro, logout
│   │   ├── archivos.ts       # Puntuar archivos, incrementar descargas
│   │   ├── reportar.ts       # Reportar/quitar reporte de posts y comentarios del foro
│   │   └── moderador.ts      # Verificar moderador, eliminar posts/comentarios como mod
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts      # Endpoint POST para subir archivos a Drive + Supabase
│   │   ├── delete-archivo/
│   │   │   └── route.ts      # DELETE: el dueño elimina su propio archivo (Drive + DB)
│   │   ├── report-archivo/
│   │   │   └── route.ts      # POST/DELETE: reportar o quitar reporte de un archivo
│   │   └── mod-archivo/
│   │       └── route.ts      # DELETE: moderador elimina cualquier archivo (Drive + DB)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # Maneja el redirect de Google OAuth
│   ├── components/
│   │   ├── Navbar/           # Barra de navegación (con login/logout y link a subir)
│   │   ├── SearchButton/     # Hero de la página principal con botón de búsqueda
│   │   ├── SearchModal/      # Modal con filtros cascada: Carrera → Año → Materia
│   │   └── StarRating/       # Componente de estrellas interactivo
│   ├── lib/
│   │   ├── googleDrive.ts    # Lógica para subir y eliminar archivos en Google Drive (solo servidor)
│   │   ├── driveUrls.ts      # Funciones para generar URLs de Drive (cliente y servidor)
│   │   ├── contentSecurity.ts# Validación de URLs: lista blanca de dominios permitidos en el foro
│   │   └── supabase/
│   │       ├── client.ts     # Cliente Supabase para el navegador
│   │       └── server.ts     # Cliente Supabase para el servidor (con cookies)
│   ├── foro/                 # Foro de discusión
│   │   ├── page.tsx          # Lista de posts con filtros por etiqueta
│   │   ├── [id]/page.tsx     # Detalle de un post + hilo de comentarios
│   │   ├── formForo.tsx      # Formulario para crear un nuevo post
│   │   ├── FiltroPanel.tsx   # Panel de filtros por etiqueta
│   │   └── foro.css          # Estilos específicos del foro
│   ├── login/                # Página de login (email/password + Google)
│   ├── upload/               # Página para subir material (requiere login)
│   ├── resultados/           # Página de resultados por materia
│   │   ├── page.tsx          # Server component: carga archivos y pasa esModerador
│   │   ├── ResultadosList.tsx# Lista de ArchivoCards con filtro por tipo
│   │   └── ArchivoCard.tsx   # Card de cada archivo: ver, descargar, puntuar, reportar, eliminar
│   ├── perfil/               # Página de perfil de usuario con avatar
│   ├── armadorHorarios/      # Herramienta para armar horario semanal por comisiones
│   ├── layout.tsx            # Layout raíz: incluye el Navbar en todas las páginas
│   └── page.tsx              # Página de inicio
├── proxy.ts                  # Equivalente al middleware (Next.js 16): protege rutas y refresca sesión
├── .env.local                # Variables de entorno secretas (NO se sube al repositorio)
└── CLAUDE.md / AGENTS.md     # Instrucciones para agentes de IA sobre el proyecto
```

---

## Conceptos clave para explicar en una entrevista

### ¿Qué es un Server Component vs Client Component?
En Next.js 16, los componentes pueden correr en el **servidor** o en el **navegador**:
- **Server Components** (por defecto): corren en el servidor, pueden acceder a la base de datos directamente, no tienen estado ni eventos del usuario.
- **Client Components** (`'use client'` al principio del archivo): corren en el navegador, pueden usar `useState`, `useEffect`, manejar clicks, etc.

Usamos esta distinción para, por ejemplo, leer la sesión del usuario en el servidor antes de mostrar la página, y manejar la interactividad de los formularios en el cliente.

### ¿Qué es una Server Action?
Son funciones que se ejecutan en el servidor pero se pueden llamar desde el cliente (desde un formulario o un botón). Por ejemplo, cuando el usuario hace click en una estrella para puntuar, el componente React llama a `puntuarArchivo()` que corre en el servidor y escribe en la base de datos. No necesitamos crear un endpoint API manualmente.

### ¿Por qué usamos Route Handlers para algunas operaciones?
La subida y eliminación de archivos en Google Drive usa `googleapis`, que necesita módulos de Node.js que no existen en el navegador. También usamos Route Handlers para las operaciones de reporte y moderación de archivos, ya que permiten recibir requests HTTP desde el cliente con una interfaz REST clara.

### ¿Cómo funciona el sistema de reportes?
Cada reporte se guarda en una tabla (`foro_report`, `foro_comment_report`, `archivo_report`). Al insertar un nuevo reporte, se cuenta el total para ese contenido. Si llega a 3, el contenido se elimina automáticamente — incluyendo el archivo de Google Drive si aplica. El reporte es reversible: el usuario puede quitar su propio reporte con el mismo botón.

### ¿Cómo funcionan los moderadores?
Existe una tabla `moderadores` en la base de datos con una sola columna: `user_id`. Los usuarios designados como moderadores se agregan directamente desde el panel de Supabase. La app consulta esa tabla al cargar para saber si el usuario actual es moderador, y muestra botones de eliminación adicionales en posts, comentarios y archivos ajenos. Toda verificación de permisos se hace server-side.

### ¿Qué es RLS (Row Level Security)?
Es una funcionalidad de PostgreSQL (la base de datos de Supabase) que permite definir reglas de acceso a nivel de fila. Por ejemplo: "cualquiera puede leer archivos, pero solo el dueño puede borrarlos". Esto es importante porque el cliente accede directamente a la base de datos con la `anon key`, y sin RLS cualquiera podría borrar datos de otros.

### ¿Qué es OAuth 2.0 y por qué usamos un refresh token?
OAuth es un protocolo que permite que una aplicación actúe en nombre de un usuario sin necesidad de su contraseña. Para Google Drive, obtuvimos un `refresh_token` una sola vez (a través del OAuth Playground), y la app lo usa para pedir tokens de acceso nuevos cada vez que necesita subir o eliminar un archivo.

### ¿Por qué Google Drive y no Supabase Storage?
Supabase en su plan gratuito da 500 MB de almacenamiento. Para una plataforma donde muchos alumnos suben PDFs, eso se llena rápido. Google Drive con una cuenta de Gmail da 15 GB gratis, lo que es mucho más razonable para empezar.

### ¿Qué es proxy.ts? (antes middleware.ts)
En Next.js 16, el archivo `middleware.ts` fue renombrado a `proxy.ts`. Este archivo corre **antes** de que se cargue cualquier página y nos permite:
1. Refrescar la sesión de Supabase en cada request (para que las cookies estén siempre actualizadas).
2. Proteger rutas: si alguien intenta ir a `/upload` sin estar logueado, lo redirigimos a `/login`.

### ¿Cómo se filtra contenido inseguro en el foro?
`app/lib/contentSecurity.ts` mantiene una lista blanca de dominios permitidos (YouTube, GitHub, etc.). Antes de publicar un post o comentario, se extraen todas las URLs del texto — tanto las que tienen protocolo (`https://`) como los dominios desnudos (`link.com`, `www.algo.com`) — y se verifica que cada una pertenezca a un dominio permitido. Si hay URLs no permitidas, la publicación es rechazada con un mensaje de error.

---

## Flujo completo de uso

```
1. El usuario entra a la app → ve la página principal con el buscador

2. Para BUSCAR material:
   → Click en "Buscar material"
   → Selecciona Carrera → Año → Materia (disponible para todas las ingenierías)
   → Click "Buscar"
   → Va a /resultados?materia_id=X
   → Ve los archivos ordenados por rating
   → Puede filtrar por tipo (Resumen/Parcial/TP)
   → Puede ver el archivo en Drive o descargarlo

3. Para SUBIR (requiere login):
   → Click en "Subir material" en el navbar
   → Si no está logueado → redirige a /login
   → Se loguea con Google o email/contraseña
   → Completa el formulario: Carrera, Año, Materia, Tipo, Nombre, Archivo
   → El archivo se sube a Google Drive
   → Los metadatos se guardan en Supabase
   → Redirige a los resultados de esa materia

4. Para PUNTUAR (requiere login):
   → En la página de resultados, hace click en las estrellas
   → Se guarda la puntuación en la base de datos
   → El promedio se actualiza

5. Para usar el FORO:
   → Va a /foro
   → Ve los posts filtrados por etiqueta (Consulta, Info, Debate, etc.)
   → Puede entrar a un post para leer los comentarios y responder
   → Si está logueado puede crear posts y comentarios
   → Puede reportar contenido inapropiado (3 reportes → eliminación automática)

6. Para ARMAR HORARIO:
   → Va a /armadorHorarios
   → Selecciona carrera y materias
   → Elige entre las comisiones disponibles para cada materia
   → La herramienta detecta superposiciones de horarios
```

---

## Variables de entorno necesarias

El archivo `.env.local` (que **nunca se sube al repositorio**) debe tener:

```
NEXT_PUBLIC_SUPABASE_URL=        # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Clave pública de Supabase
GOOGLE_CLIENT_ID=                # ID de cliente OAuth de Google Cloud
GOOGLE_CLIENT_SECRET=            # Secreto del cliente OAuth
GOOGLE_REFRESH_TOKEN=            # Refresh token obtenido via OAuth Playground
GOOGLE_DRIVE_FOLDER_ID=          # ID de la carpeta de Google Drive
```

Las variables que empiezan con `NEXT_PUBLIC_` son visibles en el navegador. Las demás solo existen en el servidor.

---

## Cómo correr el proyecto localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env.local con las variables de arriba

# 3. Correr el servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
http://localhost:3000
```

---

## Stack resumido para la entrevista

| Categoría | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL via Supabase |
| Autenticación | Supabase Auth + Google OAuth |
| Almacenamiento | Google Drive API |
| Hosting (futuro) | Vercel (compatible con Next.js) |
