# UI Kit — Bitácora de Vida

Paquete para pasar a Claude Code y dejar la app **pixel-perfect** y estandarizada.

## Qué hay acá
- **`ESTANDAR-UI.md`** — la fuente de verdad: colores, tipografía, redondeos, espaciado,
  tamaños de caja, sombras y animaciones, todo tokenizado. *Si un valor no está acá, no se usa.*
- **`UI Kit.dc.html`** — el mismo estándar pero **renderizado**: cada token y componente
  mostrado al pixel. Sirve como check visual de regresión (cada componente real debe verse
  idéntico a su muestra). Se abre directo en el navegador.

## Cómo usarlo con Claude Code
Pegale algo así:

> Adjunto el estándar de UI de la app (`ESTANDAR-UI.md`) y el UI Kit visual (`UI Kit.dc.html`).
> Quiero que la app quede exactamente como el kit. Tareas:
> 1. Verificá que todos los tokens del estándar estén en `src/app/globals.css @theme`.
> 2. Barré `src/components/**` y reemplazá todo hex inline por la variable de tema correspondiente.
>    Arrancá por `hoy/SelectorDias.tsx` (`#6c78ee` → `var(--color-iris)`, `#e5484d` → `var(--color-brick)`).
> 3. Unificá redondeos a la escala de 6 pasos y duraciones de transición al set del estándar.
> 4. No cambies la apariencia: el objetivo es que cada componente se vea igual al kit, sólo
>    que tokenizado y consistente.

## Nota
El kit refleja el sistema **lila** ("Bitácora Simple"), que es hacia donde está migrando la app
(los tokens `--color-lavanda/iris/...` ya existen en `globals.css`, conviven con la paleta ámbar
vieja durante la migración).
