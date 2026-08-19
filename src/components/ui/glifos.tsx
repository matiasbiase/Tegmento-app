// UN CONCEPTO, UN DIBUJO. Los trazos de adentro de cada ícono, sueltos, para
// que cualquier pantalla los meta en su propio <svg> (con su tamaño, su color y
// su grosor) sin volver a dibujarlos.
//
// ── Por qué existe este archivo (26/07/2026, pedido de Matías) ───────────────
// El sueño se dibujaba de DOS formas distintas en CUATRO lugares (luna con
// destello en los chips y en Registrar, luna con Z en Cuerpo). La comida era
// cubiertos en la Casa y manzana en Cuerpo. Y "cuerpo" seguía siendo un corazón
// en el destacado aunque ya era un busto en las barras.
// Cuando el mismo concepto se dibuja distinto según la pantalla, deja de ser un
// idioma y pasa a ser ruido: la forma ya no significa nada.
//
// REGLA: si un concepto necesita ícono, su trazo vive ACÁ y se importa. No se
// vuelve a dibujar a mano en una pantalla.

import { NEURONA_CONEXIONES } from './neurona-path';

/** Descanso · sueño — luna con la Z. */
export const GLIFO_LUNA = (
  <>
    <path d="M19.5 14.2A7.6 7.6 0 1 1 9.8 4.5a6 6 0 0 0 9.7 9.7z" />
    <path d="M14.6 3.2h3.2l-3.2 3.6h3.2" />
  </>
);

/** Alimentación · comida — manzana con el cabito. */
export const GLIFO_MANZANA = (
  <>
    <path d="M12 8.4c-1-1.1-2.4-1.7-3.8-1.5C5.6 7.2 4 9.6 4 12.8c0 3.6 2.4 7.7 4.6 7.7 1 0 1.9-.4 2.6-.8.5-.3 1.1-.3 1.6 0 .7.4 1.6.8 2.6.8 2.2 0 4.6-4.1 4.6-7.7 0-3.2-1.6-5.6-4.2-5.9-1.4-.2-2.8.4-3.8 1.5z" />
    <path d="M12 8.4V5.6M12 5.6c0-1.3 1-2.4 2.4-2.6" />
  </>
);

/** Cómo venís · energía y libido — un pulso. */
export const GLIFO_PULSO = <path d="M2.5 12.5h4l2-5.5 3.5 10 2.5-7 1.8 4h5.2" />;

/** Lo que no se ve — el cerebro. */
export const GLIFO_CEREBRO = (
  <>
    <path d="M12 4.2v15.4" />
    <path d="M12 5.2A2.9 2.9 0 0 0 6.6 6.6 2.8 2.8 0 0 0 4.6 11a3 3 0 0 0 .5 4.4 2.9 2.9 0 0 0 3 3.4A2.6 2.6 0 0 0 12 19.6" />
    <path d="M12 5.2a2.9 2.9 0 0 1 5.4 1.4 2.8 2.8 0 0 1 2 4.4 3 3 0 0 1-.5 4.4 2.9 2.9 0 0 1-3 3.4 2.6 2.6 0 0 1-3.9.8" />
    <path d="M9.2 9.4c.9.3 1.6 1 1.9 1.9M14.8 12.8c-.9.3-1.6 1-1.9 1.9" />
  </>
);

/**
 * Cuerpo — busto de perfil con la nariz en punta.
 * ⚠️ El contorno de la cabeza NO se cierra a propósito: cerrarlo dibuja una
 * recta del mentón a la nuca que parece partir la cabeza del cuerpo.
 */
