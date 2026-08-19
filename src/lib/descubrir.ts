// El catálogo de Descubrir: cosas para probar, ordenadas según lo que ya te
// importa. No es búsqueda en internet (esta app corre local): es una selección
// hecha a mano, que se filtra y ordena por tus áreas de foco y esconde lo que ya
// estás haciendo. Esa es la parte de "ya sabe un poco lo que me gusta".
//
// Las áreas son las de la rueda de la vida (ver AREAS_GUIA en rueda-vida.ts).

export type Sugerencia = {
  id: string; // estable, para deduplicar y para la key de React
  titulo: string;
  detalle: string;
  areas: string[]; // con qué áreas de la rueda conecta
};

// ─── Actividades para sumar ──────────────────────────────────────────────────
export const ACTIVIDADES: Sugerencia[] = [
  { id: 'act-caminar', titulo: 'Caminar 20 minutos al aire libre', detalle: 'Sin objetivo de ritmo. Es el hábito con mejor relación esfuerzo/beneficio para la cabeza y el cuerpo.', areas: ['Salud física', 'Salud mental'] },
  { id: 'act-fuerza', titulo: 'Entrenar fuerza 2 veces por semana', detalle: 'Peso corporal o gimnasio. Media hora alcanza para empezar a notar la diferencia.', areas: ['Salud física'] },
  { id: 'act-estirar', titulo: 'Estirar 10 minutos antes de dormir', detalle: 'Baja la tensión del día y ayuda a arrancar el sueño. Fácil de sostener.', areas: ['Salud física', 'Salud mental'] },
  { id: 'act-agua', titulo: 'Un vaso de agua al levantarte', detalle: 'El ancla más chica posible para empezar a construir una rutina de mañana.', areas: ['Salud física'] },

  { id: 'act-meditar', titulo: 'Meditar 10 minutos', detalle: 'Una app guiada o solo la respiración. Lo que cuenta es la constancia, no la duración.', areas: ['Salud mental'] },
  { id: 'act-diario', titulo: 'Escribir tres líneas antes de dormir', detalle: 'Qué pasó, cómo te sentiste. Con el tiempo se vuelve un mapa de tus patrones.', areas: ['Salud mental', 'Crecimiento personal'] },
  { id: 'act-gratitud', titulo: 'Anotar una cosa buena del día', detalle: 'Entrena la atención hacia lo que sí funcionó. Dos minutos.', areas: ['Salud mental'] },
  { id: 'act-desconexion', titulo: 'Una hora sin pantallas antes de dormir', detalle: 'El cambio más directo para dormir mejor. Dejá el teléfono fuera del cuarto.', areas: ['Salud mental', 'Salud física'] },

  { id: 'act-llamar', titulo: 'Llamar a alguien una vez por semana', detalle: 'Un amigo, un familiar. Una llamada real pesa más que veinte mensajes.', areas: ['Vida social'] },
  { id: 'act-plan', titulo: 'Proponer un plan al mes', detalle: 'Vos organizás algo: un café, una caminata, una cena. Sostener vínculos también es iniciativa.', areas: ['Vida social', 'Ocio y tiempo libre'] },

  { id: 'act-instrumento', titulo: 'Practicar un instrumento 15 minutos', detalle: 'Guitarra, piano, lo que tengas ganas. El progreso lento es parte del placer.', areas: ['Ocio y tiempo libre', 'Crecimiento personal'] },
  { id: 'act-leer', titulo: 'Leer 10 páginas por día', detalle: 'Ficción o no. A fin de mes son varios libros sin que se sienta el esfuerzo.', areas: ['Ocio y tiempo libre', 'Crecimiento personal'] },
  { id: 'act-cocinar', titulo: 'Cocinar una receta nueva por semana', detalle: 'Rompe la rutina y es un plan en sí mismo, solo o acompañado.', areas: ['Ocio y tiempo libre', 'Salud física'] },
  { id: 'act-boulder', titulo: 'Probar escalada en boulder', detalle: 'Fuerza, cabeza y juego en la misma actividad. Muchos gimnasios tienen clase de prueba.', areas: ['Salud física', 'Ocio y tiempo libre'] },

  { id: 'act-idioma', titulo: 'Estudiar un idioma 15 minutos por día', detalle: 'Una app o flashcards. La clave es todos los días, aunque sea poco.', areas: ['Crecimiento personal', 'Negocios y carrera'] },
  { id: 'act-curso', titulo: 'Hacer un curso corto online', detalle: 'Algo puntual que te sirva o te dé curiosidad. Ponete una fecha de fin.', areas: ['Crecimiento personal', 'Negocios y carrera'] },
  { id: 'act-portfolio', titulo: 'Dedicar una hora semanal a un proyecto propio', detalle: 'Portfolio, side project, lo que sea tuyo. Una hora protegida cada semana suma muchísimo.', areas: ['Negocios y carrera', 'Crecimiento personal'] },
  { id: 'act-networking', titulo: 'Escribir a una persona de tu área al mes', detalle: 'Alguien cuyo trabajo te interese. Una pregunta honesta abre más puertas de lo que parece.', areas: ['Negocios y carrera', 'Vida social'] },

  { id: 'act-presupuesto', titulo: 'Revisar tus gastos una vez por semana', detalle: 'Diez minutos mirando en qué se fue la plata. Con Finanzas de la app ya tenés la mitad hecho.', areas: ['Finanzas'] },
  { id: 'act-ahorro', titulo: 'Apartar un monto fijo apenas cobrás', detalle: 'Poco y automático le gana a mucho y cuando sobra. Empezá con lo que no duela.', areas: ['Finanzas'] },
];

// ─── Temas para pasar por Polaridad ──────────────────────────────────────────
// Acá vivía POLARIDAD: ocho frases inventadas ("las redes están arruinando a una
// generación", "los carbohidratos son veneno") que Descubrir ofrecía para probar
// la herramienta. Se sacaron el 26/07, pedido de Matías: en una app que trata de
// SU vida, darle contenido ficticio para practicar es ruido, y encima quedaba
// guardado en su historial de Polaridad como si fueran cosas que miró de verdad.

/**
 * Ordena las sugerencias poniendo primero las que tocan tus áreas de foco, y
 * saca las que ya tenés (por título, comparado sin acentos ni mayúsculas). Es
 * determinístico salvo el desempate, que rota con `semilla` para que la lista se
 * sienta viva entre visitas sin volverse azarosa.
 */
export function rankear(
  items: Sugerencia[],
  opts: { foco?: string[]; yaTengo?: string[]; semilla?: number } = {},
): Sugerencia[] {
  const foco = new Set(opts.foco ?? []);
  const tengo = new Set((opts.yaTengo ?? []).map(norm));
  const semilla = opts.semilla ?? 0;

  return items
    .filter((s) => !tengo.has(norm(s.titulo)))
    .map((s, i) => {
      const enFoco = s.areas.some((a) => foco.has(a));
      // desempate estable pero rotativo: hash del id corrido por la semilla
      const orden = (hash(s.id) + semilla) % 997;
      return { s, peso: (enFoco ? 0 : 1000) + orden, i };
    })
    .sort((a, b) => a.peso - b.peso || a.i - b.i)
    .map((x) => x.s);
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
}
