const MS_DIA = 86_400_000;

function inicioDelDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function etiquetaFecha(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso);
  const dias = Math.floor((inicioDelDia(ahora) - inicioDelDia(fecha)) / MS_DIA);
  if (dias <= 0) {
    return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
  }
  if (dias === 1) return 'Ayer';
  if (dias < 7) {
    const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(fecha).replace('.', '');
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  }
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
