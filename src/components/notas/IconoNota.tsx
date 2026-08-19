/**
 * EL DIBUJITO DE LA NOTA: DIEZ ÍCONOS, NO DIEZ EMOJIS (06/08).
 *
 * Matías: *"la etiqueta, no sé por qué son emojis; si no son loguitos, podrían
 * ser loguitos, más que nada íconos de los que ya tenemos"*.
 *
 * ⚠️ Y TIENE RAZÓN POR ALGO QUE VA MÁS ALLÁ DEL GUSTO: **un emoji lo dibuja el
 * sistema operativo, no la app.** El mismo 💶 se ve distinto en el iPhone, en la
 * Mac y en el Android, con colores que no salen de esta paleta y un peso que no
 * combina con ningún otro ícono de la pantalla. Era lo único de Tegmento que no
 * controlábamos.
 *
 * ⚠️ SE REUSAN LOS GLIFOS QUE YA EXISTEN donde los hay —la manzana de comida, la
 * casa, el billete de Finanzas, el pulso— porque es la regla de la casa: un
 * concepto, un dibujo. Los que faltaban se dibujaron acá con el mismo trazo.
 *
 * ── COMPATIBILIDAD CON LO VIEJO ──────────────────────────────────────────────
 * ⚠️ La columna `notas.emoji` sigue siendo texto y sigue guardando lo que había:
 * las notas que ya tenían un emoji **lo siguen mostrando tal cual**. Si el valor
 * guardado es una de estas claves, se dibuja el ícono; si no, se muestra el
 * texto. No hay migración, no hay nota que se quede sin su marca, y una nota
 * vieja se pasa a ícono sola en cuanto la tocás.
 */
import { GLIFO_MANZANA, GLIFO_PULSO } from '@/components/ui/glifos';
import { CLAVES_ICONO_NOTA } from '@/lib/notas';

const t = (d: React.ReactNode) => d;

