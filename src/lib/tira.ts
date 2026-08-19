// LA TIRA: los días como una línea de tiempo, no como una grilla.
//
// ── Por qué existe (06/08, pedido de Matías) ─────────────────────────────────
// *"Yo sacaría el calendario… calendario tenés en todos lados, para qué vamos a
// hacer un calendario igual que los otros."* La grilla del mes se reemplaza por
// una tira vertical donde el día del centro se ve grande y los de arriba y abajo
// se achican — el pedido C.10, de la maqueta del 06/08.
//
// ⚠️ ESTE ARCHIVO NO DIBUJA NADA, Y ES A PROPÓSITO. Lo que decide qué DICE cada
// renglón —cuál de las ocho cosas del día se lleva el título y cuáles quedan
// resumidas atrás— es una cadena de prioridades, o sea exactamente el tipo de
// regla que se rompe callada al agregarle un caso. Adentro del JSX no se podría
// testear. Es la misma razón por la que `adivinarIconoObjetivo` vive en
// `objetivos-iconos.ts` y no adentro de la tarjeta.

import { categoriasDia, type Categoria, type DetalleDia } from '@/lib/dia';
import type { MarcaCiclo } from '@/lib/ciclo';

export type DiaTira = {
  /** YYYY-MM-DD */
  clave: string;
  /** La línea que se lee siempre: qué pasó ese día, en pocas palabras. */
  titulo: string;
  /** La segunda línea, que solo se abre en el día enfocado. Puede ser ''. */
  detalle: string;
  /** De qué es el día. Decide el color del punto; el mood lo pisa en la UI. */
  categoria: Categoria;
  /** Cuántas cosas hay ese día (para el "3 cosas" de abajo). */
  cuantas: number;
  /** Si cae después de hoy. La tira ordena el futuro arriba. */
  futuro: boolean;
};

/**
 * ⚠️ EL ORDEN ES LA REGLA ENTERA, y no es alfabético ni el de los puntitos.
 * Va de lo que le PASÓ al día a lo que el día simplemente tuvo:
 *
 *   evento    → algo con nombre y hora: es lo más parecido a un hito
 *   actividad → algo que él hizo y cerró
 *   nota      → algo que se sentó a escribir
 *   charla    → algo que contó hablando (vale menos que lo que escribió: la
 *               charla la resume la IA, la nota la escribió él)
 *   gasto · comida · sueño · ánimo → datos del día, no acontecimientos
 *
 * Un día con un cumpleaños y tres gastos dice el cumpleaños. Al revés no.
 */
const PRIORIDAD: Categoria[] = ['evento', 'actividad', 'nota', 'gasto', 'comida', 'sueno', 'animo', 'foto'];

/** Corta sin partir una palabra al medio. El "…" solo aparece si sobró algo. */
export function recortar(texto: string, max = 68): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd() + '…';
}

/** Cuántas cosas registraste ese día. Es el número que se muestra abajo. */
export function contarCosas(d: DetalleDia): number {
  return (
    d.animo.length +
    (d.sueno ? 1 : 0) +
    d.comidas.length +
    d.gastos.length +
    d.hechas.length +
    d.eventos.length +
    d.notas.length +
    d.charlas.length +
    d.fotos.length
  );
}

/** El texto de una categoría, para cuando le toca ser el título. */
function tituloDe(c: Categoria, d: DetalleDia): string | null {
  switch (c) {
    case 'evento':
      return d.eventos[0] ? recortar(d.eventos[0].titulo) : null;
    case 'actividad':
      return d.hechas[0] ? recortar(d.hechas[0]) : null;
    case 'nota':
      // ⚠️ Las notas escritas GANAN a los resúmenes de charla, aunque `categoriasDia`
      // las meta a las dos en 'nota'. Lo que él escribió con la mano vale más como
      // título que lo que resumió la IA de una conversación.
      if (d.notas[0]) return recortar(d.notas[0].texto);
      if (d.charlas[0]) return recortar(d.charlas[0].texto);
      return null;
    case 'gasto': {
      const g = d.gastos[0];
      if (!g) return null;
      if (g.comercio && g.total != null) return recortar(`${g.comercio} · ${g.total} ${g.moneda ?? ''}`.trim());
      if (g.comercio) return recortar(g.comercio);
      return g.total != null ? `Gastaste ${g.total} ${g.moneda ?? ''}`.trim() : 'Un gasto';
    }
    case 'comida':
      return d.comidas[0] ? recortar(d.comidas[0].nota) : null;
    case 'sueno':
      return d.sueno ? `Dormiste ${d.sueno.hs} h` : null;
    case 'animo':
      return d.animo[0]?.nota ? recortar(d.animo[0].nota) : d.animo.length > 0 ? 'Anotaste cómo venías' : null;
    case 'foto':
      return d.fotos.length > 0 ? (d.fotos.length === 1 ? 'Una foto' : `${d.fotos.length} fotos`) : null;
  }
}

