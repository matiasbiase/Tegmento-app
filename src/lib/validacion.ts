export type ScoreCheckin = { areaId: number; score: number };

export function validarScores(scores: ScoreCheckin[]): string | null {
  if (scores.length === 0) return 'Sin áreas para puntuar';
  for (const s of scores) {
    if (!Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
      return `Score inválido (${s.score}), tiene que ser un entero entre 1 y 5`;
    }
  }
  return null;
}