export const ICONOS_NOTA: { clave: string; nombre: string; trazo: React.ReactNode }[] = [
  { clave: 'idea', nombre: 'Idea', trazo: t(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.3-1 2.1H9.5c0-.8-.4-1.6-1-2.1A6 6 0 0 1 12 3z" />) },
  { clave: 'trabajo', nombre: 'Trabajo', trazo: t(<><rect x="2.5" y="7" width="19" height="13" rx="2.5" /><path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7" /></>) },
  { clave: 'plata', nombre: 'Plata', trazo: t(<><path d="M4 5h16v14l-2.5-1.5L15 19l-3-1.5L9 19l-2.5-1.5L4 19z" /><path d="M8 9h8M8 12.5h5" /></>) },
  { clave: 'cuerpo', nombre: 'Cuerpo', trazo: GLIFO_PULSO },
  { clave: 'comida', nombre: 'Comida', trazo: GLIFO_MANZANA },
  // ⚠️ EL AVIÓN SE REDIBUJÓ DE CERO (06/08). El viejo venía roto de fábrica —el
  // trazo no cerraba, así que le faltaba un borde entero— pero remendarlo no
  // alcanzó: cerrado seguía sin gustarle. Matías, después de dos vueltas:
  // *"está como raro, le falta la colita… y no en punta como una estrella, sino
  // más rectangular"*.
  //
  // ⚠️ Y LO DE LA ESTRELLA ERA EL DIAGNÓSTICO, no una manera de decir. El dibujo
  // viejo terminaba en CUATRO puntas afiladas —las dos alas, el estabilizador y
  // la nariz— saliendo de un centro, que es literalmente cómo se construye una
  // estrella. A 23px el ojo lee primero la silueta, y esa silueta era una
  // estrella deforme, no un avión.
  //
  // Este va al revés: cada punta termina en un corte RECTO, el fuselaje es una
  // barra de ancho parejo y la nariz es lo único curvo. Nada sale en punta, y la
  // cola es una pieza aparte que se ve como pieza — que era lo que faltaba.
  //
  // ⚠️ Y VA EN ÁNGULO, NO DERECHO (06/08, Matías: *"me gustaría que esté en
  // ángulo, o sea, que esté en angulito"*). Es la pose con la que se dibuja un
  // avión cuando quiere decir VIAJE y no "aeropuerto": derecho y de frente es un
  // símbolo de señalética, inclinado es algo yéndose.
  //
  // ⚠️ Y VA CHICO A PROPÓSITO, CONTRA LO QUE PARECÍA OBVIO. Al rotar 45° la
  // silueta se mete para adentro del cuadro (las cuatro puntas dejan de tocar
  // los bordes y pasan a las diagonales), así que el avión queda ~27% más chico
  // que la casa o la estrella de al lado. Se le mostraron las dos: agrandado
  // para igualarlos, y tal cual. Eligió tal cual, y **más chico todavía**:
  // *"usá el 45 grados sin agrandar, incluso lo achicaría un poco"*. De ahí el
  // 0,92 que está metido en los números de abajo (el dibujo aprobado × 0,92
  // alrededor del centro).
  //
  // ⚠️ EL TAMAÑO VA EN EL PATH Y EL GIRO EN EL `transform`, y esa división no es
  // capricho: **escalar con `transform` también cambia el grosor del trazo.** Un
  // `scale(.92)` sobre un stroke de 1.9 lo adelgaza a 1.75, y este avión convive
  // con otros diez íconos que tienen que tener exactamente el mismo peso de
  // línea. Compensarlo obliga a escribir el grosor dividido a mano —un número
  // mágico que además nace roto, porque `IconoNota` dibuja con 1.9 y
  // `GlifoObjetivo` con 1.8, así que un solo valor le miente a uno de los dos—.
  // Con la escala adentro del path no hay nada que compensar. **Rotar sí es
  // gratis**: no toca el grosor, y por eso es lo único que quedó en el atributo.
  { clave: 'viaje', nombre: 'Viaje', trazo: t(<g transform="rotate(45 12 12)"><path d="M12 3.35c-.83 0-1.38 .92-1.38 2.12V9.24L4.09 12.55v1.66l6.53-1.01v3.59L9.24 18.53v1.38L12 19.27l2.76 .64v-1.38L13.38 16.78v-3.59l6.53 1.01v-1.66L13.38 9.24V5.47c0-1.2-.55-2.12-1.38-2.12z" /></g>) },
  { clave: 'estudio', nombre: 'Estudio', trazo: t(<><path d="M4 5.5h6a3 3 0 0 1 2 .9 3 3 0 0 1 2-.9h6v13h-6a3 3 0 0 0-2 .9 3 3 0 0 0-2-.9H4z" /><path d="M12 6.4v13" /></>) },
  // ⚠️ EL SEGUNDO TENÍA HOMBROS Y NO TENÍA CABEZA (06/08, Matías: *"al logo de
  // dos personas le falta la otra cabecita"*). El arco de los hombros estaba
  // desde el principio, así que el ícono decía "dos personas" con una sola
  // cabeza: se leía como una persona con una mancha al lado.
  //
  // ⚠️ Y ES MEDIO CÍRCULO, NO UN CÍRCULO ENTERO (misma tarde, corrección suya:
  // *"no es un círculo entero, tendría que ser medio círculo… la silueta más o
  // menos replicada"*). Y tiene razón por lo que el ícono cuenta: **el segundo
  // está DETRÁS del primero**, y una cabeza entera lo pone al lado.
  //
  // ⚠️ PERO EL MEDIO CÍRCULO ESTABA CORTADO PARA EL LADO EQUIVOCADO (06/08,
  // Matías: *"está el mitad círculo, pero tenía que ser mitad círculo lateral,
  // no de arriba"*). Era un domo —la mitad de ARRIBA de un círculo, cortada en
  // horizontal— y eso dibuja a alguien enterrado hasta los ojos, no alguien
  // tapado por otro. **Quien te tapa está al lado tuyo, así que la línea del
  // corte es VERTICAL**: se ve la mitad derecha de la cabeza y la izquierda
  // queda del lado del que está adelante. Es el mismo corte que usan los íconos
  // de "grupo" de cualquier set serio, y por la misma razón.
  //
  // ⚠️ Y LA CABEZA PASÓ A MEDIR LO MISMO QUE LA DE ADELANTE (r 3.2, mismo cy):
  // achicarla la convertía en otra cosa. Con el corte vertical, media cabeza
  // chiquita al lado de una entera se leía como un `3` pegado a la persona —se
  // probaron r 2.3 y r 2.6 y las dos hacían eso. Replicada del todo y tapada a
  // la mitad se lee de una: *"la silueta más o menos replicada"*, textual.
  // Los hombros son el mismo arco del de adelante, también partido al medio.
  { clave: 'gente', nombre: 'Gente', trazo: t(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c1.1-3.2 3.2-4.8 6-4.8s4.9 1.6 6 4.8" /><path d="M15.4 5.3a3.2 3.2 0 0 1 0 6.4" /><path d="M17 15.4c2.2.6 3.8 2.2 4.6 4.6" /></>) },
  { clave: 'casa', nombre: 'Casa', trazo: t(<path d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />) },
  { clave: 'importante', nombre: 'Importante', trazo: t(<path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />) },
];

const POR_CLAVE = new Map(ICONOS_NOTA.map((i) => [i.clave, i]));

// ⚠️ LAS DOS LISTAS TIENEN QUE DECIR LO MISMO. `CLAVES_ICONO_NOTA` vive en
// `lib/notas` porque la usa una server action (que no puede importar JSX), y
// esta de acá tiene los dibujos. Si se desincronizan, una clave válida se
// guardaría y no se dibujaría — que es exactamente el bug del recorte a dos
// caracteres, con otra cara. Este chequeo lo hace fallar en desarrollo.
if (process.env.NODE_ENV !== 'production') {
  const faltan = [...CLAVES_ICONO_NOTA].filter((c) => !POR_CLAVE.has(c));
  const sobran = ICONOS_NOTA.filter((i) => !CLAVES_ICONO_NOTA.has(i.clave)).map((i) => i.clave);
  if (faltan.length || sobran.length) {
    console.error('ICONOS_NOTA y CLAVES_ICONO_NOTA no coinciden:', { faltan, sobran });
  }
}

/** ¿Este valor guardado es una clave de ícono, o un emoji viejo? */
export function esClaveIcono(valor: string | null | undefined): boolean {
  return valor != null && POR_CLAVE.has(valor);
}

export function IconoNota({ valor, className = 'size-[15px]' }: { valor: string; className?: string }) {
  const def = POR_CLAVE.get(valor);
  // Emoji viejo: se muestra tal cual, que es lo que la nota siempre tuvo.
  if (!def) return <span className={className}>{valor}</span>;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={def.nombre}
    >
      {def.trazo}
    </svg>
  );
}