/** Lo que queda cuando ya se llevó el título alguien: se cuenta, no se lista. */
function restoEnPalabras(elegida: Categoria, d: DetalleDia): string {
  const partes: string[] = [];
  const sumar = (n: number, uno: string, varios: string) => {
    if (n > 0) partes.push(n === 1 ? uno : `${n} ${varios}`);
  };
  if (elegida !== 'evento') sumar(d.eventos.length, 'un evento', 'eventos');
  if (elegida !== 'actividad') sumar(d.hechas.length, 'una actividad', 'actividades');
  if (elegida !== 'nota') sumar(d.notas.length + d.charlas.length, 'una nota', 'notas');
  if (elegida !== 'gasto') sumar(d.gastos.length, 'un gasto', 'gastos');
  if (elegida !== 'comida') sumar(d.comidas.length, 'una comida', 'comidas');
  if (elegida !== 'sueno' && d.sueno) partes.push(`dormiste ${d.sueno.hs} h`);
  if (elegida !== 'animo') sumar(d.animo.length, 'un check-in', 'check-ins');
  if (elegida !== 'foto') sumar(d.fotos.length, 'una foto', 'fotos');
  // ⚠️ Como mucho tres. La segunda línea es contexto, no un inventario: con seis
  // pedazos separados por puntos deja de leerse y pasa a escanearse.
  return partes.slice(0, 3).join(' · ');
}

// ⚠️ Los mismos textos que el balance del día (`TXT_CICLO` en `CalendarioUI`),
// pero en tiempo presente y sin sujeto: acá son el TÍTULO de un renglón, no una
// frase dentro de una tarjeta. "Estabas con el período" arriba de una tira de
// días suena a que alguien te lo está contando.
const TITULO_CICLO: Record<MarcaCiclo, string> = {
  periodo: 'Período',
  pred: 'Próximo período estimado',
  ovulacion: 'Ovulación estimada',
};

/**
 * Arma la tira: un renglón por día que tenga algo, del futuro al pasado.
 *
 * ⚠️ EL FUTURO VA ARRIBA Y NO ES UNA PREFERENCIA VISUAL. Sacada la grilla, esta
 * tira es **la única forma de llegar a una fecha que todavía no pasó**, y el
 * evento del 15 de octubre tiene que estar en algún lado o anotarlo a futuro
 * deja de servir para nada. Scrolleás para arriba y vas hacia adelante.
 */
export function armarTira(
  detalles: Record<string, DetalleDia>,
  ciclo: Record<string, MarcaCiclo | null | undefined>,
  hoy: string,
): DiaTira[] {
  const claves = new Set<string>([...Object.keys(detalles), ...Object.keys(ciclo).filter((k) => ciclo[k])]);

  const dias: DiaTira[] = [];
  for (const clave of claves) {
    const d = detalles[clave];
    const marca = ciclo[clave];

    if (!d || contarCosas(d) === 0) {
      // Día que existe solo por el ciclo: la grilla lo pintaba coral y sin él
      // desaparecería de la app. No tiene categoría propia, va como 'nota'
      // (el gris de "algo hubo") y el color coral lo pone la UI por la marca.
      if (marca) dias.push({ clave, titulo: TITULO_CICLO[marca], detalle: '', categoria: 'nota', cuantas: 0, futuro: clave > hoy });
      continue;
    }

    const presentes = categoriasDia(d);
    const elegida = PRIORIDAD.find((c) => presentes.includes(c)) ?? presentes[0];
    const titulo = (elegida && tituloDe(elegida, d)) || 'Algo anotado';

    dias.push({
      clave,
      titulo,
      detalle: restoEnPalabras(elegida, d),
      categoria: elegida,
      cuantas: contarCosas(d),
      futuro: clave > hoy,
    });
  }

  // ⚠️ Descendente: el de arriba es el más lejano en el futuro. Como las claves
  // son YYYY-MM-DD, comparar strings ordena por fecha sin construir un Date por
  // renglón — y sin la trampa de zona horaria que eso traería.
  dias.sort((a, b) => (a.clave < b.clave ? 1 : a.clave > b.clave ? -1 : 0));
  return dias;
}

/** Dónde arranca la tira: hoy, o lo más cercano a hoy que exista. */
export function indiceDeHoy(dias: DiaTira[], hoy: string): number {
  if (dias.length === 0) return 0;
  const exacto = dias.findIndex((d) => d.clave === hoy);
  if (exacto >= 0) return exacto;
  // Están ordenados de futuro a pasado: el primero que ya no es futuro es el
  // pasado más reciente, o sea el que más cerca queda de hoy por abajo.
  const primerPasado = dias.findIndex((d) => d.clave < hoy);
  if (primerPasado < 0) return dias.length - 1;
  if (primerPasado === 0) return 0;
  // Entre el futuro más próximo y el pasado más reciente, gana el más cercano.
  const antes = dias[primerPasado - 1].clave;
  const despues = dias[primerPasado].clave;
  return Math.abs(dif(antes, hoy)) <= Math.abs(dif(hoy, despues)) ? primerPasado - 1 : primerPasado;
}

function dif(a: string, b: string): number {
  return (Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000;
}
