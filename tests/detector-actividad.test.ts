import { describe, it, expect } from 'vitest';
import { completarMarca, yaTieneMarca, type Deteccion } from '@/lib/detector-actividad';

/** Detección armada corta, con los valores por defecto de lo que no importa. */
function det(tipo: Deteccion['tipo'], titulo: string, monto = 0, moneda = '€'): Deteccion {
  return { tipo, titulo, monto, moneda };
}

describe('yaTieneMarca', () => {
  it('reconoce las marcas que pone el asistente', () => {
    expect(yaTieneMarca('Dale, buenísimo.\n\n[+actividad: jugar al fútbol]')).toBe(true);
    expect(yaTieneMarca('Qué bueno.\n\n[+hecho: mandé el mail]')).toBe(true);
    expect(yaTieneMarca('Ahí va.\n\n[+gasto: súper | 40 | €]')).toBe(true);
  });

  it('no confunde texto suelto con una marca', () => {
    expect(yaTieneMarca('Podrías sumar una actividad nueva si querés')).toBe(false);
  });
});

describe('completarMarca', () => {
  it('agrega la marca cuando el asistente se la olvidó', () => {
    const r = completarMarca('Dale, el alemán te va a abrir puertas.', det('actividad', 'estudiar alemán'));
    expect(r).toContain('[+actividad: estudiar alemán]');
  });

  it('la pone en su propia línea, que es como la espera la UI', () => {
    const r = completarMarca('Buenísimo.', det('hecho', 'mandé el mail'));
    expect(r.split('\n').at(-1)).toBe('[+hecho: mandé el mail]');
  });

  it('no toca la respuesta si el asistente ya puso su propia marca', () => {
    const original = 'Dale.\n\n[+actividad: jugar al fútbol]';
    expect(completarMarca(original, det('actividad', 'otra cosa'))).toBe(original);
  });

  it('no agrega nada cuando no hay nada que registrar', () => {
    const original = 'Se nota que fue una semana pesada.';
    expect(completarMarca(original, det('nada', ''))).toBe(original);
  });

  it('ignora una detección sin título', () => {
    const original = 'Dale.';
    expect(completarMarca(original, det('actividad', '  '))).toBe(original);
  });

  it('saca los backticks cuando el modelo escribe la marca como código', () => {
    const r = completarMarca('Dale.\n\n`[+gasto: almuerzo | 8.50 | €]`', det('gasto', 'almuerzo', 8.5));
    expect(r).toContain('[+gasto: almuerzo | 8.50 | €]');
    expect(r).not.toContain('`');
  });

  describe('gastos', () => {
    it('arma la marca de gasto con monto y moneda', () => {
      const r = completarMarca('Dale, lo vemos.', det('gasto', 'entrada de la pileta', 5.7));
      expect(r).toContain('[+gasto: entrada de la pileta | 5.7 | €]');
    });

    it('sin monto no arma la marca: no hay gasto que guardar', () => {
      const original = 'Contame cuánto fue.';
      expect(completarMarca(original, det('gasto', 'súper', 0))).toBe(original);
    });

    // ⚠️ ACÁ HABÍA TRES TESTS DE `[+ticket]` y se fueron con el ticket entero el
    // 03/08. Cubrían el caso real del 25/07: el asistente contestaba `[+ticket]`
    // a un gasto contado en palabras, sin foto, y esa marca sin imagen no
    // dibujaba botón — el gasto no se podía guardar de ninguna manera.
    //
    // Ese bug ya no puede existir: con foto o sin foto, todo gasto entra por
    // `[+gasto:]`. No hay dos marcas entre las que el modelo pueda elegir mal.
  });
});

describe('lo interpersonal', () => {
  it('ofrece ver cómo lo leyó el otro, no marcarlo como hecho', () => {
    // Caso real: el asistente había propuesto "[+hecho: me contestó 'uh no
    // puedo'"], como si que un amigo te deje colgado fuera un logro tuyo.
    const r = completarMarca('Tiene sentido que te pese.', det('interpersonal', 'lo que pasó con tu amigo'));
    expect(r).toContain('[+comolove: lo que pasó con tu amigo]');
    expect(r).not.toContain('[+hecho:');
  });

  it('si el asistente ya ofreció mirarlo, no se duplica', () => {
    const original = 'Te escucho.\n\n[+comolove: la charla con tu vieja]';
    expect(completarMarca(original, det('interpersonal', 'otra cosa'))).toBe(original);
  });
});
