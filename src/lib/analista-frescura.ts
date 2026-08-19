// Decide si conviene correr el Analista solo (sin que Matías lo dispare a mano).
// La idea: que aparezca cuando tiene algo nuevo que decir, pero sin gastar una
// corrida de Gemma (~30s) en cada visita. Reglas:
//  - Si no hay ninguna señal registrada, no hay nada que analizar.
//  - Si nunca se analizó y hay datos, corré.
//  - Si no hubo señales nuevas desde el último análisis, no corras (nada cambió).
//  - Si hubo señales nuevas pero el último análisis es reciente (< minDias), esperá.
//  - Si hubo señales nuevas y el último análisis ya tiene minDias o más, corré.

export function necesitaAnalisis(
  ultimoAnalisisISO: string | null,
  ultimaSenalISO: string | null,
  hoy: Date = new Date(),
  minDias = 2,
): boolean {
  if (!ultimaSenalISO) return false; // no hay datos
  if (!ultimoAnalisisISO) return true; // hay datos y nunca se analizó

  const ultimoAnalisis = new Date(ultimoAnalisisISO).getTime();
  const ultimaSenal = new Date(ultimaSenalISO).getTime();
  if (ultimaSenal <= ultimoAnalisis) return false; // nada nuevo desde el último análisis

  const diasDesde = (hoy.getTime() - ultimoAnalisis) / 86_400_000;
  return diasDesde >= minDias;
}