// ⚠️ SIN CUELLO (30/07, Matías: *"no me gusta que esté marcado el cuello"*).
// Antes cada hombro arrancaba con un tramito vertical desde la mandíbula
// (`v2.1` de un lado, `v-1.7` del otro) y a este tamaño —15 px en la barra— esos
// dos palitos se leían como un cuello flaco y marcado. Ahora los hombros
// arrancan directo a la altura donde terminaban esos tramos, así que la silueta
// es la misma y lo que desaparece es la línea del medio.
// ⚠️ ES EL BUSTO ORIGINAL, CON UN SOLO CAMBIO. Léase antes de "mejorarlo".
//
// El 30/07 se probó sacarle el cuello entero: primero borrando los dos tramitos
// verticales, después pegando los hombros directo a la cabeza. Las dos versiones
// se descartaron —Matías: *"el nuevo no me gusta, se ve como sin cuello, se ve
// raro. El primero estaba bien"*—. El cuello y los hombros bajos son lo que hace
// que se lea como una persona.
//
// Lo único que estaba mal era la rayita del lado de la NARIZ: arrancaba en
// y=15.6, a la altura de la mandíbula, y esa línea larga y alta se leía como
// parte de la cara. Ahora arranca en y=16.9 y mide 0.8 en vez de 2.1: *"apenas
// una rayita corta que los una"*. El hombro termina exactamente donde terminaba.
//
// ⚠️ Los dos lados NO son simétricos a propósito (0.8 acá, 1.7 del otro lado):
// el trazo de la cabeza baja más de este lado, así que una rayita igual de larga
// volvería a subirse a la cara.
export const GLIFO_BUSTO = (
  <>
    <path d="M14.8 16.9v.8c0 .5.4.9.9.9 2.4.4 4.3 2.3 4.3 4.4" />
    <path d="M4 23c0-2.5 2.2-4.5 5-4.8.5-.1.9-.5.9-1v-1.7" />
    <path d="M9.9 15.5C8 14.4 6.8 12.4 6.8 10.1 6.8 6.6 9.4 4 12.6 4c2.6 0 4.8 1.7 5.5 4.2l1.3 3.4c.2.5-.1 1-.6 1.1l-1.5.3v1.6c0 1-.8 1.8-1.8 1.8" />
  </>
);

/**
 * Patrones — una NEURONA: cuatro terminales a alturas desparejas, el soma que
 * reparte, y el axón bajando. La anatomía ya tiene forma de T, que es la inicial
 * de Tegmento: las dendritas se abren en abanico y el axón baja.
 *
 * ── Rediseño del 03/08/2026, a trazo de lápiz ───────────────────────────────
 * ⚠️ LAS CONEXIONES SE PINTAN CON `fill`, NO CON `stroke`. Un stroke mide lo
 * mismo de punta a punta por definición, y lo que Matías pedía era justo lo
 * contrario: que el trazo tenga anchos y angostos DENTRO de la misma raya, como
 * un lápiz. Así que cada conexión es una figura rellena cuyos dos bordes se
 * separan y se juntan a lo largo del tramo. El eje de cada raya es una RECTA;
 * lo deforme es el trazo.
 *
 * ⚠️ NO EDITAR `NEURONA_CONEXIONES` A MANO. Sale de scripts/gen-neurona.mjs,
 * que es la fuente de verdad. Para cambiar el dibujo se toca el generador y se
 * corre `npm run neurona`.
 *
 * Lo que se decidió, y por qué:
 * - **Abanico achatado al 55%**: sube el terminal más bajo y baja el más alto.
 *   Se lee más como T sin perder lo desparejo, que es lo que la hace ver viva.
 * - **El soma bajó de r2.4 a r1.7**: tenía casi 3× el área de los otros nodos y
 *   competía. Ahora reparte en vez de mandar.
 * - **Las cinco rayas se eligieron una por una** de un catálogo de 16 por
 *   posición: 1B6 · 2A4 · 3B3 · 4B6 · 5B1.
 *
 * ⚠️ ACÁ VA 1.18 Y EN EL ÍCONO DE LA APP VA 1.00. NO SON UN ERROR NI HAY QUE
 * "EMPAREJARLOS": son dos problemas distintos y por eso tienen dos números.
 * - El PNG de la app se ve SOLO, dentro de su cuadrado, al lado de otras apps
 *   que también tienen su propio marco. Ahí 1.00 le da aire — decisión de
 *   Matías mirándolo en una pantalla de inicio.
 * - Este glifo convive en la barra con Home, Buscar y Perfil, que llenan casi
 *   toda su caja de 24. A 1.00 se veía más chico que sus vecinos; a 1.18 pesa
 *   igual. Se comparó lado a lado en
 *   docs/maquetas/2026-08-03-glifo-escala-100-vs-118.html.
 * Si alguna vez se cambia uno, hay que volver a mirar el otro, no copiarlo.
 *
 * ⚠️ Las conexiones van PRIMERO en el marcado, para quedar detrás de los nodos.
 * ⚠️ La opacidad .45 de las conexiones es lo que reemplaza al gris del ícono de
 * la app (#8b8b9e sobre nodos #f2f1fa): acá todo es `currentColor`, así que la
 * diferencia de peso se hace con opacidad y no con otro color.
 */
