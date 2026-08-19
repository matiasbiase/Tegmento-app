# Bitácora de Vida — Estándar de UI (sistema lila)

> Fuente de verdad de la interfaz. **Si un valor no está acá, no se usa.**
> Todos los tokens viven en `src/app/globals.css` dentro de `@theme`.
> Acompaña al UI Kit visual (`UI Kit.dc.html`) — ese archivo muestra cada token renderizado.

---

## 0. Reglas de oro

1. **Nunca hex inline en componentes.** Usá las variables de `@theme` (`text-iris`, `bg-iris-soft`, etc.). Única excepción: SVG.
2. **Dos familias tipográficas**: `Newsreader` (serif) sólo para títulos grandes de pantalla; `Geist` para todo; `Geist Mono` para labels y metadata.
3. **Escala de redondeos de 6 pasos** — nada fuera de ella.
4. **Grilla de espaciado base 8**, padding de pantalla = 22.
5. **Easing único**: `ease` / `ease-out`. Duraciones del set de abajo.

> ⚠️ **Ese pendiente ya no aplica (verificado el 05/08/2026):** `SelectorDias.tsx`
> no existe más, así que la nota que estaba acá apuntaba a un archivo borrado.
>
> Lo que SÍ queda por migrar, contado sobre `src/components/` el 05/08: **hex inline
> que ya tienen token** — `#6c78ee` (9 veces, es `--color-iris`), `#4a56c8` (7, es
> `--color-iris-deep`), `#3d9b80` (8, es `--color-verde`), `#c25571` (7, es
> `--color-rosa`), `#c4c4d4` (7, es `--color-niebla-2`). Y `#f1f0f7`, que aparece
> **18 veces y no tiene token**: es el separador entre filas de una lista, y merece
> uno propio antes de seguir copiándolo.

---

## 1. Color

### Fondos & superficie
| Token | Hex | Uso |
|---|---|---|
| `--color-lavanda` | `#f3f3fb` | Fondo de la app |
| `--color-lavanda-2` | `#e3e3f1` | Fondo detrás de tarjetas |
| `--color-blanco` | `#ffffff` | Superficie de tarjetas |

### Texto
| Token | Hex | Uso |
|---|---|---|
| `--color-tinta` | `#1c1c2b` | Texto principal |
| `--color-tinta-soft` | `#56566c` | Texto secundario |
| `--color-niebla` | `#9999ad` | Labels / metadata |
| `--color-niebla-2` | `#c4c4d4` | Iconos inactivos |
| `--color-niebla-3` | `#b0b0c0` | Letras de días inactivos |

### Acento principal · Iris
| Token | Hex | Uso |
|---|---|---|
| `--color-iris` | `#6c78ee` | Acento principal |
| `--color-iris-2` | `#8a7cf0` | 2º stop del gradiente |
| `--color-iris-soft` | `#eaebfc` | Tinte claro (chips, fondos suaves) |
| `--color-iris-deep` | `#4a56c8` | Texto lila sobre fondo claro |

**Gradiente de marca:** `linear-gradient(135deg, #6c78ee, #8a7cf0)` — avatares, botón de chat, CTA primario.

### Acentos semánticos (sólido + tinte de fondo)
| Nombre | Sólido | Tinte | Uso |
|---|---|---|---|
| Verde | `#3d9b80` | `#e3f1ec` | Salud · confirmado · idea |
| Oro | `#b06a1a` | `#fbeede` | Mails · importante |
| Rosa | `#c25571` | `#fbe7ec` | Contexto · sensible |
| Alerta | `#e5484d` (`--color-brick` aprox.) | — | Evento cercano (punto rojo) |

---

## 2. Tipografía

| Nivel | Especificación | Ejemplo |
|---|---|---|
| Título de pantalla | `Newsreader 43px / 600 / -.5px / line 1` | "Hoy" |
| Título de card | `Geist 22px / 700 / -.4px` | "Clase de alemán" |
| Sección / label | `Geist Mono 11px / 600 / +1.5px / MAYÚSCULAS / niebla` | "EN FOCO AHORA" |
| Cuerpo | `Geist 14px / line 1.42` (secundario `tinta-soft`) | Texto de contenido |
| Texto de reco | `Geist 13.5px / line 1.4 / #33334a` | Burbujas del agente |
| Metadata | `Geist Mono 11–13px / niebla` | "11:30 · hace 1h" |

---

## 3. Redondeos — escala de 6 pasos

| Paso | Valor | Uso |
|---|---|---|
| sm | `8px` | Sellos, pills, tags |
| md | `11px` | Chips de situación, botones chicos |
| lg | `16px` | CTA principal, contenedor de foco |
| xl | `18px` | Cards de recomendación |
| nav | `30px` | Barra de navegación flotante |
| full | `50%` | Avatares y botones circulares |

