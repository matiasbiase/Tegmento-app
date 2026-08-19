import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

// Base de prueba para los tests de integración.
//
// El esquema NO se escribe a mano acá: se copia el DDL de la base real (abierta
// en solo lectura, sin tocar un dato). Así el test nunca corre contra un esquema
// inventado que se desincroniza del verdadero, que es la forma clásica de que un
// test pase mientras la app está rota.
//
// Los datos NO se copian: cada test arranca con las tablas vacías.

const BASE_REAL = process.env.DB_REAL ?? 'data/bitacora.db';

/**
 * Crea una base vacía con el esquema real. Devuelve la ruta del archivo.
 *
 * Además deja DB_PATH apuntando ahí. Es a propósito: si un test importa por
 * error un módulo que carga el cliente antes de tiempo, el cliente lee DB_PATH
 * al cargarse y termina escribiendo en la base de Matías. Pasó: tres gastos de
 * prueba aparecieron en sus Finanzas.
 */
export function crearBasePrueba(): string {
  const destino = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tegmento-test-')), 'prueba.db');

  const real = new Database(BASE_REAL, { readonly: true, fileMustExist: true });
  const ddl = real
    .prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'")
    .all() as { sql: string }[];
  real.close();

  const nueva = new Database(destino);
  nueva.pragma('journal_mode = WAL');
  for (const { sql } of ddl) nueva.exec(sql);
  nueva.close();

  process.env.DB_PATH = destino;
  return destino;
}

/**
 * Corta el test si el cliente quedó apuntando a la base real. Se llama después
 * de importar los módulos, que es cuando se sabe con qué ruta se cargó.
 */
export function verificarNoEsLaReal(): void {
  const actual = path.resolve(process.env.DB_PATH ?? '');
  if (actual === path.resolve(BASE_REAL)) {
    throw new Error('Los tests están apuntando a la base REAL. Revisá los imports estáticos.');
  }
}

/** Si no hay base real de la que copiar el esquema, no tiene sentido correr. */
export function hayBaseReal(): boolean {
  return fs.existsSync(BASE_REAL);
}

export function borrarBasePrueba(ruta: string): void {
  fs.rmSync(path.dirname(ruta), { recursive: true, force: true });
}
