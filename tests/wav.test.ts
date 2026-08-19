import { describe, it, expect } from 'vitest';
import { generarMuestras, notasAWav, triangular, type Nota } from '@/lib/wav';

const UNA: Nota[] = [{ freq: 1000, inicio: 0, dur: 0.2, vol: 0.5 }];

describe('generarMuestras', () => {
  it('dura lo que ocupan las notas, con una cola corta', () => {
    const m = generarMuestras(UNA, 1000); // 1000 Hz para contar fácil
    expect(m.length).toBe(250); // 0.2s de nota + 0.05 de cola
  });

  it('arranca en silencio y no clickea (ataque, no salto)', () => {
    const m = generarMuestras(UNA, 22050);
    expect(Math.abs(m[0])).toBeLessThan(0.01);
  });

  it('se apaga al final en vez de cortarse de golpe', () => {
    const m = generarMuestras(UNA, 22050);
    const finNota = Math.floor(0.2 * 22050) - 1;
    expect(Math.abs(m[finNota])).toBeLessThan(0.05);
  });

  it('nunca satura, aunque las notas se superpongan', () => {
    const juntas: Nota[] = [
      { freq: 1046, inicio: 0, dur: 0.3, vol: 1 },
      { freq: 1318, inicio: 0, dur: 0.3, vol: 1 },
      { freq: 1568, inicio: 0, dur: 0.3, vol: 1 },
      { freq: 2093, inicio: 0, dur: 0.3, vol: 1 },
    ];
    const m = generarMuestras(juntas);
    const pico = m.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    expect(pico).toBeLessThanOrEqual(0.95);
  });

  it('respeta el momento en que entra cada nota', () => {
    // Ojo con elegir hz: si el sample rate es múltiplo exacto de la frecuencia,
    // se muestrea siempre en el cruce por cero y todo da 0 (pasó escribiendo
    // este test con 1000 Hz a 1000 muestras/s). Con 8 kHz no hay ese problema.
    const m = generarMuestras([{ freq: 1000, inicio: 0.1, dur: 0.1, vol: 0.5 }], 8000);
    expect(Math.abs(m[400])).toBe(0); // antes de que entre, silencio
    const hayAlgo = m.slice(800, 1600).some((v) => Math.abs(v) > 0.01);
    expect(hayAlgo).toBe(true);
  });
});

describe('notasAWav', () => {
  it('devuelve un data URI de WAV', () => {
    expect(notasAWav(UNA)).toMatch(/^data:audio\/wav;base64,[A-Za-z0-9+/=]+$/);
  });

  it('arma una cabecera RIFF/WAVE válida', () => {
    const uri = notasAWav(UNA);
    const bytes = Buffer.from(uri.split(',')[1], 'base64');
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(bytes.toString('ascii', 12, 16)).toBe('fmt ');
    expect(bytes.toString('ascii', 36, 40)).toBe('data');
    expect(bytes.readUInt16LE(22)).toBe(1); // mono
    expect(bytes.readUInt16LE(34)).toBe(16); // 16 bits
    // el tamaño declarado tiene que coincidir con lo que hay de verdad
    expect(bytes.readUInt32LE(4)).toBe(bytes.length - 8);
    expect(bytes.readUInt32LE(40)).toBe(bytes.length - 44);
  });

  it('pesa poco: son sonidos que viajan en un data URI', () => {
    const uri = notasAWav(UNA);
    expect(uri.length).toBeLessThan(40_000); // ~30 KB para 0.25s a 22 kHz
  });
});

describe('nivel de los sonidos reales de la app', () => {
  // Al pasar de Web Audio a WAV subí el volumen de 0.18 a 0.5 sin querer, casi el
  // triple. Matías lo escuchó al toque: "muy metálicos, muy fuertes, muy rotos".
  // Este test fija el nivel para que no vuelva a pasar.
  const TIN: Nota[] = [{ freq: 1046.5, inicio: 0, dur: 0.28, vol: 0.18 }];
  const EXITO: Nota[] = [
    { freq: 1046.5, inicio: 0, dur: 0.22, vol: 0.17 },
    { freq: 1396.9, inicio: 0.1, dur: 0.34, vol: 0.17 },
  ];
  const HITO: Nota[] = [1046.5, 1318.5, 1567.98, 2093].map((freq, i) => ({
    freq,
    inicio: i * 0.1,
    dur: 0.4,
    vol: 0.16,
  }));

  it.each([
    ['tin', TIN],
    ['éxito', EXITO],
    ['hito', HITO],
  ])('%s suena bajito: acompaña, no anuncia', (_nombre, notas) => {
    const m = generarMuestras(notas as Nota[]);
    const pico = m.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    expect(pico).toBeLessThan(0.3); // lejos de saturar el parlante
    expect(pico).toBeGreaterThan(0.05); // pero audible
  });

  it('la fundamental es triangular, no un seno pelado', () => {
    // La onda importa: con seno puro los sonidos salieron duros y metálicos. La
    // triangular sube en línea recta, y ahí está la diferencia con el seno.
    expect(triangular(0)).toBeCloseTo(0, 5);
    expect(triangular(Math.PI / 2)).toBeCloseTo(1, 5);
    expect(triangular(Math.PI)).toBeCloseTo(0, 5);
    expect(triangular((3 * Math.PI) / 2)).toBeCloseTo(-1, 5);

    // A un cuarto de la subida vale un cuarto (recta). Un seno ahí ya valdría
    // 0.707: es exactamente el exceso de energía que sonaba metálico.
    expect(triangular(Math.PI / 4)).toBeCloseTo(0.5, 5);
    expect(Math.sin(Math.PI / 4)).toBeCloseTo(0.707, 3);
  });
});
