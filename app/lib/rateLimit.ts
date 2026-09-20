import { createAdminClient } from '@/app/lib/supabase/admin'

/**
 * Limitador de tasa respaldado por Postgres.
 *
 * Se usa la base y no un Redis aparte porque la base ya está al lado del
 * servidor (ambos en us-east-1, ~2ms) y no hay que sumar infraestructura. El
 * incremento es atómico del lado de Postgres, así que dos peticiones en
 * paralelo no pueden colarse por la misma rendija.
 *
 * Va siempre con el cliente admin: la función está revocada para `anon` y
 * `authenticated`, de modo que nadie pueda tocar contadores desde el navegador.
 */

export type Limite = { limite: number; ventanaSegundos: number }

const HORA = 3600
const DIA = 86400

/**
 * Subir material es lo más caro que hace la app: baja hasta 21 MB a memoria,
 * lo manda a Google Drive y escribe en la base. Lo que se agota primero no es
 * el servidor sino la CUOTA DIARIA de la API de Drive, que es compartida: si
 * alguien la quema, nadie más puede subir nada en todo el día.
 *
 * 10 por hora y 30 por día deja cómodo a quien sube los apuntes de un
 * cuatrimestre entero y corta en seco a un script.
 */
export const LIMITES_SUBIDA: Limite[] = [
  { limite: 10, ventanaSegundos: HORA },
  { limite: 30, ventanaSegundos: DIA },
]

/** Reportar es barato, pero en bandada borra archivos ajenos. */
export const LIMITES_REPORTE: Limite[] = [
  { limite: 20, ventanaSegundos: HORA },
  { limite: 60, ventanaSegundos: DIA },
]

export type ResultadoLimite =
  | { permitido: true }
  | { permitido: false; reintentarEnSegundos: number }

/**
 * Consume una unidad de cada límite. Devuelve el primero que se pase.
 *
 * Si la base falla, RECHAZA.
 *
 * El reflejo sería dejar pasar, para que un limitador caído no se convierta en
 * una caída del servicio. Acá no aplica, por dos razones:
 *
 * 1. El limitador vive en la MISMA base que el resto del flujo. Si la consulta
 *    falla, el insert de `archivos` también va a fallar: dejar pasar no salva
 *    la subida, sólo regala trabajo caro (bajar 21 MB, subirlos a Drive) para
 *    que reviente al final.
 * 2. Dejar pasar falla abierto justo cuando más se lo necesita: una avalancha
 *    de peticiones puede saturar la base y hacer que ESTA consulta falle,
 *    desactivando el límite exactamente durante el pico que tenía que frenar.
 *
 * Estas acciones no son camino crítico para leer la app: que subir se corte
 * unos minutos es aceptable, quemar la cuota compartida de Drive no.
 */
export async function consumirLimite(
  accion: string,
  sujeto: string,
  limites: Limite[],
): Promise<ResultadoLimite> {
  const admin = createAdminClient()

  for (const { limite, ventanaSegundos } of limites) {
    const clave = `${accion}:${ventanaSegundos}:${sujeto}`
    const { data, error } = await admin.rpc('consumir_rate_limit', {
      p_clave: clave,
      p_limite: limite,
      p_ventana_segundos: ventanaSegundos,
    })

    if (error) {
      console.error('[rateLimit] no se pudo consultar el límite, se rechaza:', error.message)
      return { permitido: false, reintentarEnSegundos: 60 }
    }

    if (data === false) {
      return { permitido: false, reintentarEnSegundos: ventanaSegundos }
    }
  }

  return { permitido: true }
}

/** Mensaje en castellano, para no filtrar detalles del limitador. */
export function mensajeLimite(reintentarEnSegundos: number): string {
  return reintentarEnSegundos >= 86400
    ? 'Llegaste al límite diario. Probá de nuevo mañana.'
    : 'Estás yendo muy rápido. Esperá un rato y probá de nuevo.'
}

/*
 * Limitación conocida: ventana fija, no deslizante.
 *
 * Los contadores se reinician en múltiplos exactos de la ventana, así que
 * alguien que apunte al borde puede hacer 10 subidas a las HH:59 y otras 10 a
 * las HH+1:00. El techo real en un tramo corto es el doble del nominal.
 *
 * Se acepta a propósito. El objetivo es proteger la cuota diaria de Drive de
 * un bucle descontrolado, y para eso un techo de 60 en lugar de 30 en el peor
 * caso sigue siendo un techo. Una ventana deslizante necesita guardar cada
 * marca de tiempo en vez de un entero: más complejidad y más escrituras para
 * cerrar un hueco acotado.
 *
 * El día arranca a las 00:00 UTC, o sea las 21:00 en Argentina. El cupo diario
 * se renueva a la noche, no a la medianoche local.
 */