> Shell del mockup de teléfono: `56px` exterior / `44px` interior (sólo el device frame).

---

## 4. Espaciado — grilla base 8

| Px | Uso |
|---|---|
| `4` | Ajuste óptico (mb-1) |
| `7` | Icono + texto |
| `8` | Gap base |
| `12` | Entre filas |
| `18` | Entre secciones |
| `22` | **Padding horizontal de pantalla** |
| `28` | Separación de bloques grandes |

---

## 5. Tamaños de caja — estándar

| Elemento | Tamaño |
|---|---|
| Avatar de perfil | `46 × 46` |
| Avatar de header | `38 × 38` |
| Botón central de nav | `52 × 52` |
| Círculo de día | `36 × 36` |
| Botón mini (reco) | `26 × 26` |
| Punto de evento | `5 × 5` |
| Icono de nav | `24 × 24` (stroke 1.8–1.9) |
| Icono de foco (círculo) | `104 ∅` |
| Card de recomendación | `246` de ancho |
| Mockup de teléfono | `390 × 844` |

---

## 6. Sombras — elevación

| Nombre | Valor |
|---|---|
| Avatar / botón | `0 6px 16px rgba(108,120,238,.35)` |
| Día seleccionado | `0 6px 14px rgba(108,120,238,.4)` |
| Card de reco | `0 6px 20px rgba(108,120,238,.1)` |
| Nav flotante | `0 14px 36px rgba(50,50,90,.16)` |
| CTA grande | `0 8px 20px rgba(108,120,238,.4)` |

---

## 7. Movimiento — duraciones & easing

| Duración | Nombre | Uso |
|---|---|---|
| `.12s` | Micro / `:active` | Press de botones y links — `scale(.95)` + `brightness(.92)` |
| `.18s` | Control activo | Selección de día, cambio de tab |
| `.25s` | Aparecer | Entrada de cards, blur del header |
| `.3s` | Flotar | Entrada de pantalla completa |

Easing por defecto de todo el sistema: **`ease` / `ease-out`**.

### Keyframes estándar (ya en `globals.css`)
- `flotar` — `translateY(10px)→0` + fade · `.3s ease` · entrada de pantalla.
- `aparecer` — `translateY(6px)→0` + fade · `.25s ease-out` · entrada de card (`.animar-entrada`).
- `latido` — `opacity .25→1`, `scale .9→1.1` · `1.6s` loop · punto "en vivo".
- `resplandor` — glow pulsante · `1.6s` loop · indicador de grabación de voz (`.resplandor-voz`).

Regla global ya aplicada en `@layer base`: todo `button`/`a` transiciona `transform/opacity/bg/border/color/box-shadow/filter`, y `:active` hace `scale(.95) brightness(.92)`.

---

## 8. Componentes — specs rápidas

- **Sellos / pills** — `padding 5px 11px`, `radio 8`, `Geist Mono 11px/600/+.6px`, par sólido+tinte semántico.
- **Chips de situación** — `padding 8px 13px`, `radio 11`, `13px/500`, par sólido+tinte.
- **CTA primario** — gradiente iris, `padding 13`, `radio 16`, `15px/600` blanco, sombra CTA grande.
- **CTA secundario** — fondo blanco, `border 1px iris`, texto `iris-deep`, `radio 11`.
- **CTA terciario** — fondo blanco, `border 1px borde`, texto niebla, `radio 8`, MAYÚS `11px`.
- **Selector de días** — 4 estados: normal · con-evento (punto rojo 5px abajo) · seleccionado (círculo iris) · seleccionado+evento (círculo alerta). Sin punto cuando está seleccionado.
- **Card de recomendación** — ancho `246`, `radio 18`, fondo `linear-gradient(135deg,#eef0fe,#f4ecfe 52%,#e9f2fe)`, `border 1px rgba(124,124,240,.16)`, sombra reco.
- **Nav flotante** — `radio 30`, fondo `rgba(255,255,255,.92)` + `blur(16px)`, `border 1px rgba(108,120,238,.12)`, gap `24`, botón central `52` con gradiente.

---

## 9. Cómo aplicar esto en el codebase

1. Confirmar que cada token de §1 existe en `globals.css @theme` (ya están las variables `--color-iris*`, semánticos en su versión `lila`).
2. Barrer los componentes y reemplazar **todo hex inline** por la variable correspondiente. Empezar por `src/components/hoy/SelectorDias.tsx` (usa `#6c78ee` y `#e5484d`).
3. Unificar los redondeos a la escala de §3; eliminar `rounded-md/lg/2xl` sueltos.
4. Unificar duraciones de transición a §7.
5. Usar el UI Kit visual como check de regresión: cada componente del codebase debe verse idéntico a su muestra.
