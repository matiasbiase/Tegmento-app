import { describe, it, expect } from 'vitest';
import { limpiarTitulo, tituloProvisorio } from '@/lib/titulo-chat';

describe('limpiarTitulo', () => {
  it('saca las comillas y el punto final', () => {
    expect(limpiarTitulo('"Mudanza y el laburo."')).toBe('Mudanza y el laburo');
  });

  it('saca el "Título:" que ponen los modelos chicos', () => {
    expect(limpiarTitulo('Título: la charla con mi vieja')).toBe('La charla con mi vieja');
  });

  it('se queda con la primera línea si escribe de más', () => {
    expect(limpiarTitulo('Tres noches sin dormir\n\nEste título refleja que…')).toBe('Tres noches sin dormir');
  });

  it('arranca en mayúscula', () => {
    expect(limpiarTitulo('empezar a escalar')).toBe('Empezar a escalar');
  });

  it('recorta lo demasiado largo sin cortar palabras', () => {
    const t = limpiarTitulo('Una conversación larguísima sobre la mudanza, el trabajo nuevo y todo lo que viene después');
    expect(t.length).toBeLessThanOrEqual(53);
    expect(t).not.toMatch(/\s$/);
  });

  it('si el modelo devuelve basura, devuelve vacío y el llamador se queda con el viejo', () => {
    expect(limpiarTitulo('   ')).toBe('');
    expect(limpiarTitulo('""')).toBe('');
  });
});

describe('tituloProvisorio', () => {
  it('corta donde termina la idea, no en el carácter 60', () => {
    expect(tituloProvisorio('Dormí mal. Me levanté a las cuatro y no pude volver a dormirme.')).toBe('Dormí mal');
  });

  it('marca las fotos', () => {
    expect(tituloProvisorio('ticket del súper', true)).toBe('Foto: Ticket del súper');
  });

  it('con texto vacío no queda sin nombre', () => {
    expect(tituloProvisorio('')).toBe('Sin título');
  });
});