export const GLIFO_NEURONA = (
  // Se escala con transform desde el centro y no recalculando cada punto, que
  // es donde se cometen errores.
  <g transform="translate(12 12) scale(1.18) translate(-12 -12)">
    <path d={NEURONA_CONEXIONES} fill="currentColor" stroke="none" opacity=".45" />
    <g fill="currentColor" stroke="none">
      <circle cx="4.4" cy="7.74" r="1.62" />
      <circle cx="9.4" cy="5.95" r="1.62" />
      <circle cx="14.8" cy="7" r="1.62" />
      <circle cx="19.6" cy="7.15" r="1.62" />
      <circle cx="12" cy="12.7" r="1.7" />
      <circle cx="12" cy="19.3" r="1.62" />
    </g>
  </g>
);

/** Calma — cara de alivio. Los rasgos van más finos que el contorno. */
export const GLIFO_CALMA = (
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M7.3 10.4c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9M13.5 10.4c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9" strokeWidth="1.45" />
    <path d="M10.3 15.3c.5.35 1.1.5 1.7.5s1.2-.15 1.7-.5" strokeWidth="1.45" />
  </>
);

/**
 * La IA · el asistente — dos ojos y nada más.
 *
 * Elegido por Matías (27/07) entre estrellas y caritas. Va **sin contorno**: el
 * círculo lila del avatar ya hace de cabeza, y dibujarle otro círculo adentro lo
 * volvía una cara más — la app ya tiene la de Ánimo y la de Calma, y tres caras
 * compitiendo hacen que la forma deje de decir qué es cada cosa.
 *
 * ⚠️ Los ojos NO van centrados en la caja. Con `cy=12` quedaban en el medio del
 * círculo y se leían como dos gotas o dos comillas. Subidos a 10.7 caen en el
 * tercio de arriba, que es donde el ojo espera unos ojos (pedido suyo: "un
 * poquito más arriba para que se entienda que son ojos").
 *
 * Van con `fill` y sin trazo: quien lo use puede dejar su `stroke` como esté.
 */
export const GLIFO_IA = (
  <g className="pestanea-ia" fill="currentColor" stroke="none">
    <ellipse cx="8.5" cy="10.7" rx="1.95" ry="2.9" />
    <ellipse cx="15.5" cy="10.7" rx="1.95" ry="2.9" />
  </g>
);

/**
 * Tareas — EL TILDE EN LA CAJA.
 *
 * ⚠️ BAJÓ ACÁ PORQUE ESTABA ESCRITO A MANO EN TRES ARCHIVOS (06/08): el menú
 * lateral, el renglón de una tarea y los chips del chat. Se mudó al pedir Matías
 * los íconos en la barrita de Seguimiento, que iba a ser **la cuarta copia**.
 *
 * Es exactamente la trampa del avión de ayer: el mismo dibujo escrito en dos
 * lados, roto en los dos, arreglado en uno. Cuatro copias de un path no son
 * cuatro íconos, son cuatro oportunidades de que se despeguen.
 */
export const GLIFO_TILDE_CAJA = (
  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
);

