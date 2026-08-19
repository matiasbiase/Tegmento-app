// Catálogo de rayas del ícono — generador parametrizable.
//
//   node scripts/gen-catalogo-rayas.mjs --elegidas=1B6,2A4,3B3 --out=docs/maquetas/x.html
//
// Muestra el ícono armado con lo ya elegido y, para cada posición que falta, las
// 16 candidatas (8 semillas × 2 familias) dibujadas DENTRO del ícono, más el
// recorte de la raya sola.
//
// Código de raya: <posición><familia><semilla> — ej. 3B3 = posición 3, familia B
// (T0, ancha), semilla 3.
//
// Cerrado en vueltas anteriores y fijo acá: geometría K3 con el último punto en
// 7.15 (Y3), fondo FM, escala 1.00, puntos redondos (P0).
import fs from 'node:fs';
import path from 'node:path';

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

/** Eje recto, ancho simétrico. La frecuencia se escala con el largo del tramo. */
export function trazo(p0, p1, seed, { base, amp, arm, fMin, fMax, panza, N = 30 }) {
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

/* ── Geometría cerrada ──────────────────────────────────────────────────── */
export const SOMA = [12, 12.7];
export const DEST = [[4.4, 7.74], [9.4, 5.95], [14.8, 7.0], [19.6, 7.15], [12, 19.3]];
export const SOMA_R = 1.7, TERM_R = 1.62;
const NOMBRES = ['1 · izquierda', '2 · segunda', '3 · tercera', '4 · derecha', '5 · axón'];

export const T3 = { base: .43, amp: .68, arm: 5, fMin: 3.0, fMax: 5.6, panza: .24 };
export const T0 = { base: .55, amp: .40, arm: 2, fMin: 0.6, fMax: 1.9, panza: .55 };
export const FAM = { A: { tz: T3, nom: 'T3 · fina y variada' }, B: { tz: T0, nom: 'T0 · ancha, una panza' } };
const SEMILLAS = [1, 2, 3, 4, 5, 6, 7, 8];

export const NODO = '#f2f1fa', LINEA = '#8b8b9e';
export const FM = 'linear-gradient(140deg,#25263d,#141521)';

export function nodos() {
  return DEST.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${TERM_R}"/>`).join('')
    + `<circle cx="${SOMA[0]}" cy="${SOMA[1]}" r="${SOMA_R}"/>`;
}

export function icono(sel) {
  const conex = DEST.map((p, i) => trazo(SOMA, p, sel[i][1], FAM[sel[i][0]].tz)).join('');
  return `<g fill="LINEA" stroke="none"><path d="${conex}"/></g><g fill="NODO" stroke="none">${nodos()}</g>`;
}

const svg = (crudo, size, nodo = NODO, linea = LINEA) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}">`
  + crudo.replaceAll('NODO', nodo).replaceAll('LINEA', linea) + `</svg>`;

const rayaSola = (pos, fam, seed, size = 62) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${trazo(SOMA, DEST[pos], seed, FAM[fam].tz)}" fill="#3b3b4e"/></svg>`;

/* ── Argumentos ─────────────────────────────────────────────────────────── */
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || '';
const DEFAULT = [['A', 3], ['A', 2], ['A', 3], ['A', 4], ['A', 3]];

const sel = DEFAULT.map(v => [...v]);
const fijas = new Set();
for (const c of arg('elegidas').split(',').filter(Boolean)) {
  const m = /^([1-5])([AB])([1-8])$/.exec(c.trim().toUpperCase());
  if (!m) { console.error(`Código inválido: ${c}`); process.exit(1); }
  const pos = +m[1] - 1;
  sel[pos] = [m[2], +m[3]];
  fijas.add(pos);
}
const faltan = [0, 1, 2, 3, 4].filter(i => !fijas.has(i));
const codigo = i => `${i + 1}${sel[i][0]}${sel[i][1]}`;
const TITULO = sel.map((_, i) => codigo(i)).join(' · ');

