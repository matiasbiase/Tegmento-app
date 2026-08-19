// La moneda de un gasto es lo que Gemma leyó en el ticket: a veces "€", a veces
// "EUR", a veces "eur". Guardamos el crudo, pero mostramos siempre lo mismo:
// símbolo pegado al número en los tickets (€23,50) y código con espacio en los
// totales grandes (EUR 128,40).

type Conocida = { codigo: string; simbolo: string; alias: string[] };

const CONOCIDAS: Conocida[] = [
  { codigo: 'EUR', simbolo: '€', alias: ['EUR', '€', 'EURO', 'EUROS'] },
  { codigo: 'USD', simbolo: 'US$', alias: ['USD', 'US$', 'U$S', 'DOLAR', 'DÓLAR', 'DOLARES', 'DÓLARES'] },
  { codigo: 'ARS', simbolo: '$', alias: ['ARS', '$', 'PESO', 'PESOS'] },
  { codigo: 'GBP', simbolo: '£', alias: ['GBP', '£', 'LIBRA', 'LIBRAS'] },
];

function buscar(moneda: string | null | undefined): Conocida | null {
  const t = moneda?.trim().toUpperCase();
  if (!t) return null;
  return CONOCIDAS.find((c) => c.alias.includes(t)) ?? null;
}

/** El símbolo de la moneda (€, US$). Si no la conocemos, devuelve el crudo. */
export function simboloMoneda(moneda: string | null | undefined): string {
  return buscar(moneda)?.simbolo ?? moneda?.trim() ?? '';
}

/** El código de la moneda (EUR, ARS). Si no la conocemos, devuelve el crudo. */
export function codigoMoneda(moneda: string | null | undefined): string {
  return buscar(moneda)?.codigo ?? moneda?.trim() ?? '';
}

function numero(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Los símbolos van pegados al número; cualquier cosa con letras (un código, o
// algo raro que haya leído la IA) lleva espacio para que se pueda leer.
function pegar(prefijo: string, n: number): string {
  if (!prefijo) return numero(n);
  return /[a-zA-Z]/.test(prefijo) ? `${prefijo} ${numero(n)}` : `${prefijo}${numero(n)}`;
}

/** Monto de un ticket o de un ítem: siempre con símbolo (€23,50). */
export function montoConSimbolo(total: number | null | undefined, moneda: string | null | undefined): string {
  if (total == null) return '';
  return pegar(simboloMoneda(moneda), total);
}

/** Monto de un total agregado: con código (EUR 128,40). */
export function montoConCodigo(total: number | null | undefined, moneda: string | null | undefined): string {
  if (total == null) return '';
  const c = codigoMoneda(moneda);
  return c ? `${c} ${numero(total)}` : numero(total);
}
