'use client';

export type Grabacion = { detener: () => Promise<Blob> };

// Solo grabamos y devolvemos el audio CRUDO (el formato que da el teléfono:
// m4a en iPhone, webm en Chrome). La conversión a WAV 16k la hace el servidor
// con afconvert — hacerla en el navegador rompía en Safari/iOS.
export async function grabarAudio(): Promise<Grabacion> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  rec.start();
  return {
    detener: () =>
      new Promise((resolve, reject) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
          if (blob.size === 0) reject(new Error('grabación vacía'));
          else resolve(blob);
        };
        rec.stop();
      }),
  };
}

async function aWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decodificado = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const offline = new OfflineAudioContext(1, Math.ceil(decodificado.duration * 16000), 16000);
  const fuente = offline.createBufferSource();
  fuente.buffer = decodificado;
  fuente.connect(offline.destination);
  fuente.start();
  const render = await offline.startRendering();
  return encodeWav(render.getChannelData(0), 16000);
}

function encodeWav(muestras: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(buffer);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + muestras.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function reducirImagen(file: File, max = 1024): Promise<Blob> {
  const img = await createImageBitmap(file);
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85),
  );
}