/* ── HTML ───────────────────────────────────────────────────────────────── */
const vecinos = ['#3a7bd5,#00d2ff', '#f7971e,#ffd200', '#ee0979,#ff6a00',
                 '#11998e,#38ef7d', '#654ea3,#eaafc8', '#c31432,#240b36'];
const homescreen = s => `<div class="col"><span class="tag">en la pantalla de inicio</span>
  <div class="fondo"><div class="grid">
    ${vecinos.slice(0, 3).map(v => `<div class="hs" style="background:linear-gradient(135deg,${v})"></div>`).join('')}
    <div class="hs" style="background:${FM}">${svg(icono(s), 62)}</div>
    ${vecinos.slice(3).map(v => `<div class="hs" style="background:linear-gradient(135deg,${v})"></div>`).join('')}
  </div><div class="nom">Tegmento</div></div></div>`;

const bloque = pos => {
  const cards = ['A', 'B'].map(fam => `
    <div class="famnom">${FAM[fam].nom}</div>
    <div class="rayas">${SEMILLAS.map(s => {
      const v = sel.map((x, i) => i === pos ? [fam, s] : x);
      const hoy = sel[pos][0] === fam && sel[pos][1] === s;
      return `<div class="raya ${hoy ? 'hoy' : ''}">
        <div class="app" style="background:${FM};width:126px;height:126px">${svg(icono(v), 126)}</div>
        <div class="papel">${rayaSola(pos, fam, s)}</div>
        <span class="cod">${pos + 1}${fam}${s}</span>
        ${hoy ? '<span class="hoytag">la de ahora</span>' : ''}
      </div>`;
    }).join('')}</div>`).join('');
  const puestas = [...fijas].sort().map(i => `<b>${codigo(i)}</b>`).join(', ');
  return `<h2 class="sec">Posición ${NOMBRES[pos]} — falta elegir</h2>
    <p class="sub">Cada opción con ${puestas} ya puestas.</p>
    <div class="rayasWrap">${cards}</div>`;
};

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tegmento — Rayas: ${TITULO}</title>
<style>
  :root{--blanco:#fff;--tinta:#1c1c2b;--tinta-soft:#56566c;--niebla:#6d6d87;
    --iris:#6c78ee;--iris-borde:#6c78ee29;--rosa-tint:#fbe7ec;--verde-tint:#e3f1ec}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    background:#e8e8f2;color:var(--tinta);padding:28px 16px 70px}
  .intro{max-width:900px;margin:0 auto 24px;text-align:center}
  .intro h1{font-size:23px;font-weight:600;letter-spacing:-.3px}
  .intro p{margin-top:9px;font-size:14px;line-height:1.6;color:var(--tinta-soft)}
  .chip{display:inline-block;background:var(--verde-tint);color:#1f5c4a;border-radius:99px;
    padding:4px 12px;font:11px ui-monospace,monospace;font-weight:700;margin-top:12px}
  h2.sec{max-width:1340px;margin:46px auto 6px;font-family:Georgia,serif;font-size:19px;font-weight:600;
    padding-bottom:8px;border-bottom:1px solid #d3d3e2}
  p.sub{max-width:1340px;margin:0 auto 18px;font-size:13px;color:var(--tinta-soft);line-height:1.55}
  .fila{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;align-items:flex-start;max-width:1340px;margin:0 auto}
  .col{display:flex;flex-direction:column;align-items:center;gap:9px}
  .rayasWrap{max-width:1340px;margin:0 auto}
  .famnom{font:11px ui-monospace,monospace;font-weight:700;color:var(--niebla);margin:14px 0 8px;letter-spacing:.4px}
  .rayas{display:flex;gap:10px;flex-wrap:wrap}
  .raya{display:flex;flex-direction:column;align-items:center;gap:4px}
  .papel{background:#fdfdf8;border:1px solid #e4e4da;border-radius:8px;line-height:0}
  .raya.hoy .app{outline:2px solid var(--iris);outline-offset:3px}
  .cod{font:11px ui-monospace,monospace;font-weight:700;color:var(--iris);
    background:var(--blanco);border-radius:99px;padding:2px 8px;border:1px solid var(--iris-borde)}
  .raya.hoy .cod{background:var(--iris);color:#fff}
  .hoytag{font:9px ui-monospace,monospace;color:var(--niebla)}
  .tag{font:11px ui-monospace,monospace;font-weight:700;background:var(--blanco);
    border:1px solid var(--iris-borde);color:var(--iris);border-radius:99px;padding:3px 11px}
  .tag.rec{background:var(--iris);color:#fff;border-color:var(--iris)}
  .cap{font-size:12px;color:var(--tinta-soft);text-align:center;line-height:1.5;max-width:240px}
  .cap b{color:var(--tinta);font-weight:600}
  .app{border-radius:23%;box-shadow:0 8px 22px rgba(60,60,120,.20);line-height:0}
  .fondo{width:260px;background:linear-gradient(160deg,#5b6b8c,#2e3550);border-radius:22px;padding:17px 13px 11px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .hs{aspect-ratio:1;border-radius:23%;line-height:0;display:grid;place-items:center;overflow:hidden}
  .hs svg{width:100%;height:100%}
  .nom{margin-top:8px;text-align:center;font-size:10px;color:#ffffffcc}
  .nota{max-width:1340px;margin:30px auto 0;background:var(--rosa-tint);border:1px solid #eab8c4;
    border-radius:16px;padding:18px 20px}
  .nota h3{font-size:14.5px;font-weight:600;margin-bottom:9px}
  .nota p,.nota li{font-size:13.5px;line-height:1.65;color:var(--tinta-soft)}
  .nota ul{margin:6px 0 0 20px}.nota li{margin-bottom:7px}
  .nota b{color:var(--tinta);font-weight:600}
  code{font:12px ui-monospace,monospace;background:#00000010;padding:1px 5px;border-radius:4px}
</style>
</head>
<body>

<div class="intro">
  <h1>${fijas.size === 5 ? 'El ícono, cerrado' : `Faltan ${faltan.length}: ${faltan.map(i => NOMBRES[i]).join(' y ')}`}</h1>
  <div class="chip">${TITULO}</div>
  <p>Elegidas: <b>${[...fijas].sort().map(i => codigo(i)).join(' · ') || '(ninguna)'}</b>${
    faltan.length ? ` · en gris provisorio: <b>${faltan.map(i => codigo(i)).join(' · ')}</b>` : ''}</p>
</div>

<h2 class="sec">Cómo va quedando</h2>
<div class="fila">
  <div class="col"><span class="tag rec">${TITULO}</span>
    <div class="app" style="background:${FM};width:230px;height:230px">${svg(icono(sel), 230)}</div>
    <div class="cap">Tamaño grande.</div></div>
  ${homescreen(sel)}
  <div class="col"><span class="tag">en la barra, 19 px</span>
    <div style="background:#fff;border-radius:16px;padding:12px 16px;display:flex;gap:16px;align-items:center;color:#6d6d87">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 11 12 4l8 7M6 10v9h12v-9"/></svg>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16 16l4 4"/></svg>
      <span style="display:inline-flex">${svg(icono(sel), 19, '#6c78ee', '#aeaec4')}</span>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>
    </div>
    <div class="cap">El glifo de Patrones, al lado de sus vecinos.</div></div>
</div>

${faltan.map(bloque).join('')}

${faltan.length ? `<div class="nota">
  <h3>Recordá</h3>
  <ul>
    <li><b>Las posiciones que faltan están en gris provisorio</b> (${faltan.map(i => codigo(i)).join(' · ')}),
      que es lo que había de antes. No las elegiste todavía.</li>
    <li><b>Repetir un código en dos posiciones no da el mismo dibujo</b> — el ritmo del espesor
      se reparte según el largo del tramo. Da el mismo carácter.</li>
  </ul>
</div>` : ''}

</body>
</html>
`;

const out = arg('out') || 'docs/maquetas/rayas.html';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('OK', out, html.length, 'bytes · elegidas:', [...fijas].sort().map(i => codigo(i)).join(',') || '(ninguna)',
  '· faltan:', faltan.map(i => i + 1).join(',') || 'ninguna');
