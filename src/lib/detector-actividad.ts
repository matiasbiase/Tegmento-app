import { llamarRol } from '@/lib/llm/roles';
import { MARCA_HECHO } from '@/lib/hecho';
import { MARCA_COMIDA } from '@/lib/comida-marca';
import { MARCA_GASTO } from '@/lib/gastos-marca';

// Red de seguridad para las marcas del chat ([+actividad:], [+hecho:], [+gasto:]).
//
// El prompt del asistente ya le pide que las proponga, pero con un prompt largo
// y una charla en curso se le pasan o se equivoca de marca. Dos casos reales:
//
//  - "quiero arrancar alemán en serio" → no proponía [+actividad:] y no había
//    botón para sumarla.
//  - "Gaste 5.70 en la entrada de la pileta podes sumarlo?" → contestó "lo sumo
//    a tus gastos" con la marca [+ticket], que es la de FOTOS de tickets. Sin
//    foto, esa marca no dibuja ningún botón: el gasto era imposible de guardar.
//
// Acá corre un detector aparte, con el modelo rápido, que mira SOLO el mensaje de
// Matías. Corre en paralelo con la respuesta (no agrega espera) y solo completa:
// si el asistente ya puso la marca correcta, la suya manda.

const MARCA_ACTIVIDAD = /\[\+actividad:\s*([^\]\n]+)\]/i;
const MARCA_COMOLOVE = /\[\+comolove:\s*([^\]\n]+)\]/i;

export type TipoDeteccion = 'gasto' | 'interpersonal' | 'actividad' | 'hecho' | 'nada';
export type Deteccion = { tipo: TipoDeteccion; titulo: string; monto: number; moneda: string };

const ESQUEMA_DETECCION = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: ['gasto', 'interpersonal', 'actividad', 'hecho', 'nada'] },
    titulo: { type: 'string' },
    monto: { type: 'number' },
    moneda: { type: 'string' },
  },
  required: ['tipo', 'titulo', 'monto', 'moneda'],
} as const;

const NADA: Deteccion = { tipo: 'nada', titulo: '', monto: 0, moneda: '€' };

/** Si el texto ya trae una marca de registro puesta por el asistente. */
export function yaTieneMarca(texto: string): boolean {
  // ⚠️ `[+comida:]` cuenta como marca puesta (02/08). Si no estuviera acá, el
  // detector podría agregarle una SEGUNDA marca a un mensaje que ya ofrece
  // anotar la comida, y el mensaje terminaría con dos botones para lo mismo.
  return (
    MARCA_ACTIVIDAD.test(texto) ||
    MARCA_HECHO.test(texto) ||
    MARCA_GASTO.test(texto) ||
    MARCA_COMOLOVE.test(texto) ||
    MARCA_COMIDA.test(texto)
  );
}

/**
 * Completa la respuesta del asistente con la marca que corresponda: si detectó
 * algo y el modelo no puso ninguna marca, se la agrega en su propia línea al
 * final, que es como la espera la UI.
 *
 * Función pura: la decisión se testea sin el modelo.
 *
 * ⚠️ ACÁ VIVÍA LA RED DE SEGURIDAD DE `[+ticket]` (sacarla cuando no había foto,
 * porque sin imagen esa marca quedaba huérfana y el gasto se perdía en
 * silencio — pasó el 25/07). Se fue el 03/08 con el ticket entero: ahora todo
 * gasto entra por `[+gasto:]`, con foto o sin foto, así que la ambigüedad que
 * esa red tapaba ya no puede existir.
 */
export function completarMarca(respuesta: string, deteccion: Deteccion): string {
  // El modelo a veces escribe la marca en formato código (`[+gasto: ...]`). El
  // botón igual sale, pero al sacar la marca del texto quedaban los backticks
  // sueltos en pantalla. Se los saca antes de cualquier otra cosa.
  const texto = respuesta.replace(/`+\s*(\[\+[^\]\n]+\])\s*`+/g, '$1');

  if (deteccion.tipo === 'nada') return texto;
  const titulo = deteccion.titulo.trim();
  if (!titulo) return texto;
  if (yaTieneMarca(texto)) return texto;

  // Lo que pasó con otra persona no es un logro: ofrecerle "marcarlo como
  // hecho" ahí es absurdo (pasó de verdad: "me contestó 'estoy a full'" quedó
  // propuesto como actividad hecha). Va el botón para ver cómo lo puede haber
  // leído el otro, que es lo que sí sirve.
  if (deteccion.tipo === 'interpersonal') {
    return `${texto.trimEnd()}\n\n[+comolove: ${titulo}]`;
  }

  if (deteccion.tipo === 'gasto') {
    if (!(deteccion.monto > 0)) return texto; // sin monto no hay gasto que guardar
    const moneda = deteccion.moneda.trim() || '€';
    return `${texto.trimEnd()}\n\n[+gasto: ${titulo} | ${deteccion.monto} | ${moneda}]`;
  }
  return `${texto.trimEnd()}\n\n[+${deteccion.tipo}: ${titulo}]`;
}

/**
 * Le pregunta al modelo rápido si en el mensaje hay un gasto, una actividad o un
 * hecho. Nunca tira: si falla, devuelve 'nada' y la respuesta del asistente queda
 * como vino. Es una ayuda, no un paso crítico del chat.
 */
export async function detectarActividad(mensaje: string): Promise<Deteccion> {
  const texto = mensaje.trim();
  if (texto.length < 12) return NADA; // "hola", "sí", "dale": no hay nada que sacar
  try {
    const crudo = await llamarRol('detector', [{ rol: 'user', contenido: texto }], { esquema: ESQUEMA_DETECCION });
    const j = JSON.parse(crudo) as Partial<Deteccion>;
    const tipo: TipoDeteccion =
      j.tipo === 'gasto' || j.tipo === 'interpersonal' || j.tipo === 'actividad' || j.tipo === 'hecho'
        ? j.tipo
        : 'nada';
    const titulo = String(j.titulo ?? '').trim().replace(/\s+/g, ' ').slice(0, 90);
    if (tipo === 'nada' || !titulo) return NADA;
    const monto = Number(j.monto);
    return {
      tipo,
      titulo,
      monto: Number.isFinite(monto) && monto > 0 ? monto : 0,
      moneda: String(j.moneda ?? '€').trim().slice(0, 8) || '€',
    };
  } catch {
    return NADA;
  }
}
