import { describe, it, expect } from 'vitest';
import { armarContexto, type DatosContexto } from '@/lib/contexto';

const base: DatosContexto = {
  ahora: new Date('2026-06-11T15:00:00'),
  nombre: 'Matías',
  areas: [
    { nombre: 'SALUD', scoreActual: 3, scoreDeseado: 4 },
    { nombre: 'ALEMÁN', scoreActual: 2, scoreDeseado: 4 },
  ],
  lineas: [
    { titulo: 'Curso B1', tipo: 'proyecto', estado: 'activa', objetivo: 'Aprobar el B1', deadline: '2026-06-28', areas: ['ALEMÁN'], parentTitulo: null },
    { titulo: 'Competencia local', tipo: 'proyecto', estado: 'activa', objetivo: null, deadline: null, areas: [], parentTitulo: 'Boulder 3x/sem' },
  ],
  agenda: [{ titulo: 'Clase de alemán', inicio: '2026-06-11T14:30:00.000Z' }],
  mailsImportantes: [{ remitente: 'Goethe Institut', asunto: 'Examen B1' }],
  ultimasEntradas: [{ tipo: 'sync', fecha: '2026-06-11T11:42:00.000Z', contenido: 'Llegaron 14 mails.' }],
};

describe('armarContexto', () => {
  it('incluye áreas con actual → deseado', () => {
    const ctx = armarContexto(base);
    expect(ctx).toContain('SALUD: 3/5 → 4/5');
    expect(ctx).toContain('ALEMÁN: 2/5 → 4/5');
  });

  it('incluye líneas con deadline, objetivo y rama', () => {
    const ctx = armarContexto(base);
    expect(ctx).toContain('Curso B1');
    expect(ctx).toContain('deadline 2026-06-28');
    expect(ctx).toContain('objetivo: Aprobar el B1');
    expect(ctx).toContain('(rama de "Boulder 3x/sem")');
  });

  it('incluye agenda, mails y entradas', () => {
    const ctx = armarContexto(base);
    expect(ctx).toContain('Clase de alemán');
    expect(ctx).toContain('Goethe Institut: Examen B1');
    expect(ctx).toContain('Llegaron 14 mails.');
  });

  it('marca agenda vacía', () => {
    const ctx = armarContexto({ ...base, agenda: [] });
    expect(ctx).toContain('(sin eventos)');
  });

  it('incluye conocimiento personal cuando hay', () => {
    const ctx = armarContexto({
      ...base,
      conocimiento: [{ titulo: 'Trabajo', contenido: 'Freelance en UX, clientes en Alemania' }],
    });
    expect(ctx).toContain('Conocimiento personal');
    expect(ctx).toContain('Trabajo: Freelance en UX, clientes en Alemania');
  });

  it('omite la sección de conocimiento si no hay', () => {
    expect(armarContexto(base)).not.toContain('Conocimiento personal');
  });
});

describe('lo que falta de hoy', () => {
  const base = {
    ahora: new Date(2026, 6, 27, 10, 0),
    nombre: 'Matías',
    areas: [],
    lineas: [],
    agenda: [],
    mailsImportantes: [],
    ultimasEntradas: [],
  };

  it('lista lo que falta y aclara que se pregunta de a una', () => {
    const txt = armarContexto({ ...base, faltaHoy: ['qué comió', 'cómo viene de energía'] });
    expect(txt).toContain('qué comió');
    expect(txt).toContain('UNA sola');
    expect(txt).toContain('Nunca las enumeres');
  });

  it('dice explícitamente cuando no falta nada', () => {
    const txt = armarContexto({ ...base, faltaHoy: [] });
    expect(txt).toContain('hoy ya cargó todo');
  });

  it('sin el campo no rompe', () => {
    expect(() => armarContexto(base)).not.toThrow();
  });
});
