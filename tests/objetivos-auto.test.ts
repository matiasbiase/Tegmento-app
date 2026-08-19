import { describe, it, expect } from 'vitest';
import {
  asociaA,
  clavesDe,
  horasDeEvento,
  movimientosAutomaticos,
  resumenAutomatico,
} from '@/lib/objetivos-auto';

describe('clavesDe', () => {
  it('saca las palabras sin contenido', () => {
    expect(clavesDe('Aprender alemán')).toEqual(['aleman']);
    expect(clavesDe('Buscar trabajo')).toEqual(['trabajo']);
  });

  it('normaliza tildes, así "aleman" pesca "alemán"', () => {
    expect(clavesDe('ALEMÁN')).toEqual(['aleman']);
  });

  it('un título sin nada propio no deja ninguna clave', () => {
    expect(clavesDe('Aprender a hacer')).toEqual([]);
    expect(clavesDe('el de la')).toEqual([]);
  });
});

describe('asociaA', () => {
  it('EL CASO QUE PIDIÓ MATÍAS: la actividad "Alemán" cuenta para "Aprender alemán"', () => {
    expect(asociaA('Aprender alemán', 'Alemán')).toBe(true);
    expect(asociaA('Aprender alemán', 'alemán')).toBe(true);
    expect(asociaA('Aprender alemán', 'Clase de alemán')).toBe(true);
  });

  it('no asocia dos objetivos que solo comparten el verbo', () => {
    // Si "aprender" contara, "aprender alemán" matchearía con "aprender a soldar".
    expect(asociaA('Aprender alemán', 'Aprender a soldar')).toBe(false);
    expect(asociaA('Buscar trabajo', 'Buscar cancha')).toBe(false);
  });

  it('no asocia cosas que no tienen nada que ver', () => {
    expect(asociaA('Aprender alemán', 'Correr')).toBe(false);
    expect(asociaA('Buscar trabajo', 'Meditar')).toBe(false);
  });

  it('UN OBJETIVO SIN PALABRAS PROPIAS NO ASOCIA NADA', () => {
    // "Mi objetivo" matchearía con medio historial. Mejor que no sume nada.
    expect(asociaA('Aprender a hacer', 'Alemán')).toBe(false);
    expect(asociaA('', 'Alemán')).toBe(false);
  });

  it('las palabras de menos de tres letras no disparan nada', () => {
    expect(asociaA('Ir a B2', 'B2')).toBe(false);
  });
});

describe('horasDeEvento', () => {
  it('calcula la duración real cuando el evento tiene hora', () => {
    expect(horasDeEvento('2026-07-30T18:00', '2026-07-30T19:30')).toBe(1.5);
  });

  it('un evento de todo el día NO tiene horas: suponer 8 sería inventar', () => {
    expect(horasDeEvento('2026-07-30', '2026-07-30')).toBeNull();
  });

  it('un "evento" de 14 horas es un viaje o un error de sync, no una sesión', () => {
    expect(horasDeEvento('2026-07-30T08:00', '2026-07-30T23:00')).toBeNull();
  });

  it('no se cuelga con fechas dadas vuelta o ilegibles', () => {
    expect(horasDeEvento('2026-07-30T19:00', '2026-07-30T18:00')).toBeNull();
    expect(horasDeEvento('cualquiera', 'otra')).toBeNull();
  });
});

describe('movimientosAutomaticos', () => {
  const actividades = [
    { titulo: 'Alemán', marcas: [{ fecha: '2026-07-27' }, { fecha: '2026-07-28' }] },
    { titulo: 'Correr', marcas: [{ fecha: '2026-07-27' }] },
  ];
  const eventos = [
    { titulo: 'Clase de alemán', inicio: '2026-07-30T18:00', fin: '2026-07-30T19:30' },
    { titulo: 'Dentista', inicio: '2026-07-29T10:00', fin: '2026-07-29T11:00' },
  ];

  it('junta solo lo que asocia, de las dos fuentes', () => {
    const movs = movimientosAutomaticos('Aprender alemán', actividades, eventos);
    expect(movs).toHaveLength(3);
    expect(movs.map((m) => m.origen)).toEqual(['actividad', 'actividad', 'evento']);
  });

  it('las marcas de actividad vienen SIN horas: marcar un día no dice cuánto duró', () => {
    const movs = movimientosAutomaticos('Aprender alemán', actividades, []);
    expect(movs.every((m) => m.horas === null)).toBe(true);
  });

  it('el evento con hora sí trae sus horas reales', () => {
    const movs = movimientosAutomaticos('Aprender alemán', [], eventos);
    expect(movs[0].horas).toBe(1.5);
  });

  it('guarda de dónde salió cada uno, para poder mostrarlo', () => {
    const movs = movimientosAutomaticos('Aprender alemán', actividades, eventos);
    expect(movs.map((m) => m.nota)).toEqual(['Alemán', 'Alemán', 'Clase de alemán']);
  });

  it('vienen ordenados por fecha', () => {
    const movs = movimientosAutomaticos('Aprender alemán', actividades, eventos);
    expect(movs.map((m) => m.fecha)).toEqual(['2026-07-27', '2026-07-28', '2026-07-30']);
  });

  it('sin nada que asocie, lista vacía', () => {
    expect(movimientosAutomaticos('Volver a nadar', actividades, eventos)).toEqual([]);
  });
});

