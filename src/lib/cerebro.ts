// "Lo que pasa en el cerebro": leer lo que Matías ya registra y nombrar el
// mecanismo que suele haber detrás. Idea suya, con un objetivo explícito: "que
// el usuario empiece a entender que hay cosas que vienen del cerebro".
//
// ⚠️ LA REGLA QUE ORDENA TODO ESTE ARCHIVO: acá NO se mide nada. No tenemos un
// análisis de sangre. Entonces:
//   - nunca un número, un nivel ni una barra de una hormona;
//   - siempre se dice primero EL DATO SUYO (que sí es real y él lo cargó) y
//     recién después "eso suele…", en condicional;
//   - si no hay evidencia suficiente, la tarjeta NO sale. Preferimos una
//     pantalla vacía a una afirmación inventada.
//
// El otro criterio es el tono de la app: explicar, no retar. Por eso no hay
// lectura para "no marcaste nada" — eso sería culpa disfrazada de biología.

export type IconoCerebro = 'alerta' | 'vinculo' | 'recompensa';

export type LecturaCerebro = {
  id: string;
  icono: IconoCerebro;
  /** El mecanismo, nombrado. Es la parte pedagógica. */
  sustancia: string;
  /** El dato suyo, el que sí está medido. Va primero, siempre. */
  dato: string;
  /** "Eso suele…". En condicional, sin números. */
  suele: string;
  color: string;
  tint: string;
};

export type DatosCerebro = {
  /** Noches de la última semana, en minutos. null = no la cargó. */
  suenos: (number | null)[];
  /** Check-ins recientes, del más nuevo al más viejo. */
  checkins: { estado: string; factores: string[]; palabras: string[] }[];
  /** Días con al menos una actividad marcada, dentro de los últimos 7. */
  diasMarcados: number;
};

const SOCIALES = ['Familia', 'Pareja', 'Amigos'];
const TENSAS = ['Estresado', 'Ansioso'];
const BUENOS = ['genial', 'bien'];

/** Menos de 6 horas: el umbral donde la falta de sueño empieza a notarse. */
const NOCHE_CORTA_MIN = 6 * 60;

function plural(n: number, sing: string, pl: string): string {
  return n === 1 ? sing : pl;
}

/**
 * Las lecturas que la evidencia de verdad banca. Puede devolver [] y está bien:
 * la tarjeta se esconde sola hasta que haya con qué.
 */
export function lecturasCerebro(d: DatosCerebro): LecturaCerebro[] {
  const out: LecturaCerebro[] = [];

  // ── Cortisol: el cuerpo en alerta ───────────────────────────────────────
  // Dos evidencias posibles. El sueño gana porque es un número que él cargó;
  // las palabras son su interpretación. Nunca salen las dos: es el mismo tema.
  const cargadas = d.suenos.filter((m): m is number => m != null);
  const cortas = cargadas.filter((m) => m < NOCHE_CORTA_MIN).length;
  const tensas = d.checkins.filter((c) => c.palabras.some((p) => TENSAS.includes(p))).length;

  if (cortas >= 3) {
    out.push({
      id: 'cortisol-sueno',
      icono: 'alerta',
      sustancia: 'Cortisol',
      dato: `Dormiste menos de 6 horas ${cortas} de las últimas ${cargadas.length} ${plural(cargadas.length, 'noche que anotaste', 'noches que anotaste')}.`,
      suele:
        'Varias noches cortas seguidas suelen mantener el cortisol alto: el cuerpo se queda en modo alerta y las cosas irritan más rápido. No es carácter, y afloja cuando el descanso vuelve.',
      color: '#b5762a',
      tint: '#faf0dd',
    });
  } else if (tensas >= 3) {
    out.push({
      id: 'cortisol-palabras',
      icono: 'alerta',
      sustancia: 'Cortisol',
      dato: `Elegiste "estresado" o "ansioso" en ${tensas} de tus últimos check-ins.`,
      suele:
        'Esa sensación suele venir con el cortisol arriba, que es el sistema de alerta del cuerpo. Está pensado para durar minutos, no semanas: por eso cansa tanto cuando no baja.',
      color: '#b5762a',
      tint: '#faf0dd',
    });
  }

  // ── Oxitocina: el vínculo ───────────────────────────────────────────────
  // Solo si el patrón está en SUS datos: días con gente marcados como buenos.
  const socialesBuenos = d.checkins.filter(
    (c) => BUENOS.includes(c.estado) && c.factores.some((f) => SOCIALES.includes(f)),
  ).length;
  if (socialesBuenos >= 2) {
    out.push({
      id: 'oxitocina',
      icono: 'vinculo',
      sustancia: 'Oxitocina',
      dato: `${socialesBuenos} de los días que marcaste como buenos tenían familia, pareja o amigos entre los factores.`,
      suele:
        'El rato con gente que te importa suele mover la oxitocina, que es la que baja la sensación de amenaza. Explica por qué a veces alcanza con una charla y no hace falta resolver nada.',
      color: '#c25571',
      tint: '#fbe7ec',
    });
  }

  // ── Dopamina: cerrar algo ───────────────────────────────────────────────
  if (d.diasMarcados >= 4) {
    out.push({
      id: 'dopamina',
      icono: 'recompensa',
      sustancia: 'Dopamina',
      dato: `Marcaste actividades ${d.diasMarcados} de los últimos 7 días.`,
      suele:
        'Cerrar algo chico y verlo tildado suele soltar dopamina, que no es la del placer sino la de las ganas: empuja a ir por la próxima. Por eso una racha se sostiene sola y cortarla cuesta.',
      color: '#3d9b80',
      tint: '#e3f1ec',
    });
  }

  return out;
}
