import { describe, it, expect } from 'vitest';
import { tituloDesdePatron } from '@/lib/observaciones';

describe('tituloDesdePatron', () => {
  it('se queda con la conducta y descarta la consecuencia', () => {
    expect(tituloDesdePatron('Los días que caminás a la mañana, dormís mejor')).toBe('caminás a la mañana');
  });

  it('saca los arranques típicos del Analista', () => {
    expect(tituloDesdePatron('Cuando entrenás seguido tu ánimo sube')).toBe('entrenás seguido');
    expect(tituloDesdePatron('Noté que escribís más los domingos')).toBe('escribís más los domingos');
  });

  it('corta en el conector aunque no haya coma', () => {
    expect(tituloDesdePatron('Dormir menos de 7h y levantarte temprano te apaga')).toBe('dormir menos de 7h');
  });

  it('recorta las frases largas sin cortar una palabra al medio', () => {
    const t = tituloDesdePatron('salir a correr por el parque del barrio bien temprano todos los días de semana');
    expect(t.length).toBeLessThanOrEqual(48);
    expect(t.split(' ').length).toBeLessThanOrEqual(6);
    expect(t.endsWith(' ')).toBe(false);
  });

  it('no deja puntuación colgada al final', () => {
    expect(tituloDesdePatron('Tomás mucho café.')).toBe('tomás mucho café');
  });

  it('con texto vacío devuelve vacío', () => {
    expect(tituloDesdePatron('   ')).toBe('');
  });
});
