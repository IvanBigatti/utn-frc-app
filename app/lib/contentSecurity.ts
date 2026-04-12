const TRUSTED_DOMAINS = [
  // UTN
  'utn.edu.ar',
  'frro.utn.edu.ar',
  'frc.utn.edu.ar',
  'frba.utn.edu.ar',
  'frh.utn.edu.ar',
  // Google
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'classroom.google.com',
  // Video
  'youtube.com',
  'youtu.be',
  // Código y documentación
  'github.com',
  'gist.github.com',
  'stackoverflow.com',
  'stackexchange.com',
  // Enciclopedias y referencia
  'wikipedia.org',
  'wolframalpha.com',
  // Publicaciones académicas
  'arxiv.org',
  'researchgate.net',
  'scholar.google.com',
  // Otros útiles para estudiantes
  'overleaf.com',
  'desmos.com',
  'geogebra.org',
];

const URL_REGEX = /https?:\/\/[^\s\])"'>]+/gi;

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_REGEX)].map((m) => m[0]);
}

export function isTrustedUrl(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr);
    return TRUSTED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

export function findUntrustedUrls(text: string): string[] {
  return extractUrls(text).filter((u) => !isTrustedUrl(u));
}
