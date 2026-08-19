'use client';

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex-1 rounded-[12px] py-2.5 font-mono text-[12px] font-bold text-white"
      style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
    >
      Imprimir
    </button>
  );
}
