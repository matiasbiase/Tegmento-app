// EL PASO 6 DEL CEREBRO: el que revisa si un hallazgo es honesto antes de
// decírselo a Matías.
//
// Sale de una observación suya del 13/08 que vale copiar entera, porque es la
// que justifica todo el archivo:
//
//   *"'Tu ánimo los días que te juntás con amigos sube' no es una buena
//   relación, porque es obvio. Y hay que ver que haya registrado el ánimo
//   DESPUÉS de la juntada, si no es un dato sesgado. También tiene que haber un
//   analista de sesgos."*
//
// ⚠️⚠️ Y SUS DATOS LE DIERON LA RAZÓN DE UNA FORMA MÁS FUERTE DE LO ESPERADO:
//
//   Amigos      aparece 8/13  ·  bien o genial: 8/8   ← 100%
//   Identidad   aparece 4/13  ·  bien o genial: 2/4
//
// **Una correlación del 100% no existe en el mundo real.** Es la firma de que la
// etiqueta se elige POR el resultado: cuando abrís el check-in ya sabés cómo te
// sentís, y elegís "Amigos" porque estás bien. La causa y el efecto se registran
// en el mismo acto.
//
// ── LO QUE ESTE ARCHIVO NO HACE ─────────────────────────────────────────────
//
// ⚠️ No mide si algo es verdad: mide si el dato **puede sostener la afirmación**.
// Un hallazgo que pasa estos chequeos igual entra como `no_confirmado` — el que
// decide sigue siendo él. Esto solo evita que el bot le diga con cara de dato
// algo que la aritmética no banca.
//
// ⚠️ Y no usa IA. Cinco de los seis chequeos son aritmética sobre datos que ya
// están. Es a propósito: un modelo chico validando a otro modelo chico agrega
// una fuente de error, no la saca.

/** Un caso: la etiqueta que él eligió y cómo le fue ese día. */
export type Caso = {
  /** Los factores que marcó (ej. ["Amigos", "Identidad"]). */
  factores: string[];
  /** Si ese día fue de los buenos. */
  bien: boolean;
  /**
   * Si la causa y el efecto se registraron en el MISMO acto. Con el check-in de
   * ánimo es siempre `true`: elegís el factor y el estado en la misma pantalla.
   */
  mismoActo: boolean;
};

export type Veredicto =
  | { pasa: true; casos: number; deLosCuales: number }
  | { pasa: false; motivo: MotivoRechazo; detalle: string };

export type MotivoRechazo =
  | 'mismo-acto'
  | 'pocos-casos'
  | 'correlacion-perfecta'
  | 'tasa-base-alta'
  | 'confundidor';

/** Menos de esto no es una tendencia. Misma vara que `MINIMO_PARA_PATRON`. */
export const MINIMO_CASOS = 3;

/**
 * Si la etiqueta aparece en más de esta proporción de los casos, coincidir con
 * cualquier cosa deja de significar algo.
 *
 * ⚠️ 0,6 y no 0,5: con la mitad todavía discrimina. Amigos está en 8 de 13
 * (0,62) y por eso cae, que es exactamente el caso que hay que atrapar.
 */
export const TASA_BASE_MAXIMA = 0.6;

/**
 * ¿Este cruce se le puede contar a Matías?
 *
 * Los chequeos van en orden de qué tan barato es descartarlo y de qué tan grave
 * es el problema. El primero es el más importante y el que nadie mira.
 */
export function revisarSesgos(etiqueta: string, casos: Caso[]): Veredicto {
  const conEtiqueta = casos.filter((c) => c.factores.includes(etiqueta));

  // 1 · ⚠️⚠️ LA CAUSA Y EL EFECTO EN EL MISMO ACTO. El sesgo más grande y el
  // menos visible: no medís "los amigos me suben el ánimo", medís "cuando estoy
  // bien se lo atribuyo a los amigos". Ningún tamaño de muestra lo arregla.
  if (conEtiqueta.length > 0 && conEtiqueta.every((c) => c.mismoActo)) {
    return {
      pasa: false,
      motivo: 'mismo-acto',
      detalle: `"${etiqueta}" y el ánimo se registran juntos: no se puede saber cuál vino primero`,
    };
  }

  // 2 · Pocos casos. Su regla: "no mostrar cosas hechas con pocos datos".
  if (conEtiqueta.length < MINIMO_CASOS) {
    return {
      pasa: false,
      motivo: 'pocos-casos',
      detalle: `solo ${conEtiqueta.length} ${conEtiqueta.length === 1 ? 'caso' : 'casos'}, hacen falta ${MINIMO_CASOS}`,
    };
  }

  // 3 · Tasa base. Si la etiqueta está en casi todos los días, coincidir con lo
  // que sea es inevitable y no informa nada.
  const tasaBase = conEtiqueta.length / casos.length;
  if (tasaBase > TASA_BASE_MAXIMA) {
    return {
      pasa: false,
      motivo: 'tasa-base-alta',
      detalle: `"${etiqueta}" aparece en ${conEtiqueta.length} de ${casos.length} días: coincidir no dice nada`,
    };
  }

  // 4 · Correlación perfecta. En el mundo real no existe; delata que la etiqueta
  // se elige por el resultado.
  const buenos = conEtiqueta.filter((c) => c.bien).length;
  if (buenos === conEtiqueta.length || buenos === 0) {
    return {
      pasa: false,
      motivo: 'correlacion-perfecta',
      detalle: `${buenos} de ${conEtiqueta.length} — un 100% delata que la etiqueta se elige por el resultado`,
    };
  }

  // 5 · Confundidor. Si otra etiqueta viene SIEMPRE con esta, no se sabe cuál de
  // las dos explica. Es el "pero también trabajaste" de Matías.
  const otras = new Map<string, number>();
  for (const c of conEtiqueta) {
    for (const f of c.factores) {
      if (f !== etiqueta) otras.set(f, (otras.get(f) ?? 0) + 1);
    }
  }
  for (const [otra, n] of otras) {
    if (n === conEtiqueta.length) {
      return {
        pasa: false,
        motivo: 'confundidor',
        detalle: `"${otra}" aparece en los ${n} casos junto con "${etiqueta}": no se sabe cuál explica`,
      };
    }
  }

  return { pasa: true, casos: conEtiqueta.length, deLosCuales: buenos };
}

/**
 * Lo que se le muestra a él cuando un cruce NO pasa.
 *
 * ⚠️ SE DICE, NO SE ESCONDE. Su regla del 05/08: el estado vacío de Relaciones
 * mentía diciendo "todavía no encontré ninguna relación" cuando la verdad era
 * "ya contestaste todas". Un hallazgo descartado por sesgo es información sobre
 * cómo registrás, y a veces es más útil que el hallazgo: "esto no te lo puedo
 * decir porque marcás el factor y el ánimo al mismo tiempo" es un dato.
 */
export function explicarRechazo(v: Extract<Veredicto, { pasa: false }>): string {
  const porQue: Record<MotivoRechazo, string> = {
    'mismo-acto': 'lo marcás junto con el ánimo, así que no se sabe qué vino primero',
    'pocos-casos': 'todavía hay pocos casos',
    'correlacion-perfecta': 'da exacto, y lo exacto en la vida real suele ser un error de medición',
    'tasa-base-alta': 'aparece casi todos los días, así que coincidir no significa nada',
    confundidor: 'nunca aparece solo, así que no se puede separar de lo que viene con él',
  };
  return porQue[v.motivo];
}
