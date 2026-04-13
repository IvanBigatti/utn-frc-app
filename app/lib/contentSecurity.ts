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

// Bare domains: www.algo.com o algo.com/path (sin protocolo)
const BARE_DOMAIN_REGEX = /(?:^|[\s(])(?:www\.)\S+|(?:^|[\s(])\S+\.(?:com|net|org|io|edu|gov|ar|uy|br|cl|co|info|online|site|app|dev|ai|me|ly|tv|cc|xyz|tech)\b(?:\/\S*)?/gi;

const COMMON_WORDS_WITH_DOTS = new Set(['e.g', 'i.e', 'etc', 'vs', 'no', 'ok']);

export function extractUrls(text: string): string[] {
  const withProtocol = [...text.matchAll(URL_REGEX)].map((m) => m[0]);

  const bare = [...text.matchAll(BARE_DOMAIN_REGEX)]
    .map((m) => m[0].trim())
    .filter((raw) => {
      const lower = raw.toLowerCase().replace(/\.$/, '');
      if (COMMON_WORDS_WITH_DOTS.has(lower)) return false;
      return true;
    })
    .map((raw) => 'https://' + raw.replace(/^https?:\/\//, ''));

  return [...withProtocol, ...bare];
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
