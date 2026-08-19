// LAS RELACIONES QUE SALEN DE LA ARITMÉTICA, NO DEL MODELO.
//
// El Analista produce prosa: *"cuando te rodeás de gente, tu ánimo suele estar
// entre bien y genial"*. Está bien que exista, pero tiene dos problemas que
// ninguna cantidad de prompt arregla: **no se puede auditar** (no hay número
// atrás que se pueda mirar) y **no se puede validar** (no se le puede correr un
// chequeo de sesgos a una frase).
//
// Esto es lo otro: cruces calculados sobre las filas, con el número a la vista y
// pasados por `lib/sesgos` antes de que lleguen a Matías.
//
// ⚠️⚠️ POR QUÉ ESTO ES EL COMPLEMENTO DEL ANALISTA Y NO SU REEMPLAZO. La
// aritmética encuentra lo que se puede contar; el modelo encuentra lo que hay que
// leer. *"Los días que dormís menos de 6 horas tu ánimo baja"* lo saca una
// consulta. *"Las preocupaciones por los trámites te bajan la energía"* no sale
// de ninguna tabla — hay que leer lo que escribió. Los dos escriben en `hechos`,
// y se distinguen por `origen`.
//
// ⚠️ Y ES LO ÚNICO QUE PUEDE PASAR POR EL FILTRO DE SESGOS, que era el objetivo:
// `revisarSesgos` necesita casos con etiqueta y resultado, no frases.

import { moodDe } from '@/lib/animo';
import { revisarSesgos, type Caso } from '@/lib/sesgos';

/** Un check-in de ánimo, con el día y lo que marcó. */
export type CheckinAnimo = {
  dia: string;
  estado: string;
  factores: string[];
};

/** Una noche, en minutos dormidos. */
export type Noche = { dia: string; minutos: number };

export type Relacion = {
  /** La frase que se le muestra. Con el número adentro, siempre. */
  texto: string;
  /** Para poder abrirla y mirar de dónde salió. */
  casos: number;
  deLosCuales: number;
};

/** Un día "bueno" es genial o bien. Es la misma vara que usa `lib/cerebro`. */
export function esBuenDia(estado: string): boolean {
  const v = moodDe(estado)?.valor;
  return v != null && v >= 3;
}

/** Menos de 6 horas: el umbral donde la falta de sueño empieza a notarse. */
export const NOCHE_CORTA_MIN = 6 * 60;

/**
 * ── SUEÑO DE ANOCHE → ÁNIMO DE HOY ──────────────────────────────────────────
 *
 * La relación mejor respaldada que existe y la única fuerte que sus datos ya
 * bancan hoy (24 noches, 41 check-ins).
 *
 * ⚠️⚠️ Y ES LA QUE **PASA EL CHEQUEO DEL MISMO ACTO**, que es lo que la hace
 * valiosa: la noche se registra a la mañana y el ánimo durante el día, en dos
 * momentos distintos. Con los factores del check-in pasa lo contrario —causa y
 * efecto se eligen en la misma pantalla— y por eso ese cruce no puede sostener
 * nada. **Acá el orden temporal es real, no declarado.**
 */
export function suenoVersusAnimo(noches: Noche[], checkins: CheckinAnimo[]): Relacion | null {
  const animoDe = new Map<string, string>();
  for (const c of checkins) if (!animoDe.has(c.dia)) animoDe.set(c.dia, c.estado);

  const casos: Caso[] = [];
  for (const n of noches) {
    // El ánimo del MISMO día que la noche: se registra el sueño a la mañana y el
    // ánimo más tarde, así que el efecto viene después de la causa.
    const estado = animoDe.get(n.dia);
    if (!estado) continue;
    casos.push({
      factores: [n.minutos < NOCHE_CORTA_MIN ? 'noche corta' : 'noche larga'],
      bien: esBuenDia(estado),
      // ⚠️ `false` Y ESTO ES EL PUNTO DE TODO EL ARCHIVO: el sueño y el ánimo se
      // cargan por separado, en dos pantallas y en dos momentos.
      mismoActo: false,
    });
  }

  const v = revisarSesgos('noche corta', casos);
  if (!v.pasa) return null;

  const mal = v.casos - v.deLosCuales;
  return {
    texto: `De las ${v.casos} noches que dormiste menos de 6 horas, ${mal} ${mal === 1 ? 'día' : 'días'} después registraste un ánimo bajo.`,
    casos: v.casos,
    deLosCuales: v.deLosCuales,
  };
}

/**
 * ── ÁNIMO × FACTORES ────────────────────────────────────────────────────────
 *
 * ⚠️⚠️ ESTO CASI SIEMPRE VA A DEVOLVER VACÍO, Y ESTÁ BIEN. El factor y el ánimo
 * se eligen en la misma pantalla, así que `mismoActo` es `true` y el primer
 * chequeo de `revisarSesgos` los rechaza a todos.
 *
 * Existe igual por dos razones:
 *
 * 1. **Para que el rechazo sea explícito y medido**, no un olvido. Si algún día
 *    los factores se registran aparte del ánimo, esta función empieza a devolver
 *    cosas sola y sin tocar nada.
 * 2. Porque devolver el motivo permite **decírselo**: *"esto no te lo puedo
 *    contar porque marcás el factor y el ánimo al mismo tiempo"* es información
 *    sobre cómo registra, y a veces vale más que el hallazgo.
 */
export function animoVersusFactores(
  checkins: CheckinAnimo[],
): { relaciones: Relacion[]; rechazados: { etiqueta: string; motivo: string }[] } {
  const casos: Caso[] = checkins.map((c) => ({
    factores: c.factores,
    bien: esBuenDia(c.estado),
    mismoActo: true, // se eligen juntos, en el check-in
  }));

  const etiquetas = [...new Set(checkins.flatMap((c) => c.factores))];
  const relaciones: Relacion[] = [];
  const rechazados: { etiqueta: string; motivo: string }[] = [];

  for (const etiqueta of etiquetas) {
    const v = revisarSesgos(etiqueta, casos);
    if (v.pasa) {
      relaciones.push({
        texto: `De los ${v.casos} días que marcaste "${etiqueta}", ${v.deLosCuales} los registraste como buenos.`,
        casos: v.casos,
        deLosCuales: v.deLosCuales,
      });
    } else {
      rechazados.push({ etiqueta, motivo: v.motivo });
    }
  }
  return { relaciones, rechazados };
}
