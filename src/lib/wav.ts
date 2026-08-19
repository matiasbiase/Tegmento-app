// Sintetizador de sonidos a WAV, sin Web Audio y sin archivos.
//
// Por qué existe: los sonidos de la app estaban hechos con Web Audio y en el
// iPhone se perdían cada dos por tres. En iOS un AudioContext sale por la
// categoría "ambient", que el interruptor de silencio del costado apaga, y
// además queda suspendido si el contexto no se armó dentro de un gesto real.
// La voz de la app nunca tuvo ese problema porque usa un <audio> con data URI,
// que sale por la categoría de media y suena igual con el teléfono en silencio.
//
// Así que acá se arma el WAV a mano (PCM 16 bits) y se reproduce por el mismo
// camino que la voz. Es lógica pura, sin browser: se puede testear.

export type Nota = {
  /** Frecuencia en Hz. */
  freq: number;
  /** Cuándo entra, en segundos desde el arranque. */
  inicio: number;
  /** Cuánto dura, en segundos. */
  dur: number;
  /** Volumen 0..1 de la fundamental. */
  vol: number;
};

const HZ = 44100; // el de siempre: a 22 kHz los armónicos agudos se ensuciaban

// Parciales ARMÓNICOS (fundamental + octava + quinta): dan brillo de marimba
// sin el "tin" metálico de los inarmónicos de campana.
const PARCIALES = [1, 2, 3];
const VOL_PARCIAL = [1, 0.32, 0.12];

/**
 * Onda triangular para la fundamental, senos para los armónicos de arriba.
 *
 * Esto no es un detalle: la primera versión del sintetizador usaba seno para
 * todo y sonaba metálica y dura. El triangle tiene armónicos impares que caen
 * rápido (1/n²), y es lo que hace que la nota se sienta redonda, de marimba.
 * Es exactamente la onda que usaba la versión con Web Audio, la que a Matías le
 * gustaba.
 */
export function triangular(x: number): number {
  return (2 / Math.PI) * Math.asin(Math.sin(x));
}

/** Muestras PCM en float -1..1 de una tanda de notas mezcladas. */
export function generarMuestras(notas: Nota[], hz = HZ): Float32Array {
  const fin = notas.reduce((max, n) => Math.max(max, n.inicio + n.dur), 0) + 0.05;
  const total = Math.ceil(fin * hz);
  const out = new Float32Array(total);

  for (const n of notas) {
    const desde = Math.floor(n.inicio * hz);
    const largo = Math.floor(n.dur * hz);
    const ataque = Math.max(1, Math.floor(0.015 * hz)); // 15ms, para que no clickee
    for (let i = 0; i < largo; i++) {
      const idx = desde + i;
      if (idx >= total) break;
      const t = i / hz;
      // Envolvente: ataque lineal corto y caída exponencial (como una marimba).
      const env = i < ataque ? i / ataque : Math.exp((-5 * (i - ataque)) / (largo - ataque || 1));
      let v = 0;
      for (let p = 0; p < PARCIALES.length; p++) {
        const fase = 2 * Math.PI * n.freq * PARCIALES[p] * t;
        v += (p === 0 ? triangular(fase) : Math.sin(fase)) * VOL_PARCIAL[p];
      }
      out[idx] += v * env * n.vol;
    }
  }

  // Techo bajo a propósito: estos sonidos acompañan, no anuncian. Con el pico
  // cerca de 1 el parlante del iPhone distorsiona y se escucha "roto".
  const TECHO = 0.5;
  let pico = 0;
  for (const v of out) pico = Math.max(pico, Math.abs(v));
  if (pico > TECHO) {
    const f = TECHO / pico;
    for (let i = 0; i < out.length; i++) out[i] *= f;
  }
  return out;
}

/** Base64 sin depender de Buffer (corre en el navegador). */
function aBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(bin);
  return Buffer.from(bin, 'binary').toString('base64');
}

/** Arma el archivo WAV (cabecera RIFF + PCM 16 bits mono) como data URI. */
export function notasAWav(notas: Nota[], hz = HZ): string {
  const muestras = generarMuestras(notas, hz);
  const bytesDatos = muestras.length * 2;
  const buf = new ArrayBuffer(44 + bytesDatos);
  const v = new DataView(buf);

  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };

  texto(0, 'RIFF');
  v.setUint32(4, 36 + bytesDatos, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true); // tamaño del bloque fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, hz, true);
  v.setUint32(28, hz * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits
  texto(36, 'data');
  v.setUint32(40, bytesDatos, true);

  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return `data:audio/wav;base64,${aBase64(new Uint8Array(buf))}`;
}
