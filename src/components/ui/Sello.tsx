const variantes = {
  ambar: 'text-ambar border-ambar-deep',
  teal: 'text-teal border-teal-deep',
  muted: 'text-muted border-borde',
  brick: 'text-brick border-[#5a3028]',
} as const;

export function Sello({ children, color = 'ambar' }: { children: React.ReactNode; color?: keyof typeof variantes }) {
  return (
    <span className={`rounded-[4px] border px-1.5 font-mono text-[12px] tracking-wide ${variantes[color]}`}>
      {children}
    </span>
  );
}
