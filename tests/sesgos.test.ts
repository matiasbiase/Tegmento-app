import { describe, expect, it } from 'vitest';
import { explicarRechazo, MINIMO_CASOS, revisarSesgos, type Caso } from '@/lib/sesgos';

/** Un caso con la causa y el efecto registrados por separado (lo sano). */
function caso(factores: string[], bien: boolean, mismoActo = false): Caso {
  return { factores, bien, mismoActo };
}

describe('el sesgo que arruinaba todo: causa y efecto en el mismo acto', () => {
  it('⚠️ rechaza el check-in de ánimo, donde el factor y el estado se eligen juntos', () => {
    const casos = [
      caso(['Amigos'], true, true),
      caso(['Amigos'], true, true),
      caso(['Amigos'], true, true),
      caso(['Trabajo'], false, true),
    ];
    const v = revisarSesgos('Amigos', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) expect(v.motivo).toBe('mismo-acto');
  });

  it('y NO lo rechaza cuando el efecto se registró aparte', () => {
    const casos = [
      caso(['Amigos'], true),
      caso(['Amigos'], false),
      caso(['Amigos'], true),
      caso(['Trabajo'], false),
      caso(['Trabajo'], false),
      caso(['Ocio'], true),
      caso(['Ocio'], true),
    ];
    expect(revisarSesgos('Amigos', casos).pasa).toBe(true);
  });
});

describe('el caso real de Matías, medido el 13/08', () => {
  it('⚠️ Amigos 8/13 con 8/8 buenos NO pasa', () => {
    // Los números exactos de su base. Antes de este archivo, esto llegaba al
    // chat como si fuera un hallazgo.
    const casos: Caso[] = [
      ...Array.from({ length: 8 }, () => caso(['Amigos'], true, true)),
      ...Array.from({ length: 5 }, () => caso(['Identidad'], false, true)),
    ];
    expect(revisarSesgos('Amigos', casos).pasa).toBe(false);
  });
});

describe('pocos casos', () => {
  it('con menos de tres no alcanza', () => {
    const casos = [caso(['Ocio'], true), caso(['Ocio'], false), caso(['Trabajo'], true)];
    const v = revisarSesgos('Ocio', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) expect(v.motivo).toBe('pocos-casos');
    expect(MINIMO_CASOS).toBe(3);
  });
});

describe('tasa base alta', () => {
  it('si la etiqueta está en casi todos los días, coincidir no informa', () => {
    const casos = [
      caso(['Descanso'], true),
      caso(['Descanso'], false),
      caso(['Descanso'], true),
      caso(['Descanso'], true),
      caso(['Trabajo'], false),
    ];
    const v = revisarSesgos('Descanso', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) expect(v.motivo).toBe('tasa-base-alta');
  });
});

describe('correlación perfecta', () => {
  it('⚠️ el 100% se rechaza: en la vida real no existe', () => {
    const casos = [
      caso(['Ocio'], true),
      caso(['Ocio'], true),
      caso(['Ocio'], true),
      caso(['Trabajo'], false),
      caso(['Trabajo'], false),
      caso(['Estudios'], true),
      caso(['Estudios'], false),
      caso(['Familia'], true),
    ];
    const v = revisarSesgos('Ocio', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) expect(v.motivo).toBe('correlacion-perfecta');
  });

  it('el 0% también: es el mismo problema al revés', () => {
    const casos = [
      caso(['Dinero'], false),
      caso(['Dinero'], false),
      caso(['Dinero'], false),
      caso(['Ocio'], true),
      caso(['Ocio'], true),
      caso(['Familia'], true),
      caso(['Estudios'], false),
      caso(['Trabajo'], true),
    ];
    const v = revisarSesgos('Dinero', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) expect(v.motivo).toBe('correlacion-perfecta');
  });
});

describe('el confundidor — el "pero también trabajaste" de Matías', () => {
  it('⚠️ si otra etiqueta viene SIEMPRE con esta, no se sabe cuál explica', () => {
    const casos = [
      caso(['Amigos', 'Ocio'], true),
      caso(['Amigos', 'Ocio'], false),
      caso(['Amigos', 'Ocio'], true),
      caso(['Trabajo'], false),
      caso(['Trabajo'], false),
      caso(['Estudios'], true),
      caso(['Familia'], true),
    ];
    const v = revisarSesgos('Amigos', casos);
    expect(v.pasa).toBe(false);
    if (!v.pasa) {
      expect(v.motivo).toBe('confundidor');
      expect(v.detalle).toContain('Ocio');
    }
  });

  it('pero si a veces viene sola, sí se puede separar', () => {
    const casos = [
      caso(['Amigos', 'Ocio'], true),
      caso(['Amigos'], false),
      caso(['Amigos'], true),
      caso(['Trabajo'], false),
      caso(['Trabajo'], false),
      caso(['Estudios'], true),
      caso(['Familia'], true),
    ];
    expect(revisarSesgos('Amigos', casos).pasa).toBe(true);
  });
});

describe('lo que pasa el filtro', () => {
  it('devuelve cuántos casos y cuántos fueron buenos, para poder mostrarlo', () => {
    const casos = [
      caso(['Ocio'], true),
      caso(['Ocio'], true),
      caso(['Ocio'], false),
      caso(['Trabajo'], false),
      caso(['Trabajo'], true),
      caso(['Estudios'], true),
      caso(['Familia'], false),
    ];
    const v = revisarSesgos('Ocio', casos);
    expect(v).toEqual({ pasa: true, casos: 3, deLosCuales: 2 });
  });
});

describe('el rechazo se explica, no se esconde', () => {
  it('cada motivo tiene una frase que se le puede mostrar a él', () => {
    const motivos = ['mismo-acto', 'pocos-casos', 'correlacion-perfecta', 'tasa-base-alta', 'confundidor'] as const;
    for (const motivo of motivos) {
      const frase = explicarRechazo({ pasa: false, motivo, detalle: '' });
      expect(frase.length).toBeGreaterThan(10);
      // Sin jerga: si dice "correlación" o "sesgo", no sirve para la pantalla.
      expect(frase.toLowerCase()).not.toContain('correlaci');
      expect(frase.toLowerCase()).not.toContain('sesgo');
    }
  });
});
