export type AreaRadar = { nombre: string; actual: number; deseado: number; color?: string };

// Paleta del rediseño (prototipo "Bitácora Simple"), en el orden de AREAS_GUIA.
// Se usa como fallback cuando el dato no trae su propio color.
const PALETA = ['#9b8ce0', '#3d9b80', '#6c8fd6', '#8aa35c', '#6c78ee', '#c79238', '#d98a6b', '#c25571'];

// Los nombres largos no entran en el arco del radar; se acortan SOLO ahí
// (la leyenda muestra el nombre completo).
const ETIQUETA_CORTA: Record<string, string> = {
  'Ocio y tiempo libre': 'Ocio',
  'Negocios y carrera': 'Carrera',
  'Crecimiento personal': 'Crecimiento',
};
const etiquetaArco = (n: string) => ETIQUETA_CORTA[n] ?? n;
const CX = 160;
const CY = 160;
const R0 = 16; // centro
const PASO = 18; // por punto de score
const BANDA_IN = 116;
const BANDA_OUT = 146;

function pol(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function banda(rIn: number, rOut: number, a0: number, a1: number): string {
  const [x0, y0] = pol(rOut, a0);
  const [x1, y1] = pol(rOut, a1);
  const [x2, y2] = pol(rIn, a1);
  const [x3, y3] = pol(rIn, a0);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${x0},${y0} A${rOut},${rOut} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 ${big} 0 ${x3},${y3} Z`;
}

function cuna(r: number, a0: number, a1: number): string {
  const [x0, y0] = pol(r, a0);
  const [x1, y1] = pol(r, a1);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${CX},${CY} L${x0},${y0} A${r},${r} 0 ${big} 1 ${x1},${y1} Z`;
}

function arcoTexto(r: number, a0: number, a1: number, invertir: boolean): string {
  const [x0, y0] = pol(r, invertir ? a1 : a0);
  const [x1, y1] = pol(r, invertir ? a0 : a1);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${x0},${y0} A${r},${r} 0 ${big} ${invertir ? 0 : 1} ${x1},${y1}`;
}

export function RadarRueda({ datos, mostrarLeyenda = true }: { datos: AreaRadar[]; mostrarLeyenda?: boolean }) {
  const n = Math.max(datos.length, 1);
  const seg = 360 / n;
  const colorDe = (d: AreaRadar, i: number) => d.color ?? PALETA[i % PALETA.length];

  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 320 320" className="block w-full" role="img" aria-label="Rueda de la vida">
        {[1, 2, 3, 4, 5].map((k) => (
          <circle key={k} cx={CX} cy={CY} r={R0 + PASO * k} fill="none" stroke="rgba(108,120,238,.14)" strokeWidth="1" />
        ))}

        {datos.map((d, i) => {
          const a0 = i * seg + 1.5;
          const a1 = (i + 1) * seg - 1.5;
          const mid = (a0 + a1) / 2;
          const color = colorDe(d, i);
          const abajo = mid > 100 && mid < 260;
          const rScore = R0 + PASO * Math.max(0, Math.min(5, d.actual));
          const rDeseado = R0 + PASO * Math.max(0, Math.min(5, d.deseado));
          return (
            <g key={d.nombre}>
              <path d={banda(BANDA_IN, BANDA_OUT, a0, a1)} fill={color} opacity="0.22" stroke={color} strokeOpacity="0.45" strokeWidth="1" />
              <path d={cuna(rScore, a0 + 1, a1 - 1)} fill={color} opacity="0.38" stroke={color} strokeOpacity="0.85" strokeWidth="1.3" />
              <circle cx={pol(rDeseado, mid)[0]} cy={pol(rDeseado, mid)[1]} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
              <path id={`seg-${i}`} d={arcoTexto(abajo ? 136 : 127, a0 + 2, a1 - 2, abajo)} fill="none" />
              <text fontSize="9" fontFamily="var(--font-sans)" fill={color} letterSpacing="0.2">
                <textPath href={`#seg-${i}`} startOffset="50%" textAnchor="middle">
                  {etiquetaArco(d.nombre)}
                </textPath>
              </text>
            </g>
          );
        })}

        {/* referencia mínima de escala: solo 1 y 5, sin burbujas que compitan con los datos */}
        {[1, 5].map((k) => {
          const [x, y] = pol(R0 + PASO * k, 180);
          return (
            <text key={`n${k}`} x={x} y={y + 3} fontSize="8.5" fontFamily="var(--font-sans)" fill="#b0b0c4" textAnchor="middle">
              {k}
            </text>
          );
        })}
      </svg>

      {/* leyenda de lectura en una línea */}
      <p className="-mt-2 text-center font-mono text-[11px] text-niebla">
        color = cómo venís hoy · <span className="inline-block size-2 rounded-full border-2 border-niebla bg-white align-middle" /> = a dónde querés llegar
      </p>

      {mostrarLeyenda && (
        <ul className="flex flex-col rounded-[18px] bg-blanco px-4 shadow-[0_4px_18px_rgba(50,50,90,.05)]">
          {datos.map((d, i) => (
            <li
              key={d.nombre}
              className="flex items-center gap-2.5 border-b border-[rgba(108,120,238,.08)] py-2.5 last:border-0"
            >
              <span className="size-2.5 rounded-full" style={{ background: colorDe(d, i) }} />
              <span className="flex-1 truncate text-[12px] font-semibold tracking-[0.2px] text-tinta">{d.nombre}</span>
              <span className="whitespace-nowrap text-[11px] text-niebla">
                {d.actual}/5 → {d.deseado}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
