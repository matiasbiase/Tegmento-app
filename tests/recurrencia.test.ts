import { describe, it, expect } from 'vitest';
import { suenaRecurrente } from '@/lib/recurrencia';

describe('suenaRecurrente', () => {
  it('agarra los casos reales que quedaron mal guardados', () => {
    // Los dos que Matías escribió en el chip de la Casa el 25/07 y cayeron como
    // "hecho una sola vez".
    expect(suenaRecurrente('Hago bouldern los martes')).toBe(true);
    expect(suenaRecurrente('Estoy haciendo aleman de lunes s viernes')).toBe(true);
  });

  it('reconoce la frecuencia dicha de distintas formas', () => {
    expect(suenaRecurrente('Voy al gimnasio todos los días')).toBe(true);
    expect(suenaRecurrente('Corro 3 veces por semana')).toBe(true);
    expect(suenaRecurrente('Cada domingo llamo a mi vieja')).toBe(true);
    expect(suenaRecurrente('Medito todas las mañanas')).toBe(true);
    expect(suenaRecurrente('Empecé a estudiar guitarra')).toBe(true);
  });

  it('deja pasar lo que de verdad es puntual', () => {
    expect(suenaRecurrente('Mandé el mail a la médica')).toBe(false);
    expect(suenaRecurrente('Fui al médico')).toBe(false);
    expect(suenaRecurrente('Arranqué el trámite del auto')).toBe(false);
    expect(suenaRecurrente('Tuve una charla difícil con mi jefe')).toBe(false);
    expect(suenaRecurrente('Terminé el informe')).toBe(false);
  });

  it('no se cuelga con texto vacío o cortito', () => {
    expect(suenaRecurrente('')).toBe(false);
    expect(suenaRecurrente('   ')).toBe(false);
    expect(suenaRecurrente('ok')).toBe(false);
  });
});
