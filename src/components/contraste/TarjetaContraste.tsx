'use client';

import { MedidorCuidado } from '@/components/ui/MedidorCuidado';
import { leerCuidado } from '@/lib/cuidado';

type Texto = string | string[] | undefined;

export type ResultadoContraste = {
  modo?: 'otracara' | 'mapa' | 'interpretacion';
  /** Grado de cuidado 0-100. `carga` es el nombre viejo, en los análisis guardados. */
  cuidado?: number;
  carga?: number;
  /** Por qué ese grado de cuidado, puntual para este contenido. */
  porQue?: Texto;
  // otracara
  steelman?: Texto;
  faltaDato?: Texto;
  emocion?: Texto;
  pregunta?: Texto;
  // interpretacion (algo que pasó con otra persona)
  loQueQuisiste?: Texto;
  comoLoPuedeLeer?: Texto;
  dondeSeTuerce?: Texto;
  loQueNoSabes?: Texto;
  // mapa
  afirma?: Texto;
  cargado?: Texto;
  dejaAfuera?: Texto;
  quienGana?: Texto;
  otraCampana?: Texto;
  preguntas?: Texto;
};

// Gemma a veces devuelve un campo como array; lo unificamos a texto legible.
function txt(v: Texto): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return typeof v === 'string' ? v : '';
}

function Fila({ label, color, tint, children }: { label: string; color: string; tint: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-[8px]" style={{ background: tint }}>
        <span className="size-[7px] rounded-full" style={{ background: color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] font-bold tracking-[0.4px]" style={{ color }}>{label}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-tinta-soft text-pretty">{children}</p>
      </div>
    </div>
  );
}

export function TarjetaContraste({ r }: { r: ResultadoContraste }) {
  const mapa = r.modo === 'mapa';
  const interpretacion = r.modo === 'interpretacion';
  const afirma = txt(r.afirma), cargado = txt(r.cargado), dejaAfuera = txt(r.dejaAfuera);
  const quienGana = txt(r.quienGana), otraCampana = txt(r.otraCampana);
  const steelman = txt(r.steelman), faltaDato = txt(r.faltaDato), emocion = txt(r.emocion), pregunta = txt(r.pregunta);
  const preguntas = Array.isArray(r.preguntas) ? r.preguntas.filter(Boolean) : r.preguntas ? [String(r.preguntas)] : [];
  // Lo personal no lleva medidor de cuidado: no es un texto que quiera
  // convencer a nadie, es algo que le pasó. Poner un puntaje ahí no significa
  // nada. Y arranca por lo que él quiso decir, para que no se sienta corregido.
  if (interpretacion) {
    return (
      <div className="tarjeta bg-white sombra-card">
        <p className="font-mono text-[11px] font-bold tracking-[0.4px] text-niebla">Cómo puede haberlo leído</p>
        {txt(r.loQueQuisiste) && (
          <p className="mt-2 rounded-[12px] bg-papel-2 p-[11px_13px] text-[13px] leading-snug text-tinta-soft text-pretty">
            {txt(r.loQueQuisiste)}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          {txt(r.comoLoPuedeLeer) && (
            <Fila label="Del otro lado puede sonar a" color="var(--color-iris-deep)" tint="var(--color-iris-soft)">{txt(r.comoLoPuedeLeer)}</Fila>
          )}
          {txt(r.dondeSeTuerce) && (
            <Fila label="Dónde se separa de lo que quisiste" color="var(--color-oro)" tint="var(--color-ambar-tint)">{txt(r.dondeSeTuerce)}</Fila>
          )}
          {txt(r.loQueNoSabes) && (
            <Fila label="Lo que no podés ver desde acá" color="var(--color-niebla)" tint="var(--color-gris-tint)">{txt(r.loQueNoSabes)}</Fila>
          )}
          {txt(r.pregunta) && (
            <div className="rounded-[12px] bg-iris-soft p-[11px_13px]">
              <p className="text-[15px] font-semibold leading-snug text-iris-deep text-pretty">{txt(r.pregunta)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tarjeta bg-white sombra-card">
      <MedidorCuidado cuidado={leerCuidado(r)} porQue={txt(r.porQue)} />
      <div className="mt-4 flex flex-col gap-3">
        {mapa ? (
          <>
            {afirma && <Fila label="Qué afirma" color="var(--color-iris-deep)" tint="var(--color-iris-soft)">{afirma}</Fila>}
            {cargado && <Fila label="Lenguaje cargado" color="var(--color-rosa)" tint="var(--color-rosa-tint)">{cargado}</Fila>}
            {dejaAfuera && <Fila label="Qué deja afuera" color="var(--color-oro)" tint="var(--color-ambar-tint)">{dejaAfuera}</Fila>}
            {quienGana && <Fila label="A quién le sirve" color="var(--color-niebla)" tint="var(--color-gris-tint)">{quienGana}</Fila>}
            {otraCampana && <Fila label="La otra campana" color="var(--color-verde)" tint="var(--color-verde-tint)">{otraCampana}</Fila>}
            {preguntas.length > 0 && (
              <div className="rounded-[12px] bg-iris-soft p-[11px_13px]">
                <p className="font-mono text-[11px] font-bold tracking-[0.4px] text-iris-deep">Antes de creerlo o compartirlo</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {preguntas.map((q, i) => (
                    <li key={i} className="text-[13px] leading-snug text-iris-deep text-pretty">· {q}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            {steelman && <Fila label="La otra cara, en su versión más fuerte" color="var(--color-verde)" tint="var(--color-verde-tint)">{steelman}</Fila>}
            {faltaDato && <Fila label="Qué dato falta" color="var(--color-oro)" tint="var(--color-ambar-tint)">{faltaDato}</Fila>}
            {emocion && <Fila label="Qué puede estar jugando" color="var(--color-rosa)" tint="var(--color-rosa-tint)">{emocion}</Fila>}
            {pregunta && (
              <div className="rounded-[12px] bg-iris-soft p-[11px_13px]">
                <p className="text-[15px] font-semibold leading-snug text-iris-deep text-pretty">{pregunta}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
