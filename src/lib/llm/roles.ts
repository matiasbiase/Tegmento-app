import fs from 'node:fs';
import path from 'node:path';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, config, skills } from '@/lib/db/schema';
import { completarOllama, type MensajeLLM } from './proveedor';

export type Rol =
  | 'asistente'
  | 'clasificador'
  | 'clasificador-mail'
  | 'clasificador-evento'
  | 'detector'
  | 'cronista'
  | 'entrevistador'
  | 'analista'
  | 'highlights'
  | 'reflejo'
  | 'contraste'
  // "Cómo se lee" es NUEVO y SEPARADO de 'contraste' (30/07). Ese rol hace tres
  // cosas a la vez (mide cuidado, arma el lado contrario, interpreta); este hace
  // una sola: marcar frases sueltas de un mensaje. Meterlo como un cuarto modo
  // de `contraste.md` era sumarle un cuarto trabajo a un prompt que ya elige mal
  // entre los tres que tiene.
  | 'comoselee'
  | 'pantalla'
  | 'hoja'
  | 'titulo'
  | 'resumen'
  | 'hechos'
  | 'agrupador'
  // Cuánto suele llevar algo, según lo que se sabe del mundo. Va con el modelo
  // PROFUNDO: es lo único que le pide al modelo recordar un dato de afuera, y el
  // chico inventa cifras con la misma seguridad que el grande las recuerda.
  // Corre en el worker, así que puede tardar.
  | 'estimador'
  // El mismo dato pero LEYENDO resultados de búsqueda, y es un prompt aparte a
  // propósito: acordarse de una cifra y extraerla de un texto que tenés delante
  // son dos trabajos distintos, y un prompt con los dos elige mal entre ellos.
  // Es la misma razón por la que 'comoselee' se separó de 'contraste'.
  | 'estimador-web';

