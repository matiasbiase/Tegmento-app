/**
 * EL CUADRADITO DEL OBJETIVO: EL DIBUJO, O LA FOTO.
 *
 * ⚠️ ES LO QUE HACE QUE UN OBJETIVO SE RECONOZCA DE UN VISTAZO en una lista, y
 * por eso nunca está vacío: si no elegiste nada, sale del título
 * (`adivinarIconoObjetivo`). El selector solo existe para corregirlo.
 *
 * ⚠️ Y LA FOTO LE GANA AL ÍCONO cuando hay una, sin preguntar: si te tomaste el
 * trabajo de ponerle una foto al viaje, esa foto ES la marca del objetivo. El
 * ícono queda guardado igual, así que sacar la foto lo devuelve intacto.
 */
import { ICONOS_NOTA } from '@/components/notas/IconoNota';
import { CLAVES_ICONO_OBJETIVO, iconoDeObjetivo } from '@/lib/objetivos-iconos';

/**
 * ⚠️ LOS DIEZ DE LAS NOTAS, MÁS LA BANDERA. Ver la nota de `objetivos-iconos.ts`:
 * los seis que la tarjeta ya dibujaba estaban copiados a mano acá, y por eso el
 * avión roto había que arreglarlo en dos archivos.
 */
export const ICONOS_OBJETIVO: { clave: string; nombre: string; trazo: React.ReactNode }[] = [
  ...ICONOS_NOTA,
  {
    clave: 'meta',
    nombre: 'Meta',
    trazo: (
      <>
        <path d="M6 21V4" />
        <path d="M6 4.5h11l-2.2 3.6L17 12H6z" />
      </>
    ),
  },
];

const POR_CLAVE = new Map(ICONOS_OBJETIVO.map((i) => [i.clave, i]));

// ⚠️ LAS DOS LISTAS TIENEN QUE DECIR LO MISMO, igual que en las notas: las claves
// viven en `lib/` porque las valida una server action (que no puede importar
// JSX) y los dibujos viven acá. Si se desincronizan, una clave se guardaría y no
// se dibujaría. Este chequeo lo hace fallar en desarrollo y no en tu teléfono.
if (process.env.NODE_ENV !== 'production') {
  const faltan = [...CLAVES_ICONO_OBJETIVO].filter((c) => !POR_CLAVE.has(c));
  const sobran = ICONOS_OBJETIVO.filter((i) => !CLAVES_ICONO_OBJETIVO.has(i.clave)).map((i) => i.clave);
  if (faltan.length || sobran.length) {
    console.error('ICONOS_OBJETIVO y CLAVES_ICONO_OBJETIVO no coinciden:', { faltan, sobran });
  }
}

/** Solo el trazo, por clave. Para el selector, donde no hay título del que deducir. */
export function GlifoObjetivo({ clave, className = 'size-[26px]' }: { clave: string; className?: string }) {
  const def = POR_CLAVE.get(clave) ?? POR_CLAVE.get('meta')!;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={def.nombre}
    >
      {def.trazo}
    </svg>
  );
}

export function IconoObjetivo({
  titulo,
  area,
  icono,
  portada,
}: {
  titulo: string;
  area: string | null;
  icono: string | null;
  /** Nombre del adjunto. Ver `objetivos.portada` en el schema. */
  portada: string | null;
}) {
  if (portada) {
    // eslint-disable-next-line @next/next/no-img-element -- adjunto local servido
    // por `/api/adjuntos`, sin dominio ni tamaños que optimizar.
    return (
      <img
        src={`/api/adjuntos/${portada}`}
        alt=""
        className="size-full rounded-[15px] object-cover"
      />
    );
  }
  return <GlifoObjetivo clave={iconoDeObjetivo(icono, titulo, area)} />;
}
