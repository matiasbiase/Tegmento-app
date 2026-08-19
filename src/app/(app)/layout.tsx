import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { Sidebar } from '@/components/nav/Sidebar';
import { BarraGlobal } from '@/components/nav/BarraGlobal';
import { SincronizarRitual } from '@/components/nav/SincronizarRitual';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cfg = await db.select().from(config).where(eq(config.clave, 'onboarding'));
  if (cfg[0]?.valor !== 'completado') redirect('/onboarding');

  return (
    // pb alto: deja lugar a la barra global (mini nav + composer) fija abajo.
    // El fondo va en LOS DOS: acá y en `main`. No es duplicado al pedo.
    // `main` lo necesita para ser opaco y tapar el menú al cerrarse; el
    // contenedor lo necesita para la franja del safe-area (la del reloj), que
    // queda fuera de `main`. Sin esto, arriba se veía el lavanda plano y abajo
    // el fondo con auras: **una costura horizontal justo debajo del reloj**
    // (lo vio Matías, 27/07).
    // Calzan exacto porque `.fondo-app` va con `background-attachment: fixed`:
    // los dos gradientes se anclan al viewport, no a su elemento. Y no se
    // superponen: el lavanda de `.fondo-app` es opaco, así que donde está
    // `main` solo se ve el suyo.
    // ⚠️⚠️ LOS +14px SON PARA ESCAPARLE AL DIFUMINADO DE iOS (18/08).
    // Matías: *"bajá todo un poquito en todas las pantallas para que no se vea
    // difuminado, porque no se está solucionando"*. **No es el arreglo del
    // problema, es correr el contenido fuera de la zona donde se nota** — la causa
    // real son las tres copias del fondo con `background-attachment: fixed`, que
    // iOS ignora, y eso quedó anotado como trabajo aparte.
    //
    // ⚠️⚠️ Y SI ESTE NÚMERO CAMBIA, HAY QUE CAMBIAR EL `top` DE LA HAMBURGUESA CON
    // ÉL. Ese botón es `fixed`: no se entera de este padding. Los 14 de acá están
    // sumados también en `Sidebar` (22 → 36) para que la racha —que va en el
    // flujo— siga centrada con él. Un solo número en dos archivos.
    <div className="fondo-app mx-auto flex min-h-dvh max-w-md flex-col pb-[150px] pt-[calc(env(safe-area-inset-top)_+_14px)]">
      {/* ⚠️ EL FONDO VIVE ACÁ, EN LO QUE SE MUEVE, y no en el contenedor.
          Es lo que hace que el menú se sienta bien: `main` es una superficie
          OPACA que se corre y destapa el panel, y al cerrar lo vuelve a tapar.
          Con el fondo en el contenedor, `main` era transparente: el panel se
          veía por detrás del contenido y al cerrarse el contenido llegaba
          primero y el panel desaparecía después, con un salto raro (lo marcó
          Matías, 27/07).
          ⚠️ `flex-1` y NO `min-h-dvh`: con `min-h-dvh` el alto de `main` se
          SUMABA al padding del contenedor (safe-area arriba + 150px abajo) y la
          página quedaba siempre más alta que la pantalla — **scrolleaba aunque
          no hubiera nada que scrollear**. Con el contenedor en columna, `flex-1`
          hace que `main` llene lo que sobra y ni un pixel más, así igual tapa
          hasta abajo cuando la página es corta.
          `relative z-30`: por encima del panel (z-20) mientras se corre. */}
      <main className="desplaza-menu fondo-app relative z-30 flex-1">{children}</main>
      <Sidebar />
      <BarraGlobal />
      {/* No dibuja nada: reprograma los avisos del ritual contra lo que ya
          cargaste hoy. Ver el docstring, que explica por qué hace falta. */}
      <SincronizarRitual />
    </div>
  );
}
