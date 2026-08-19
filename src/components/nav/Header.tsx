export function Header() {
  const fecha = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date())
    .replaceAll('.', '');
  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="flex items-baseline justify-between px-4 py-4">
        <span className="font-mono text-[15px] font-semibold tracking-[0.4px] text-ambar">Tegmento</span>
        <span className="font-mono text-[12px] text-muted">{fecha}</span>
      </div>
    </header>
  );
}
