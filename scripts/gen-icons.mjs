// Genera los tres PNG del ícono de la app.
//
//   npm run icons
//
// ⚠️ HISTORIA, PARA QUE NO VUELVA A PASAR (03/08/2026):
// Este script quedó desactualizado desde el 11/06 y siguió dibujando la
// HORQUILLA NARANJA vieja aunque el ícono real era otro desde el 26/07. Los PNG
// buenos se habían generado por afuera, así que correr `npm run icons` te
// pisaba el ícono con uno de tres versiones atrás — y nadie se daba cuenta hasta
// mirar el teléfono. Ahora el dibujo NO vive acá: se importa de
// scripts/gen-neurona.mjs, que es la única fuente de verdad, la misma que
// alimenta el glifo de adentro de la app. Si el dibujo cambia, cambian los dos.
import sharp from 'sharp';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { conexiones, nodos } from './gen-neurona.mjs';

// Fondo "FM": el punto medio entre los dos azules que a Matías le gustaban.
// ⚠️ Es azulado a propósito, no gris neutro — se comparó contra un carbón puro
// y contra uno más azul, y este fue el elegido.
const FONDO_A = '#25263d', FONDO_B = '#141521';
const NODO = '#f2f1fa';   // blanquecino con una gota de lila, no blanco puro
const LINEA = '#8b8b9e';  // las conexiones pesan menos que los nodos

// ⚠️ Escala 1.00 (antes 1.18): el dibujo vive en la caja 24×24 y se escalaba
// desde el centro. Bajarlo es lo que le da aire contra los bordes. El mismo
// número está en el glifo de la app; si se cambia uno hay que cambiar el otro.
/**
 * ⚠️ REDONDEADO SÍ O NO, SEGÚN QUIÉN LO USE. No es un detalle estético:
 * - **iOS aplica su propia máscara** al apple-touch-icon y al AppIcon de Xcode.
 *   Si el PNG ya viene con las esquinas redondeadas, las esquinas transparentes
 *   quedan afuera de la máscara y se ven como bordes negros. Esos van CUADRADOS
 *   y sin alfa.
 * - **Los del manifest (192/512)** se usan tal cual, así que llevan el redondeo.
 */
const dibujo = `<path d="${conexiones()}" fill="${LINEA}"/><g fill="${NODO}">${nodos()}</g>`;
const svg = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${FONDO_A}"/>
      <stop offset="1" stop-color="${FONDO_B}"/>
    </linearGradient>
  </defs>
  <rect width="24" height="24"${rx ? ` rx="${rx}"` : ''} fill="url(#f)"/>
  ${dibujo}
</svg>`;

const REDONDEADO = svg(5.5);   // 23% del lado, lo que se venía mirando en las maquetas
const CUADRADO = svg(0);

fs.mkdirSync('public/icons', { recursive: true });

// ⚠️ src/app/icon.png y src/app/apple-icon.png son CONVENCIÓN DE NEXT, no
// decoración. Next los sirve con la URL hasheada por contenido
// (/icon.abc123.png), así que cuando el dibujo cambia la URL cambia sola y el
// navegador NO puede servirte el viejo de caché. Con las rutas fijas de
// /public/icons eso no pasa: mismo nombre, mismo caché, ícono viejo para siempre.
const salidas = [
  // Los del manifest (instalación PWA) van redondeados y con nombre fijo.
  ['public/icons/icon-192.png', 192, REDONDEADO, false],
  ['public/icons/icon-512.png', 512, REDONDEADO, false],
  // iOS enmascara solo: cuadrado y opaco.
  ['public/icons/apple-touch-icon.png', 180, CUADRADO, true],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, CUADRADO, true],
  // Convención de Next: URL hasheada, inmune al caché.
  // ⚠️ CUADRADO Y OPACO, igual que el de Apple. Con esquinas redondeadas y
  // transparentes, Safari lo apoya sobre blanco en la hoja de compartir y en la
  // pestaña: las esquinas dejaban pasar el fondo y el ícono se veía como una
  // pastilla oscura chiquita metida en un cuadrado blanco.
  ['src/app/icon.png', 192, CUADRADO, true],
  ['src/app/apple-icon.png', 180, CUADRADO, true],
  // ⚠️ RUTA RAÍZ, la que iOS busca SOLO. Cuando Safari agrega un sitio a la
  // pantalla de inicio y no logra usar el <link rel="apple-touch-icon">, prueba
  // a ciegas con /apple-touch-icon.png en la raíz del dominio. Si tampoco lo
  // encuentra, dibuja un cuadrado con la inicial del sitio — la "T" que veía
  // Matías. Es redundante a propósito: es la red de seguridad.
  ['public/apple-touch-icon.png', 180, CUADRADO, true],
  ['public/apple-touch-icon-precomposed.png', 180, CUADRADO, true],
];

for (const [ruta, px, fuente, opaco] of salidas) {
  if (ruta.startsWith('ios/') && !fs.existsSync('ios/App/App/Assets.xcassets/AppIcon.appiconset')) {
    console.log('–', ruta, '(no hay proyecto iOS, se saltea)');
    continue;
  }
  let img = sharp(Buffer.from(fuente), { density: 600 }).resize(px, px);
  if (opaco) img = img.flatten({ background: FONDO_B });   // iOS no acepta alfa
  await img.png().toFile(ruta);
  console.log('✓', ruta, `${px}×${px}`, opaco ? '(cuadrado, opaco)' : '(redondeado)');
}

// El SVG fuente queda guardado: sirve para el favicon, para el store y para
// cualquier lugar donde un PNG se vea pixelado.
fs.writeFileSync('public/icons/icono.svg', REDONDEADO);
console.log('✓ public/icons/icono.svg');

// ⚠️ EL MANIFEST LLEVA LA HUELLA DEL DIBUJO EN LA URL, y no es capricho.
// Desde iOS 16.4 Safari usa los íconos DEL MANIFEST para "Agregar a inicio", no
// el <link rel="apple-touch-icon">. Como esas rutas son fijas (/icons/x.png),
// el teléfono se queda con la primera versión que descargó y no la suelta más:
// cambiás el dibujo, regenerás el PNG, y el iPhone te sigue mostrando el viejo.
// Agregarle ?v=<hash del contenido> hace que al cambiar el dibujo cambie la URL
// y el caché quede invalidado solo.
const huella = createHash('sha256').update(dibujo).digest('hex').slice(0, 10);
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
manifest.icons = [
  { src: `/icons/icon-192.png?v=${huella}`, sizes: '192x192', type: 'image/png' },
  { src: `/icons/icon-512.png?v=${huella}`, sizes: '512x512', type: 'image/png' },
  { src: `/icons/apple-touch-icon.png?v=${huella}`, sizes: '180x180', type: 'image/png' },
];
fs.writeFileSync('public/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
console.log('✓ public/manifest.webmanifest (íconos con ?v=' + huella + ')');
