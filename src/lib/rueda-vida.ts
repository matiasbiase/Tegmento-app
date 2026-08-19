// Las 8 áreas de la "rueda de la vida" (referencia visual de Matías),
// con sus descripciones y la clave de puntuación 1-5. Sin 'use server':
// se comparte entre el wizard cliente y el seed. Tono cercano, sin rayas.

export const CLAVE_PUNTUACION: readonly (readonly [number, string])[] = [
  [1, 'Acá la estoy pasando mal. Sé que necesito laburarlo.'],
  [2, 'No está bien todavía. Siento que puedo mejorar bastante.'],
  [3, 'Va bastante bien, aunque hay algo que puedo afinar.'],
  [4, 'Estoy bien acá. Quizás podría más, pero no sé si tengo el tiempo.'],
  [5, 'Estoy pleno con esto. No le veo nada para cambiar.'],
] as const;

export type AreaGuia = { nombre: string; color: string; descripcion: string };

export const AREAS_GUIA: readonly AreaGuia[] = [
  {
    nombre: 'Salud mental',
    color: '#9b8ce0',
    descripcion:
      'Tu mundo interno: emociones, pensamientos, estrés y cómo los gestionás. Tu conciencia, tus creencias y los apoyos que te mantienen entero.',
  },
  {
    nombre: 'Salud física',
    color: '#3d9b80',
    descripcion:
      'Qué tan bien tu cuerpo te sostiene el día a día: energía, fuerza, movilidad. El sueño, la comida, el movimiento y el cuidado.',
  },
  {
    nombre: 'Vida social',
    color: '#6c8fd6',
    descripcion:
      'La calidad de tus vínculos y tu sentido de pertenencia: amigos, familia, pareja, comunidad. La comunicación y el apoyo mutuo.',
  },
  {
    nombre: 'Ocio y tiempo libre',
    color: '#8aa35c',
    descripcion:
      'Lo que te da alegría, juego y renovación: hobbies, diversión, explorar, viajar. Los momentos que te recargan más allá de las obligaciones.',
  },
  {
    nombre: 'Negocios y carrera',
    color: '#6c78ee',
    descripcion:
      'Tu rumbo profesional y tu día a día en el trabajo. Tu trayectoria, tus habilidades, la carga, y cómo encaja con la vida que querés.',
  },
  {
    nombre: 'Finanzas',
    color: '#c79238',
    descripcion:
      'Tu relación con la plata y lo que sostiene tu estabilidad: ingresos, gastos, ahorro. La claridad y la sensación de tener el control.',
  },
  {
    nombre: 'Crecimiento personal',
    color: '#d98a6b',
    descripcion:
      'Cómo vas evolucionando: aprendizaje, identidad y visión a largo plazo. Tu curiosidad, tus hábitos y en quién te estás convirtiendo.',
  },
  {
    nombre: 'Contexto',
    color: '#c25571',
    descripcion:
      'Cómo tu entorno te sostiene o te desgasta. Tu casa, tu espacio de trabajo, tu orden, lo digital y la comodidad para funcionar bien.',
  },
] as const;
