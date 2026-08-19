/**
 * Prueba el estimador de punta a punta, SIN tocar la base.
 *
 * Es la única forma de saber si esto aguanta lo que promete: los tests validan
 * la RESPUESTA (que un índice fuera de rango se descarte, que un número absurdo
 * no pase), pero no pueden decir si el modelo se calla cuando corresponde, que
 * es la mitad del pedido de Matías (*"y si no lo sabe, no pone nada"*).
 *
 * Corre los dos caminos:
 *   - con SearXNG prendido → busca y lee de una página real
 *   - con SearXNG apagado  → la memoria de Gemma, marcada "sin verificar"
 *
 *   npx tsx scripts/probar-estimador.ts
 */
import { llamarRol } from '@/lib/llm/roles';
import {
  ESQUEMA_ESTIMACION,
  ESQUEMA_ESTIMACION_WEB,
  validarEstimacion,
  validarEstimacionWeb,
} from '@/lib/estimacion-general';
import { buscar } from '@/lib/buscar';

// Los que DEBERÍAN tener cifra publicada, y los que no. Si un "no" devuelve un
// número, está inventando y hay que apretar el prompt.
const CASOS: { titulo: string; espera: 'sabe' | 'no sabe' }[] = [
  { titulo: 'Aprender alemán. Llegar es: aprobar el B2', espera: 'sabe' },
  { titulo: 'Sacar el B1 de alemán', espera: 'sabe' },
  { titulo: 'Llegar al C1 de inglés', espera: 'sabe' },
  { titulo: 'Buscar trabajo', espera: 'no sabe' },
  { titulo: 'Volver a entrenar', espera: 'no sabe' },
  { titulo: 'Escribir un libro', espera: 'no sabe' },
  { titulo: 'Ordenar el garage', espera: 'no sabe' },
  { titulo: 'Dejar de fumar', espera: 'no sabe' },
];

/** La compuerta: el mismo primer paso que hace el worker. */
async function compuerta(titulo: string) {
  const crudo = await llamarRol('estimador', [{ rol: 'user', contenido: titulo }], {
    json: true,
    esquema: ESQUEMA_ESTIMACION,
  });
  return validarEstimacion(JSON.parse(crudo));
}

async function conBusqueda(titulo: string) {
  const resultados = await buscar(`${titulo} cuántas horas suele llevar`);
  if (resultados === null) return { modo: 'buscador apagado', est: null, hubo: false };
  if (resultados.length === 0) return { modo: 'sin resultados', est: null, hubo: true };

  const lista = resultados.map((r, i) => `${i + 1}. [${r.dominio}] ${r.titulo}\n${r.texto}`).join('\n\n');
  const crudo = await llamarRol(
    'estimador-web',
    [{ rol: 'user', contenido: `Título: ${titulo}\n\nResultados:\n${lista}` }],
    { json: true, esquema: ESQUEMA_ESTIMACION_WEB },
  );
  return { modo: 'web', est: validarEstimacionWeb(JSON.parse(crudo), resultados), hubo: true };
}

async function deMemoria(titulo: string) {
  const crudo = await llamarRol('estimador', [{ rol: 'user', contenido: titulo }], {
    json: true,
    esquema: ESQUEMA_ESTIMACION,
  });
  return validarEstimacion(JSON.parse(crudo));
}

async function main() {
  const vivo = (await buscar('test', 1)) !== null;
  console.log(`SearXNG: ${vivo ? 'prendido → camino con búsqueda' : 'apagado → camino de memoria'}\n`);

  let aciertos = 0;

  for (const c of CASOS) {
    let salida = '(error)';
    let acerto = false;
    try {
      // El circuito real: primero la compuerta de memoria, y solo si pasa se
      // sale a buscar. Ver la nota larga en `lib/estimador.ts`.
      const gate = await compuerta(c.titulo);
      let est = gate;
      let modo = 'memoria';

      if (gate && vivo) {
        const r = await conBusqueda(c.titulo);
        if (r.est) {
          est = r.est;
          modo = 'web';
        }
      } else if (!gate) {
        modo = 'compuerta';
      }

      acerto = est ? c.espera === 'sabe' : c.espera === 'no sabe';
      salida = est ? `${est.texto} → ${est.fuente} [${modo}]` : `se calla (${modo})`;
    } catch (e) {
      salida = `ERROR ${e instanceof Error ? e.message.slice(0, 80) : e}`;
    }
    if (acerto) aciertos += 1;
    console.log(`${acerto ? '✓' : '✗'} [${c.espera}] ${c.titulo}\n   → ${salida}\n`);
  }

  console.log(`${aciertos}/${CASOS.length}`);
}

main();
