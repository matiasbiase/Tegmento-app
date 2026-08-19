// Qué decirle a Matías mientras el asistente piensa.
//
// Gemma corre en su Mac: una respuesta larga se va a 30 segundos tranquilamente.
// Un "Pensando…" quieto todo ese rato parece colgado, así que el texto escala:
// primero acompaña, después explica por qué tarda (que corre local, no es que se
// rompió), y al final pide paciencia sin alarmar.

const ESPERAS: { desde: number; texto: string }[] = [
  { desde: 0, texto: 'Pensando…' },
  { desde: 7, texto: 'Dame un segundo más…' },
  { desde: 16, texto: 'Está tardando un poco: el modelo corre acá en tu Mac' },
  { desde: 35, texto: 'Ya casi, no cierres la app' },
];

/** El texto que corresponde a los segundos que llevamos esperando. */
export function textoEspera(segundos: number): string {
  const seg = Number.isFinite(segundos) ? Math.max(0, segundos) : 0;
  let texto = ESPERAS[0].texto;
  for (const e of ESPERAS) {
    if (seg >= e.desde) texto = e.texto;
  }
  return texto;
}