export async function llamarRol(
  rol: Rol,
  mensajes: MensajeLLM[],
  opts?: {
    contexto?: string;
    json?: boolean;
    esquema?: object;
  },
): Promise<string> {
  // Auto-selector de modelo por tipo de tarea (idea de Matías): lo mecánico usa
  // un modelo chico y rápido; lo que requiere razonar o relacionar, uno más
  // grande. Cada grupo mira su propia config, así se ajusta sin tocar código.
  //   - RÁPIDO  (modelo_rapido): clasificar, leer un ticket, una captura de
  //     pantalla, una hoja del mes, transcribir intención. Tareas de "mirá esto
  //     y extraé el dato". No necesitan cabeza, necesitan velocidad.
  //   - CHARLA  (modelo_asistente): el chat y lo que responde en vivo. Equilibrio
  //     entre inteligente y ágil (no puede tardar minutos por mensaje).
  //   - PROFUNDO(modelo_analista): buscar patrones, cruzar datos. Corre en
  //     segundo plano, así que puede pensar más.
  const RAPIDAS = ['clasificador', 'clasificador-mail', 'clasificador-evento', 'detector', 'pantalla', 'hoja', 'titulo', 'hechos', 'agrupador'];
  const PROFUNDAS = ['analista', 'cronista', 'entrevistador', 'estimador', 'estimador-web'];
  const claveModelo = RAPIDAS.includes(rol)
    ? 'modelo_rapido'
    : PROFUNDAS.includes(rol)
      ? 'modelo_analista'
      : 'modelo_asistente'; // charla + highlights/reflejo/contraste/comoselee/resumen
  const fila = await db.select().from(config).where(eq(config.clave, claveModelo));
  // ⚠️ ESTE DEFAULT TIENE QUE SER UN MODELO QUE ESTÉ BAJADO. Es la red para
  // cuando falta la fila de config; si apunta a algo que no existe en Ollama, el
  // rol no falla con "falta configurar el modelo" sino con un 404 del servidor,
  // que es mucho más difícil de leer. Se actualiza junto con lo que se borra:
  // el 29/07 pasó de `gemma3:12b` a `gemma4:12b` porque el 3 se jubiló.
  const valor = fila[0]?.valor ?? 'ollama:gemma4:12b';
  const idx = valor.indexOf(':');
  const proveedor = valor.slice(0, idx);
  const modelo = valor.slice(idx + 1);
  if (proveedor !== 'ollama') throw new Error(`Proveedor no soportado todavía: ${proveedor}`);

  let sistema = fs.readFileSync(path.join(process.cwd(), 'prompts', `${rol}.md`), 'utf8');
  if (rol === 'asistente' || rol === 'highlights' || rol === 'reflejo' || rol === 'resumen') {
    const p = await db.select().from(config).where(eq(config.clave, 'personalidad'));
    if (p[0]?.valor.trim())
      sistema += `\n\n## PERSONALIDAD — MÁXIMA PRIORIDAD\nMatías eligió esto en sus ajustes y tiene que NOTARSE en cada respuesta. Si choca con el tono por defecto de arriba, GANA esto.\n${p[0].valor.trim()}`;
  }
  // ⚠️ LAS REGLAS QUE NO APLICAN NO SE MANDAN (29/07). El asistente tiene nueve
  // marcas distintas compitiendo por su atención, y con un modelo chico eso se
  // paga: dispara la que sea. Matías no sigue el ciclo, así que la regla del
  // período era una novena marca que nunca iba a usarse y que igual leía en
  // cada mensaje. Cada regla que sobra le saca lugar a las que sí importan.
  // Primer paso de "mandarle solo lo que aplica"; el resto (tickets sin foto,
  // agenda sin fechas) sigue pendiente.
  if (rol === 'asistente') {
    const ciclo = await db.select().from(config).where(eq(config.clave, 'sigue_ciclo'));
    const fuera: string[] = [];
    if (ciclo[0]?.valor !== '1') fuera.push('- DETECTAR PERÍODO');

    // ⚠️ LA RUTA DE ÁNIMO SE SACA CUANDO YA LA USÓ HOY, y esto es el segundo
    // intento del mismo arreglo. El primero fue decírselo en el contexto ("YA
    // REGISTRADO HOY: el ánimo, no se lo ofrezcas") y **no alcanzó**: el 29/07 a
    // las 13:29 le ofreció "Registrar mi ánimo" habiéndolo registrado a las
    // 09:15. La prohibición estaba al final del prompt y la lista de rutas
    // arriba, y con un modelo chico gana lo que ve, no lo que se le pide.
    // **A un modelo no se le pide que ignore una opción: se le saca la opción.**
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const animoHoy = await db
      .select({ id: animoCheckins.id })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, inicioHoy.toISOString())))
      .limit(1);
    // ⚠️ DECÍA `/animo` Y ESA PANTALLA SE BORRÓ EL 05/08. Este filtro seguía
    // funcionando (saca la línea de la lista) pero **el texto que buscaba ya no
    // coincidía con el del prompt**, que ahora dice `/cuerpo`: o sea que la
    // opción dejó de sacarse y el bot podía ofrecer registrar un ánimo ya
    // registrado. Tercera vez que borrar una pantalla rompe algo del prompt.
    if (animoHoy.length > 0) fuera.push('- [Registrar mi ánimo](/cuerpo)');

    // ⚠️ ACÁ SE ELEGÍA ENTRE `[+ticket]` Y `[+gasto:]` SEGÚN SI HABÍA FOTO, y
    // esa elección ya no existe: el 03/08 se sacó el ticket entero y ahora todo
    // gasto entra por `[+gasto:]`. Se fue con él el parámetro `hayFoto`.
    //
    // La razón por la que este filtro existía sigue valiendo para lo que queda:
    // mandarle al modelo dos marcas entre las que tiene que elegir es pedirle
    // que decida algo que nosotros ya sabemos, y de esa duda salió un bug real
    // (25/07: contestó `[+ticket]` a un gasto contado en palabras, sin foto, y
    // el gasto se perdió porque esa marca sin imagen no guardaba nada).

    if (fuera.length > 0) {
      sistema = sistema
        .split('\n')
        .filter((l) => !fuera.some((f) => l.trimStart().startsWith(f)))
        .join('\n');
    }

    // ⚠️ Y ADEMÁS, BORRAR EL LINK DONDE SEA QUE APAREZCA. Filtrar la línea de la
    // lista de rutas no alcanzaba: el mismo link está suelto adentro de otra
    // regla ("si habla de un día bueno o malo, invitalo a registrarlo:
    // [Registrar mi ánimo](/cuerpo)"). Con una sola mención que sobreviva, el
    // modelo la copia. Mientras el texto exacto del link exista en algún lugar
    // del prompt, lo va a escribir.
    if (animoHoy.length > 0) {
      sistema = sistema.replaceAll(
        '[Registrar mi ánimo](/cuerpo)',
        '(el ánimo de hoy YA está registrado: no lo menciones ni lo ofrezcas)',
      );
    }
  }
  if (rol === 'asistente') {
    const skillsRows = await db.select().from(skills).where(eq(skills.activa, true));
    if (skillsRows.length > 0) {
      sistema +=
        `\n\n## SKILLS ACTIVAS (capacidades que Matías te cargó, aplicalas cuando correspondan)\n` +
        skillsRows.map((s) => `### ${s.nombre}\n${s.instrucciones}`).join('\n\n');
    }
  }
  if (opts?.contexto) sistema += `\n\n## CONTEXTO ACTUAL\n${opts.contexto}`;
  // Ventana de contexto por tipo de tarea. El default de Ollama (4096) alcanza
  // para clasificar una línea, pero al Analista le truncaba los datos Y el prompt
  // del sistema: por eso devolvía etiquetas en vez de patrones. Se mide sobre lo
  // que realmente mandamos, con aire para la respuesta.
  const largoAprox = Math.ceil((sistema.length + mensajes.reduce((n, m) => n + m.contenido.length, 0)) / 3.2);
  const contextoTokens = Math.min(32768, Math.max(4096, 2 ** Math.ceil(Math.log2(largoAprox + 1500))));

  return completarOllama({
    modelo,
    mensajes: [{ rol: 'system', contenido: sistema }, ...mensajes],
    json: opts?.json,
    esquema: opts?.esquema,
    contextoTokens,
    // Tope de generación: un bucle degenerado ("lúgubres lúgubres…") no puede
    // colgar la app ni cortar el JSON a la mitad.
    maxTokens: 2000,
  });
}
