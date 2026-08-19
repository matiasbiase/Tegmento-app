import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Newsreader, Quicksand } from 'next/font/google';
import './globals.css';

// Serif editorial para los títulos grandes del rediseño (prototipo "Bitácora Simple").
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

// Redondeada para labels y kickers (reemplaza a Geist Mono, pedido de Matías 17/07).
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tegmento',
  description: 'Bitácora de vida personal con IA local',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Tegmento' },
  // ⚠️ Los <link> de ícono NO se declaran acá a propósito. Salen de
  // src/app/icon.png y src/app/apple-icon.png, que son convención de Next: los
  // sirve con la URL hasheada por contenido, así que cuando el dibujo cambia
  // cambia la URL y el navegador no puede darte el viejo de caché.
  // Declararlos a mano acá apuntando a /icons/*.png los volvía a atar a una
  // ruta fija — que es justo lo que hacía que el ícono viejo quedara pegado.
  // Los dos PNG se generan con `npm run icons`.
};

export const viewport: Viewport = {
  // Literal a propósito: el meta theme-color lo lee el navegador antes de
  // aplicar CSS, así que no resuelve var(). Tiene que coincidir a mano con
  // --color-lavanda de globals.css.
  themeColor: '#f3f3fb',
  width: 'device-width',
  initialScale: 1,
  // Escala fija: la app es mobile-first y el zoom automático de iOS al tocar
  // inputs hacía "saltar" el tamaño de todo mientras escribís.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${quicksand.variable} ${newsreader.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
