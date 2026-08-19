import { describe, it, expect } from 'vitest';
import {
  chatsVisibles,
  notasQueRecibenChats,
  piezasDeNota,
  piezasVisibles,
  type ChatDeNota,
} from '@/lib/notas-contenido';

const chat = (id: number): ChatDeNota => ({
  id,
  titulo: `Charla ${id}`,
  mensajes: 4,
  ultimaActividad: '2026-07-31T10:00:00.000Z',
});

describe('piezasDeNota', () => {
  it('anuncia las charlas que tiene', () => {
    expect(piezasDeNota(2)).toEqual([{ tipo: 'chat', cuantas: 2 }]);
  });

  it('una nota que es solo texto no anuncia nada', () => {
    // Una fila vacía la haría ver incompleta, y "0 charlas" informa de una
    // ausencia que nadie preguntó.
    expect(piezasDeNota(0)).toEqual([]);
  });
});

describe('piezasVisibles — la nota privada no se delata por el envoltorio', () => {
  it('tapada, no dice cuántas charlas tiene', () => {
    // ⚠️ El número solo ya cuenta algo: que hablaste de eso, y cuánto.
    expect(piezasVisibles({ privada: true }, 3, false)).toEqual([]);
  });

  it('con el PIN puesto, las muestra', () => {
    expect(piezasVisibles({ privada: true }, 3, true)).toEqual([{ tipo: 'chat', cuantas: 3 }]);
  });

  it('una nota normal las muestra siempre', () => {
    expect(piezasVisibles({ privada: false }, 1, false)).toEqual([{ tipo: 'chat', cuantas: 1 }]);
  });
});

describe('chatsVisibles — adentro de la nota', () => {
  it('tapada, adentro no hay nada que dibujar', () => {
    expect(chatsVisibles({ privada: true }, [chat(1), chat(2)], false)).toEqual([]);
  });

  it('desbloqueada, se ven todas', () => {
    expect(chatsVisibles({ privada: true }, [chat(1)], true)).toHaveLength(1);
  });

  it('la nota normal no depende del PIN', () => {
    expect(chatsVisibles({}, [chat(1)], false)).toHaveLength(1);
  });
});

describe('notasQueRecibenChats — el selector de "mandar a una nota"', () => {
  it('las privadas no aparecen mientras están tapadas', () => {
    // Si aparecieran, el selector sería la lista de todos tus títulos privados
    // a un toque, sin PIN.
    const notas = [{ id: 1, privada: false }, { id: 2, privada: true }];
    expect(notasQueRecibenChats(notas, false).map((n) => n.id)).toEqual([1]);
  });

  it('con el PIN puesto se puede mandar a una privada', () => {
    const notas = [{ id: 1, privada: false }, { id: 2, privada: true }];
    expect(notasQueRecibenChats(notas, true).map((n) => n.id)).toEqual([1, 2]);
  });
});