describe('resumenAutomatico', () => {
  it('agrupa por fuente y suma las horas que hay', () => {
    const movs = movimientosAutomaticos(
      'Aprender alemán',
      [{ titulo: 'Alemán', marcas: [{ fecha: '2026-07-27' }, { fecha: '2026-07-28' }] }],
      [{ titulo: 'Clase de alemán', inicio: '2026-07-30T18:00', fin: '2026-07-30T19:30' }],
    );
    expect(resumenAutomatico(movs, '2026-07-24')).toEqual([
      { fuente: 'Alemán', cuantos: 2, horas: null },
      { fuente: 'Clase de alemán', cuantos: 1, horas: 1.5 },
    ]);
  });

  it('deja afuera lo anotado a mano: esto muestra lo que se sumó SOLO', () => {
    const movs = [
      { fecha: '2026-07-28', horas: 2, nota: 'a mano', origen: 'manual' as const },
      { fecha: '2026-07-28', horas: null, nota: 'Alemán', origen: 'actividad' as const },
    ];
    expect(resumenAutomatico(movs, '2026-07-24')).toEqual([{ fuente: 'Alemán', cuantos: 1, horas: null }]);
  });

  it('deja afuera lo viejo', () => {
    const movs = [{ fecha: '2026-01-01', horas: null, nota: 'Alemán', origen: 'actividad' as const }];
    expect(resumenAutomatico(movs, '2026-07-24')).toEqual([]);
  });
});

describe('el objetivo elegido a mano (30/07)', () => {
  const marcas = [{ fecha: '2026-07-20' }, { fecha: '2026-07-21' }];

  it('cuenta aunque el nombre no se parezca en nada', () => {
    // El caso que motivó el desplegable: "Duolingo" es "Aprender alemán" y no
    // comparten una sola palabra.
    const act = { titulo: 'Duolingo', marcas, objetivoId: 7 };
    expect(movimientosAutomaticos('Aprender alemán', [act], [], 7)).toHaveLength(2);
  });

  it('⚠️ elegido para OTRO objetivo, no cuenta acá aunque el nombre coincida', () => {
    // Sin esto, "Correr" elegido para "Correr una maratón" también sumaría a
    // "Volver a entrenar" por parecido, y el mismo día se contaría dos veces.
    const act = { titulo: 'Correr', marcas, objetivoId: 3 };
    expect(movimientosAutomaticos('Correr una maratón', [act], [], 9)).toHaveLength(0);
  });

  it('sin elección, sigue valiendo el cruce por nombre de siempre', () => {
    const act = { titulo: 'Alemán', marcas, objetivoId: null };
    expect(movimientosAutomaticos('Aprender alemán', [act], [], 7)).toHaveLength(2);
  });

  it('una actividad sin el campo se comporta como antes', () => {
    // Las que ya existían en la base no lo tienen.
    const act = { titulo: 'Alemán', marcas };
    expect(movimientosAutomaticos('Aprender alemán', [act], [])).toHaveLength(2);
  });
});

// ── COLGAR DE VARIOS OBJETIVOS (06/08) ──────────────────────────────────────
// Matías: *"puede constituir a más de uno"*. Escalada le suma a Salud y también
// a un objetivo social, y con un solo campo había que elegir cuál miente.
describe('una actividad puede colgar de varios objetivos', () => {
  const escalada = {
    titulo: 'Escalada',
    marcas: [{ fecha: '2026-08-01' }, { fecha: '2026-08-03' }],
    objetivosColgados: [1, 2],
  };

  it('cuenta en los dos objetivos de los que cuelga', () => {
    expect(movimientosAutomaticos('Salud', [escalada], [], 1)).toHaveLength(2);
    expect(movimientosAutomaticos('Ver más gente', [escalada], [], 2)).toHaveLength(2);
  });

  it('⚠️ y en ninguno más, aunque el nombre se parezca', () => {
    // Sin esta regla, "Escalada" colgada de Salud también sumaría a un objetivo
    // llamado "Escalar el Aconcagua" por parecido, y el día se contaría dos veces.
    expect(movimientosAutomaticos('Escalada en roca', [escalada], [], 9)).toHaveLength(0);
  });

  it('sin colgar, sigue valiendo el cruce por nombre de siempre', () => {
    const suelta = { titulo: 'Alemán', marcas: [{ fecha: '2026-08-01' }] };
    expect(movimientosAutomaticos('Alemán', [suelta], [], 1)).toHaveLength(1);
  });

  it('una lista vacía no bloquea el parecido', () => {
    // `objetivosColgados: []` es "no colgué de ninguno", no "colgué de cero".
    const suelta = { titulo: 'Alemán', marcas: [{ fecha: '2026-08-01' }], objetivosColgados: [] };
    expect(movimientosAutomaticos('Alemán', [suelta], [], 1)).toHaveLength(1);
  });
});