/**
 * Seguimiento — TRES BARRITAS QUE SE VAN LLENANDO (30/07, idea de Matías).
 *
 * Se leen de izquierda a derecha como días, y la última es hoy:
 *   1ª  vacía                → un día que no completaste
 *   2ª  LLENA, igual de alta → el que sí
 *   3ª  la más alta y VACÍA  → hoy, que es la que está esperando
 *
 * ⚠️ QUE LA MÁS ALTA ESTÉ VACÍA ES EL PUNTO ENTERO (corrección suya): es la
 * barra de hoy sin llenar, así el ícono mira hacia adelante y no hacia lo hecho.
 * Rellena diría "ya está", que es justo lo que decía el tilde al que reemplazó.
 *
 * ⚠️ LA 2ª MIDE 0.5 MÁS QUE LA 1ª Y NO ES UN ERROR: es para que se vean IGUALES.
 * Una figura maciza parece menor que una hueca del mismo tamaño, porque el hueco
 * se percibe hasta el borde de afuera y el macizo hasta el relleno. Lo cazó él
 * mirándolo. Sube sola por arriba; abajo las tres apoyan en la misma línea
 * (y=20.5), que es lo que hace que se lean derechas.
 *
 * ⚠️ VAN BIEN SEPARADAS aun a costa de que el ícono sea más ancho que sus
 * vecinos (*"ahí se ve todo muy amontonado"*): tres barras pegadas con trazo
 * fino se leen como un bloque rayado, no como tres cosas.
 *
 * ⚠️ QUIEN LO DIBUJE TIENE QUE USAR `strokeWidth={1.5}`, no el 1.9 de la casa:
 * con el trazo grueso el relleno se come el hueco de las vacías y las tres
 * barras se ven iguales, que es justo lo contrario de lo que el ícono cuenta.
 *
 * ⚠️ Bajó acá el 06/08 por lo mismo que el tilde: estaba copiado a mano en la
 * barra de abajo y en los chips del chat, y la barrita de Seguimiento iba a ser
 * la tercera.
 */
export const GLIFO_SEGUIMIENTO = (
  <>
    <rect x="2.2" y="8.5" width="4.6" height="12" rx="1.3" />
    <rect x="9.7" y="8" width="4.6" height="12.5" rx="1.3" fill="currentColor" />
    <rect x="17.2" y="4" width="4.6" height="16.5" rx="1.3" />
  </>
);

/**
 * Rueda de la vida — OCHO QUESITOS, UNO POR ÁREA.
 *
 * ⚠️ SON OCHO PORQUE SON OCHO: es la cantidad exacta de `AREAS_GUIA` en
 * `lib/rueda-vida.ts`. El dibujo anterior era un círculo con dos o cuatro
 * rayas y se leía como un reloj o como un gráfico de torta de tres — Matías,
 * mirándolo: *"le haría dividido en ocho… parece un gráfico de torta"*.
 *
 * ⚠️ VA RELLENO, Y ESO ROMPE LA REGLA DE LA CASA (*íconos a trazo, nunca
 * rellenos*), igual que la llamita de la racha. La excepción se paga por lo
 * mismo: **con ocho rayas y nada más, a 21px el ícono es un borrón gris**. Los
 * quesitos alternados son lo único que hace que se cuente "ocho" de un vistazo,
 * porque lo que separa no es la línea sino el contraste lleno/vacío. Es el mismo
 * argumento que la segunda barrita de `GLIFO_SEGUIMIENTO`: a este tamaño manda
 * el relleno, no el contorno.
 *
 * ⚠️ Se probó también rellenar cada quesito hasta SU puntaje —la rueda de verdad,
 * la del usuario— y es la versión más honesta, pero a 21px los ocho radios
 * distintos se empastan. Eligió los alternados (06/08). Si algún día el ícono
 * vive a 40px o más, la de puntajes vale la pena de nuevo.
 *
 * Quien lo dibuje pone el `<circle>` de afuera con su propio grosor de trazo.
 */
export const GLIFO_RUEDA = (
  <>
    <g fill="currentColor" fillOpacity="0.85" stroke="none">
      <path d="M12 12L12 3.5A8.5 8.5 0 0 1 18.01 5.99Z" />
      <path d="M12 12L20.5 12A8.5 8.5 0 0 1 18.01 18.01Z" />
      <path d="M12 12L12 20.5A8.5 8.5 0 0 1 5.99 18.01Z" />
      <path d="M12 12L3.5 12A8.5 8.5 0 0 1 5.99 5.99Z" />
    </g>
    <circle cx="12" cy="12" r="8.5" />
  </>
);
