// Genera el dibujo definitivo de la neurona y lo escribe en el código.
//
//   node scripts/gen-neurona.mjs            → imprime los datos
//   node scripts/gen-neurona.mjs --escribir → además escribe neurona-path.ts
//
// ⚠️ ESTE ARCHIVO ES LA FUENTE DE VERDAD DEL DIBUJO. Los `d` que están en
// src/components/ui/neurona-path.ts y en scripts/gen-icons.mjs salen de acá:
// no se editan a mano, se regeneran.
//
// Decisiones cerradas con Matías el 03/08/2026, vuelta por vuelta:
//   · Geometría K3 — el abanico achatado al 55% respecto del original.
//   · Último punto (el de la derecha) subido a y=7.15.
//   · Trazo de lápiz: eje RECTO y ancho SIMÉTRICO, como figura rellena. No es un
//     `stroke` — un stroke mide lo mismo de punta a punta por definición.
//   · Escala 1.00 (antes 1.18): más aire en los bordes.
//   · Puntos: círculos perfectos (P0).
//   · Rayas elegidas una por una: 1B6 · 2A4 · 3B3 · 4B6 · 5B1.
import fs from 'node:fs';

const r2 = n => Math.round(n * 100) / 100;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ruidoLinea(seed, armonicos, fMin, fMax) {
  const rnd = mulberry32(seed);
  const h = Array.from({ length: armonicos }, () => ({
    f: fMin + rnd() * (fMax - fMin), ph: rnd() * Math.PI * 2, a: rnd() * 2 - 1,
  }));
  const tot = h.reduce((s, k) => s + Math.abs(k.a), 0) || 1;
  return t => h.reduce((s, k) => s + k.a * Math.sin(k.f * Math.PI * t + k.ph), 0) / tot;
}

function suave(pts) {
  const n = pts.length;
  const at = i => pts[(i + n) % n];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + 'Z';
}

function trazo(p0, p1, seed, { base, amp, arm, fMin, fMax, panza }, N) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy);
  const px = -dy / L, py = dx / L;
  const n = ruidoLinea(seed * 11 + 3, arm, fMin, fMax);
  const kL = L / 8;
  const perfil = t => {
    const cuerpo = (1 - panza) + panza * Math.pow(Math.sin(Math.PI * (0.10 + 0.80 * t)), 0.6);
    return Math.max(0.1, base * cuerpo * (1 + amp * n(t * kL)));
  };
  const A = [], B = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const cx = p0[0] + dx * t, cy = p0[1] + dy * t, w = perfil(t);
    A.push([cx + px * w, cy + py * w]);
    B.push([cx - px * w, cy - py * w]);
  }
  return suave(A.concat(B.reverse()));
}

/* ── Lo cerrado ─────────────────────────────────────────────────────────── */
export const SOMA = [12, 12.7];
export const DEST = [[4.4, 7.74], [9.4, 5.95], [14.8, 7.0], [19.6, 7.15], [12, 19.3]];
export const SOMA_R = 1.7, TERM_R = 1.62;
export const ESCALA = 1.0;

const T3 = { base: .43, amp: .68, arm: 5, fMin: 3.0, fMax: 5.6, panza: .24 };
const T0 = { base: .55, amp: .40, arm: 2, fMin: 0.6, fMax: 1.9, panza: .55 };
const FAM = { A: T3, B: T0 };

export const ELEGIDAS = ['1B6', '2A4', '3B3', '4B6', '5B1'];

// ⚠️ Muestras por trazo. 30 era lo que se venía mirando en las maquetas; bajarlo
// cambia el dibujo, así que NO se toca sin volver a mirarlo en pantalla.
const N = 30;

export function conexiones() {
  return ELEGIDAS.map((c, i) => {
    const fam = c[1], semilla = +c[2];
    return trazo(SOMA, DEST[i], semilla, FAM[fam], N);
  }).join('');
}

export function nodos() {
  return DEST.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${TERM_R}"/>`).join('')
    + `<circle cx="${SOMA[0]}" cy="${SOMA[1]}" r="${SOMA_R}"/>`;
}

/* ── Salida ─────────────────────────────────────────────────────────────── */
if (process.argv[1]?.endsWith('gen-neurona.mjs')) {
  const d = conexiones();
  console.log('Rayas:', ELEGIDAS.join(' · '));
  console.log('Largo del path de conexiones:', d.length, 'caracteres');

  if (process.argv.includes('--escribir')) {
    const ts = `// GENERADO por scripts/gen-neurona.mjs — NO EDITAR A MANO.
// Para cambiar el dibujo se toca el generador y se corre \`npm run neurona\`.
//
// Es el contorno de las cinco conexiones de la neurona, en la caja 24×24.
// ⚠️ Va con \`fill\`, NO con \`stroke\`: el ancho varía a lo largo de cada raya
// (grueso y fino dentro del mismo tramo), y un stroke mide siempre lo mismo.
// Los ejes son rectas; lo deforme es el trazo.
//
// Rayas elegidas por Matías el 03/08/2026: ${ELEGIDAS.join(' · ')}
export const NEURONA_CONEXIONES =
  '${d}';
`;
    fs.writeFileSync('src/components/ui/neurona-path.ts', ts);
    console.log('✓ escrito src/components/ui/neurona-path.ts');
  }
}
