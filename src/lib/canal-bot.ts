/**
 * EL CANAL POR EL QUE EL HOME LE PASA LA BARAJA A LA BARRA DE ESCRIBIR.
 *
 * Desde el 12/08 la pregunta del bot **se dibuja adentro de la barra** (propuesta
 * C), y ahí aparece un problema de árbol: las tarjetas las arma el server en
 * `chat/page.tsx` y bajan a `AsistenteEntrada`, mientras que la barra vive en
 * `BarraGlobal`, que el LAYOUT monta al lado de `{children}`. Son hermanos: no
 * hay prop que vaya de uno al otro.
 *
 * ⚠️ ES EL MISMO HUECO QUE YA RESOLVIERON `enfocar-composer` y
 * `escribir-en-composer`, y por eso esto no inventa un mecanismo nuevo: la app
 * ya habla layout↔página por afuera de React. Lo que agrega es la parte que un
 * `dispatchEvent` pelado no da.
 *
 * ⚠️⚠️ **POR QUÉ GUARDA EL ÚLTIMO VALOR Y NO ES UN EVENTO A SECAS.** Los efectos
 * corren de adentro para afuera: `AsistenteEntrada` está dentro de `{children}`,
 * así que **publica antes de que `BarraGlobal` alcance a suscribirse**. Con un
 * evento pelado, el primer envío —el único que importa, el de la carga— se
 * pierde siempre y la barra arranca sin pregunta hasta que algo la vuelva a
 * disparar. Guardando el último valor, el que llega tarde igual lo recibe.
 *
 * ⚠️ El valor vive en memoria del módulo y no en `sessionStorage` a propósito:
 * es lo que la pantalla está mostrando AHORA, no una preferencia. Al recargar,
 * las tarjetas vuelven a venir del server.
 */

import type { TarjetaBot } from '@/components/chat/TarjetasBot';

type Escucha = (tarjetas: TarjetaBot[]) => void;

let ultimo: TarjetaBot[] = [];
const escuchas = new Set<Escucha>();

/**
 * El Home avisa qué tiene el bot para decir. Lo llama también con `[]` al
 * desmontarse: la pregunta es del Home, y si te fuiste a otra pantalla la barra
 * no tiene por qué seguir mostrándola.
 */
export function publicarBaraja(tarjetas: TarjetaBot[]) {
  ultimo = tarjetas;
  escuchas.forEach((f) => f(tarjetas));
}

/** La barra se engancha y recibe enseguida lo último que se publicó. */
export function escucharBaraja(f: Escucha): () => void {
  escuchas.add(f);
  f(ultimo);
  return () => {
    escuchas.delete(f);
  };
}

/**
 * Lo último publicado, para arrancar el estado YA con el valor correcto
 * (`useState(ultimaBaraja)`) en vez de `[]` a la espera del efecto.
 *
 * ⚠️ SIN ESTO LA BARRA PARPADEA CADA VEZ QUE VOLVÉS AL HOME (12/08). `BarraGlobal`
 * se desmonta al entrar a una conversación (`/chat/123`) y se vuelve a montar al
 * salir; con `useState([])` arranca vacía un instante —sin la pregunta del
 * bot— hasta que su efecto llega a suscribirse. Leer el valor ya publicado en
 * el inicializador salta ese instante vacío entero.
 */
export function ultimaBaraja(): TarjetaBot[] {
  return ultimo;
}

/** Solo para los tests: deja el canal como recién importado. */
export function limpiarCanal() {
  ultimo = [];
  escuchas.clear();
}
