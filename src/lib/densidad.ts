/**
 * CUÁNTO PUEDE AFIRMAR LA APP HOY.
 *
 * Idea de Matías (29/07): *"cuando no tiene información, las primeras semanas,
 * que sea más 'probá' o 'mirá esto'. Y cuando tiene más información, 'che, mirá,
 * acá hay algo'"*.
 *
 * Es un problema de honestidad, no de tono. Una app que a los tres días te dice
 * "los días que entrenás dormís mejor" está inventando, y cuando el usuario lo
 * nota deja de creerle también a lo que sí es cierto. Y al revés: a los seis
 * meses, seguir diciendo "¿será que…?" sobre algo que pasó cuarenta veces es
 * falsa modestia y hace que la app parezca tonta.
 *
 * ⚠️ SE MIDE EN DÍAS DISTINTOS CON REGISTRO, no en cantidad de registros. Diez
 * check-ins de ánimo en dos días no son diez datos: son dos días. Lo que hace
 * fuerte a una relación es que se repita en el tiempo.
 *
 * ⚠️ Y SE MIDE SOBRE EL ÁNIMO. La app tiene señales muy despareja: el 29/07
 * Matías llevaba 36 días marcando actividades pero solo 12 registrando cómo se
 * sentía. Como casi todo lo que vale la pena decir cruza algo CON cómo se
 * siente, la señal más pobre es la que manda.
 */

export type Densidad = 'arranque' | 'formandose' | 'con-historia';

export function calcularDensidad(diasConAnimo: number): Densidad {
  if (diasConAnimo < 10) return 'arranque';
  if (diasConAnimo < 30) return 'formandose';
  return 'con-historia';
}

/**
 * La instrucción que se le pega al prompt según la fase. Se le dice qué puede
 * afirmar, no solo cómo hablar: el tono sale solo del permiso.
 */
export function instruccionSegunDensidad(d: Densidad, diasConAnimo: number): string {
  if (d === 'arranque') {
    return (
      `### CUÁNTO PODÉS AFIRMAR HOY: MUY POCO (${diasConAnimo} días con registro de ánimo)\n` +
      `Todavía no viste lo suficiente como para decirle a Matías cómo es él. NO afirmes relaciones ` +
      `("los días que entrenás dormís mejor"): con estos datos eso es inventar, y si él lo nota deja ` +
      `de creerte también lo que sí es cierto.\n` +
      `Lo que SÍ podés hacer, y es lo valioso en esta etapa: **invitar a probar y a mirar**. ` +
      `"Probá anotar cómo dormís unos días y vemos", "fijate si esto te suena". ` +
      `Que se note que estás mirando y que todavía no sacaste conclusiones: eso es honesto y no ` +
      `decepciona después.`
    );
  }
  if (d === 'formandose') {
    return (
      `### CUÁNTO PODÉS AFIRMAR HOY: ALGO (${diasConAnimo} días con registro de ánimo)\n` +
      `Ya podés nombrar coincidencias que viste, pero **siempre como pregunta y nunca como regla**: ` +
      `"vengo notando que…, ¿te suena?" y no "esto te pasa". Todavía no hay historia suficiente para ` +
      `afirmar que algo es así siempre.\n` +
      `Y podés proponer probar algo chico para confirmarlo, que es lo que hace crecer la lectura.`
    );
  }
  return (
    `### CUÁNTO PODÉS AFIRMAR HOY: BASTANTE (${diasConAnimo} días con registro de ánimo)\n` +
    `Ya hay historia como para decir las cosas derecho: "che, mirá esto" en vez de "¿será que…?". ` +
    `Cuando una relación se repite muchas veces, decila con seguridad y mostrale con qué la sostenés. ` +
    `Seguir dudando de algo que viste cuarenta veces es falsa modestia y le hace perder tiempo.`
  );
}
