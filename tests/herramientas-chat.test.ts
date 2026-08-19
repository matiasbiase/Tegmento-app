import { describe, expect, it } from 'vitest';
import {
  componerHerramienta,
  expandirHerramienta,
  herramientaDe,
  HERRAMIENTAS_CHAT,
  partirHerramienta,
} from '@/lib/herramientas-chat';

// ⚠️ LO QUE ESTOS TESTS CUIDAN es la promesa central: lo que se GUARDA es el
// hashtag corto y lo que VIAJA al modelo es la instrucción larga. Si un día
// alguien "simplifica" guardando el prompt, la app empieza a mostrar párrafos
// que Matías nunca escribió y no lo va a avisar ningún error.
describe('herramientas del chat', () => {
  it('reconoce el hashtag al principio', () => {
    expect(herramientaDe('#polaridad')?.id).toBe('polaridad');
    expect(herramientaDe('#calma me está costando dormir')?.id).toBe('calma');
  });

  it('⚠️ en el medio de una frase es una palabra, no una herramienta', () => {
    // Sin esto, escribir "hablemos de #foco" dispararía la herramienta adentro
    // de una frase que solo la nombraba.
    expect(herramientaDe('hablemos de #foco')).toBeNull();
  });

  it('un hashtag que no existe no es una herramienta', () => {
    expect(herramientaDe('#cualquiercosa')).toBeNull();
    expect(expandirHerramienta('#cualquiercosa')).toBe('#cualquiercosa');
  });

  it('un mensaje normal pasa intacto', () => {
    expect(expandirHerramienta('hoy dormí mal')).toBe('hoy dormí mal');
  });

  it('⚠️ el modelo recibe la instrucción, no el hashtag', () => {
    const salida = expandirHerramienta('#polaridad');
    expect(salida).not.toContain('#polaridad');
    expect(salida).toContain('Polaridad');
  });

  it('lo que escribe al lado del hashtag llega también', () => {
    const salida = expandirHerramienta('#polaridad me quedo en Nürnberg o me vuelvo');
    expect(salida).toContain('me quedo en Nürnberg o me vuelvo');
    expect(salida).toContain('Polaridad');
  });

  it('los ids son tipeables: solo minúsculas, sin acentos ni espacios', () => {
    for (const h of HERRAMIENTAS_CHAT) expect(h.id).toMatch(/^[a-z]+$/);
  });

  it('no hay dos herramientas con el mismo id', () => {
    const ids = HERRAMIENTAS_CHAT.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ⚠️ EL BUG QUE ESTE BLOQUE EVITA QUE VUELVA (05/08). Matías escribió `#foco`,
// el bot le contestó un párrafo lindo sobre el foco y **nunca apareció el botón
// que abre el reloj**: los prompts contaban de qué se trataba la herramienta y
// no nombraban la acción de la app. Una herramienta que conversa en vez de
// funcionar no es una herramienta.
describe('cada herramienta dispara algo de la app, no solo charla', () => {
  const accion: Record<string, string> = {
    polaridad: '(/polaridad)',
    calma: '(/calma)',
    foco: '[+foco:',
    probando: '(/probando)',
    comoselee: '[+comolove:',
    plan: '[+plan:',
    reflexion: '(/objetivos)',
  };

  for (const h of HERRAMIENTAS_CHAT) {
    it(`#${h.id} le pide al bot su marca o su link`, () => {
      expect(h.prompt).toContain(accion[h.id]);
    });
  }

  // ⚠️ Y QUE NADIE AGREGUE UNA HERRAMIENTA SIN REGISTRARLA ACÁ. Sin esto, una
  // herramienta nueva pasaba el bloque de arriba con `toContain(undefined)`, que
  // falla por accidente y con un mensaje que no dice qué hacer. El guard tiene
  // que fallar diciendo el nombre de lo que falta.
  it('toda herramienta tiene declarada cuál es su acción', () => {
    const sinDeclarar = HERRAMIENTAS_CHAT.filter((h) => !accion[h.id]).map((h) => h.id);
    expect(sinDeclarar).toEqual([]);
  });

  it('todas tienen ícono, y es el de su propio id', () => {
    for (const h of HERRAMIENTAS_CHAT) expect(h.icono).toBe(h.id);
  });
});

/**
 * ⚠️ EL INVARIANTE QUE PROTEGE LOS DATOS (06/08). Desde que el hashtag se dibuja
 * como pastilla en el composer, el texto se parte en dos y se vuelve a juntar al
 * enviar. Lo que se guarda tiene que seguir siendo exactamente `#foco loquesea`:
 * si no, el chip del historial deja de reconocerlo y los mensajes viejos y los
 * nuevos son dos formatos distintos en la misma conversación.
 */
describe('partirHerramienta ↔ componerHerramienta', () => {
  const casos = [
    '#foco',
    '#foco terminar el informe',
    '#polaridad me quedo en Nürnberg o me vuelvo',
    '#calma',
    'esto no abre ninguna herramienta',
    'un #foco en el medio no es una herramienta',
    '',
  ];

  for (const original of casos) {
    it(`vuelve igual: ${original || '(vacío)'}`, () => {
      const { herramienta, resto } = partirHerramienta(original);
      expect(componerHerramienta(herramienta, resto)).toBe(original.trim());
    });
  }

  it('parte el hashtag del resto', () => {
    const { herramienta, resto } = partirHerramienta('#foco   terminar el informe');
    expect(herramienta?.id).toBe('foco');
    expect(resto).toBe('terminar el informe');
  });

  it('sola, la herramienta ya es un mensaje válido: se estrena explicándose', () => {
    expect(componerHerramienta(partirHerramienta('#calma').herramienta, '')).toBe('#calma');
  });

  it('sin herramienta no inventa hashtag', () => {
    expect(componerHerramienta(null, '  hola  ')).toBe('hola');
  });
});
