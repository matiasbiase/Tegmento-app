// Relaciones conocidas entre las áreas de la rueda. Sirven para el pop-up del
// onboarding y para mostrar conexiones en la principal. Los nombres coinciden
// con AREAS_GUIA; el matching es case-insensitive porque la DB puede traer
// nombres viejos en caps. El Analista (Grounded Theory) las afinará con
// datos reales más adelante; esto es el mapa base.

export type Conexion = { a: string; b: string; nota: string };

export const CONEXIONES: Conexion[] = [
  { a: 'Salud mental', b: 'Salud física', nota: 'El cuerpo y la cabeza van juntos: dormir bien y moverte regulan tu ánimo.' },
  { a: 'Salud mental', b: 'Vida social', nota: 'Los vínculos son sostén emocional: cuando estás conectado, bajás la ansiedad.' },
  { a: 'Salud mental', b: 'Negocios y carrera', nota: 'La carga del trabajo pesa en tu cabeza, y tu claridad mental rinde en el trabajo.' },
  { a: 'Salud mental', b: 'Ocio y tiempo libre', nota: 'El descanso y el juego recargan: sin ocio, la cabeza se satura.' },
  { a: 'Salud mental', b: 'Contexto', nota: 'Tu entorno ordena o desordena la cabeza: un espacio cuidado, una mente más calma.' },
  { a: 'Salud mental', b: 'Finanzas', nota: 'La plata es una de las mayores fuentes de estrés o de calma.' },
  { a: 'Salud física', b: 'Ocio y tiempo libre', nota: 'Moverte también puede ser disfrute, no solo obligación.' },
  { a: 'Salud física', b: 'Negocios y carrera', nota: 'Tu energía física sostiene tu rendimiento; el exceso de trabajo te la come.' },
  { a: 'Negocios y carrera', b: 'Finanzas', nota: 'Tu trabajo impacta directo en tu estabilidad económica.' },
  { a: 'Negocios y carrera', b: 'Crecimiento personal', nota: 'Lo que aprendés abre puertas profesionales, y el trabajo te hace crecer.' },
  { a: 'Vida social', b: 'Ocio y tiempo libre', nota: 'Compartir tu tiempo libre fortalece los vínculos.' },
  { a: 'Crecimiento personal', b: 'Salud mental', nota: 'Conocerte y evolucionar te da herramientas para estar mejor.' },
];

function clave(a: string, b: string): string {
  return [a.toUpperCase(), b.toUpperCase()].sort().join('||');
}

export function relacionEntre(n1: string, n2: string): Conexion | null {
  const k = clave(n1, n2);
  return CONEXIONES.find((c) => clave(c.a, c.b) === k) ?? null;
}

export function relacionesDe(nombre: string): { otra: string; nota: string }[] {
  const n = nombre.toUpperCase();
  return CONEXIONES.filter((c) => c.a.toUpperCase() === n || c.b.toUpperCase() === n).map((c) => ({
    otra: c.a.toUpperCase() === n ? c.b : c.a,
    nota: c.nota,
  }));
}
