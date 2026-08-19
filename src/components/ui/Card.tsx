export function Card({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className="animar-entrada relieve rounded-app border border-borde bg-surface p-4">
      {titulo && (
        <h2 className="mb-2 font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">{titulo}</h2>
      )}
      {children}
    </section>
  );
}
