import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * UN FRAGMENT QUE CRUZA DE SERVER A CLIENTE SE CONVIERTE EN UNA LISTA (06/08).
 *
 * ── El bug que originó este test ─────────────────────────────────────────────
 * Matías veía al ENTRAR a Seguimiento: *"Each child in a list should have a
 * unique key prop. Check the render method of `ActividadesUI`. It was passed a
 * child from `ActividadesPage`"*. Se escanearon los 155 `.tsx` con el parser de
 * TypeScript buscando `.map()` sin `key`: **no había ninguno**, y el warning
 * seguía. Un día entero de la sesión anterior se fue en eso.
 *
 * ⚠️ EL ARRAY NO LO HACÍA UN `map`, LO HACÍA EL FRAGMENT. `ObjetivosSeccion` es
 * un Server Component que devolvía `<>…</>` con varios hijos, y la página se lo
 * pasaba a un componente CLIENTE como prop:
 *
 *     <ActividadesUI objetivos={<ObjetivosSeccion />} />   ← page.tsx (server)
 *
 * Del otro lado del serializado de RSC, ese fragment llega como **una lista de
 * hijos sueltos**. Y una lista de hijos quiere `key` en cada uno. El componente
 * cliente que la dibuja se come el warning, y el dedo acusador apunta a la
 * página que ni siquiera hizo la lista.
 *
 * ⚠️ ES INVISIBLE PARA TODO LO DEMÁS: `tsc` compila, los tests pasan, el build
 * compila, y el MISMO componente en su propia ruta (`/objetivos`, server →
 * server) no dice nada, porque ahí no hay frontera que cruzar. Solo aparece en
 * runtime, en la pantalla que lo recibe como prop.
 *
 * ── Qué chequea ──────────────────────────────────────────────────────────────
 * Que ningún componente de un archivo SIN `'use client'` devuelva un fragment
 * pelado con más de un hijo **si en algún lado se lo pasa como valor de un prop
 * JSX**. La regla es corta: si viaja como prop, que devuelva UN elemento.
 */

const RAIZ = path.resolve(__dirname, '..', 'src');

function archivosTsx(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) archivosTsx(p, acc);
    else if (e.name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

/** ¿El archivo declara `'use client'` en la primera línea con contenido? */
function esCliente(texto: string): boolean {
  return /^\s*(['"])use client\1/m.test(texto.split('\n').slice(0, 3).join('\n'));
}

/** Cuenta los hijos "reales" de un fragment (texto en blanco no cuenta). */
function hijosDeFragment(frag: ts.JsxFragment): number {
  return frag.children.filter((c) => {
    if (ts.isJsxText(c)) return c.getText().trim().length > 0;
    return true;
  }).length;
}

/** Los componentes exportados de un archivo que devuelven un fragment pelado. */
function devuelvenFragment(sf: ts.SourceFile): string[] {
  const nombres: string[] = [];

  const mirarCuerpo = (nombre: string, cuerpo: ts.Node | undefined) => {
    if (!cuerpo) return;
    const ver = (n: ts.Node) => {
      if (ts.isReturnStatement(n) && n.expression) {
        let e: ts.Node = n.expression;
        while (ts.isParenthesizedExpression(e)) e = e.expression;
        if (ts.isJsxFragment(e) && hijosDeFragment(e) > 1) nombres.push(nombre);
        return;
      }
      // No bajar a funciones anidadas: sus `return` son de otra función.
      if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) return;
      ts.forEachChild(n, ver);
    };
    if (ts.isBlock(cuerpo)) ts.forEachChild(cuerpo, ver);
    else {
      let e: ts.Node = cuerpo;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if (ts.isJsxFragment(e) && hijosDeFragment(e) > 1) nombres.push(nombre);
    }
  };

  const visitar = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name) mirarCuerpo(n.name.text, n.body);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const ini = n.initializer;
      if (ts.isArrowFunction(ini) || ts.isFunctionExpression(ini)) mirarCuerpo(n.name.text, ini.body);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return nombres;
}

/** Componentes usados como VALOR DE UN PROP: `<X algo={<Componente />} />`. */
function usadosComoProp(sf: ts.SourceFile): Set<string> {
  const usados = new Set<string>();
  const visitar = (n: ts.Node) => {
    if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer)) {
      const buscarJsx = (x: ts.Node) => {
        if (ts.isJsxSelfClosingElement(x)) usados.add(x.tagName.getText());
        else if (ts.isJsxElement(x)) usados.add(x.openingElement.tagName.getText());
        ts.forEachChild(x, buscarJsx);
      };
      if (n.initializer.expression) buscarJsx(n.initializer.expression);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return usados;
}

describe('un fragment de server component no viaja como prop', () => {
  const archivos = archivosTsx(RAIZ);

  // Todo lo que en algún lugar de src se pasa como valor de un prop JSX.
  const viajanComoProp = new Set<string>();
  for (const a of archivos) {
    const sf = ts.createSourceFile(a, fs.readFileSync(a, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const n of usadosComoProp(sf)) viajanComoProp.add(n);
  }

  it('ninguno devuelve un fragment pelado con varios hijos', () => {
    const culpables: string[] = [];

    for (const archivo of archivos) {
      const texto = fs.readFileSync(archivo, 'utf8');
      if (esCliente(texto)) continue; // del lado del cliente no hay frontera que cruzar
      const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const nombre of devuelvenFragment(sf)) {
        if (viajanComoProp.has(nombre)) {
          culpables.push(`${path.relative(RAIZ, archivo)} → <${nombre}> devuelve <>…</> y se pasa como prop`);
        }
      }
    }

    expect(culpables, culpables.join('\n')).toEqual([]);
  });

  it('el escaneo mira archivos de verdad', () => {
    // Si un refactor mueve `src/` o cambia la extensión, el test de arriba
    // pasaría con la lista vacía sin haber mirado nada. Este lo impide.
    expect(archivos.length).toBeGreaterThan(100);
    expect(viajanComoProp.size).toBeGreaterThan(0);
  });
});
