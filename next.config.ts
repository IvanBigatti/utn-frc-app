import type { NextConfig } from "next";

// El Content-Security-Policy NO vive acá: se arma por request en `proxy.ts`,
// porque necesita un nonce nuevo en cada respuesta. Definirlo también acá
// mandaría DOS headers CSP y el navegador aplicaría la intersección de ambos,
// que es más restrictiva que cualquiera de los dos por separado.
//
// Acá quedan sólo los headers estáticos, que además llegan a las rutas que el
// matcher de `proxy.ts` excluye (assets de `_next/static`, imágenes, favicon).
const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '25mb',
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Redundante con `frame-ancestors 'none'` del CSP, pero lo entienden
          // navegadores viejos que ignoran esa directiva.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          // Only sent over HTTPS; max-age 1 year, include subdomains.
          // Sin `preload`: sumarse a la lista de precarga es difícil de revertir
          // y obliga a servir por HTTPS todos los subdominios para siempre.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Aísla el browsing context: nada que abramos ni que nos abra queda
          // con referencia a nuestra window. Se puede usar `same-origin` (y no
          // `same-origin-allow-popups`) porque el login con Google es por
          // REDIRECT, no por popup — ver `signInWithOAuth` en
          // app/actions/auth.ts, que pasa `redirectTo`. No hay `window.opener`
          // del que dependa nadie.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Evita que otros orígenes embeban nuestros recursos.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
