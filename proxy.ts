import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Arma el CSP de la respuesta con un nonce nuevo.
 *
 * script-src: el nonce + `strict-dynamic` reemplazan al viejo `unsafe-inline`.
 *   Next le pone el nonce solo a sus propios scripts (runtime, bundles de
 *   página, inline que genera él). El código de la app no tiene ni un
 *   `<script>` ni un `dangerouslySetInnerHTML`, así que no hay nada más que
 *   marcar a mano.
 *   `unsafe-inline` queda como fallback para navegadores sin soporte de nonce:
 *   los que sí lo soportan lo IGNORAN cuando hay un nonce presente. Es el
 *   patrón "strict CSP" estándar, no una contradicción.
 *   `unsafe-eval` sólo en dev: React lo usa para reconstruir stacks de error.
 *
 * style-src: acá NO va nonce, a propósito. Si se pusiera, el navegador
 *   ignoraría `unsafe-inline` para estilos y se caerían todos los
 *   `style={{...}}` del armador de horarios, que en SSR salen como atributo
 *   `style="..."` en el HTML. `unsafe-inline` en ESTILOS es mucho menos grave
 *   que en scripts: no permite ejecutar código.
 *
 * connect-src: sólo dominios que toca el NAVEGADOR. VirusTotal no está porque
 *   se llama desde `app/api/upload/route.ts`, que es un Route Handler y corre
 *   en el servidor. Los de Google quedan por precaución: el redirect de OAuth
 *   es una navegación (no la gobierna connect-src), pero no verificamos qué
 *   hace `signInWithOAuth` por dentro antes de redirigir.
 *
 * img-src: se sacó `lh3.googleusercontent.com`, redundante con
 *   `*.googleusercontent.com`.
 *   `github.com` y `avatars.githubusercontent.com` QUEDAN: los usa
 *   `app/components/TeamFooter/TeamFooter.tsx`, que arma los avatares del
 *   equipo como `https://github.com/USUARIO.png?size=200`. Esa URL redirige a
 *   `avatars.githubusercontent.com`, así que hacen falta las dos.
 */
function buildCsp(nonce: string, esHttps: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: *.supabase.co *.google.com *.googleusercontent.com api.dicebear.com github.com avatars.githubusercontent.com",
    "font-src 'self'",
    "connect-src 'self' *.supabase.co accounts.google.com www.googleapis.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Sólo cuando el request YA vino por https, que es el único caso donde la
    // directiva hace algo: sobre https no queda nada http que subir salvo un
    // subrecurso mal escrito, y ahí es justamente donde protege.
    //
    // No alcanza con excluir dev. Sobre http la directiva reescribe la
    // navegación misma: probando el build de producción con `npm start` en
    // http://localhost, Chrome mandaba http://localhost:3000/login a
    // https://localhost:3000/login y moría con ERR_SSL_PROTOCOL_ERROR.
    ...(esHttps ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

/**
 * Detecta si el request llegó por HTTPS. Detrás de un proxy que termina TLS
 * (Vercel, nginx) el server habla http, así que manda `x-forwarded-proto`.
 */
function vinoPorHttps(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim() === 'https'
  return request.nextUrl.protocol === 'https:'
}

/**
 * Headers de request que ve el render. Next lee el nonce de acá para
 * inyectarlo en sus scripts.
 *
 * Se reconstruye desde `request.headers` cada vez que se llama, y no se cachea,
 * porque `request.cookies.set()` muta el header `cookie`: si clonáramos una
 * sola vez al principio, las cookies que refresca Supabase quedarían viejas.
 */
function requestHeadersConNonce(request: NextRequest, nonce: string, csp: string): Headers {
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  return headers
}

function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    const parsed = new URL(raw, 'http://localhost')
    return parsed.pathname === raw ? raw : '/'
  } catch {
    return '/'
  }
}

const PROTECTED_ROUTES = [
  '/upload',
  '/perfil',
  '/progreso',
  '/mod',
]

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, vinoPorHttps(request))

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeadersConNonce(request, nonce, csp) },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeadersConNonce(request, nonce, csp) },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión — no borrar esto
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Los redirects también salen con CSP: son documentos que el navegador
  // renderiza si la respuesta llegara a tener cuerpo.
  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url)
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  if (user && pathname !== '/baneado' && pathname !== '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_banned) {
      const url = request.nextUrl.clone()
      url.pathname = '/baneado'
      url.search = ''
      return redirectTo(url)
    }
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectTo(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    const rawNext = request.nextUrl.searchParams.get('next')
    url.pathname = safeNextPath(rawNext)
    url.search = ''
    return redirectTo(url)
  }

  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
