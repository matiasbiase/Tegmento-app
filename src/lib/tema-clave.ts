/**
 * La clave con la que se decide si dos temas son EL MISMO tema.
 *
 * Existe porque el modelo escribe el mismo tema de formas distintas según el
 * día: "Vida social", "vida social", "Cambios Personales" y "Cambios
 * personales" son todos el mismo tema para cualquiera que los lea.
 *
 * Normaliza tres cosas, y cada una salió de los datos reales del 28/07:
 *  - mayúsculas ("Finanzas" / "finanzas");
 *  - acentos ("Alemán" / "Aleman", que el modelo alterna);
 *  - espacios de más.
 *
 * ⚠️ Es solo para COMPARAR. El nombre se guarda como lo escribió el modelo: la
 * clave es fea de leer y el usuario ve el nombre, no la clave.
 */
export function claveTema(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
