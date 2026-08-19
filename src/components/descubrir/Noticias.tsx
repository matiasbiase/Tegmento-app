'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tintArea } from '@/lib/area-color';
import { TituloSeccion } from '@/components/ui/TituloSeccion';
import { alternarGuardado, urlsGuardadas } from '@/lib/actions/guardados';
import { haceCuantoLlego } from '@/lib/tiempo-relativo';

type Noticia = {
  titulo: string;
  resumen: string;
  link: string;
  fuente: string;
  fecha: string | null;
  imagen: string | null;
  area: string | null;
  /** 'video' viene de un canal de YouTube. Solo cambia la miniatura: para el
   *  resto es una noticia más, y se guarda con la misma estrellita. */
  tipo?: 'nota' | 'video';
};

type Respuesta = { noticias: Noticia[]; fecha: string | null; cacheado?: boolean; sinConexion?: boolean };

// ⚠️ ACÁ VIVÍA LA OTRA COPIA DE "hace cuánto". Se fue a `lib/tiempo-relativo`
// el 11/08. Esta decía "hace 3 d" y la de Acciones "hace 3 días", para el mismo
// instante: ahora las dos dicen lo mismo porque son la misma función.

// Noticias reales para Descubrir. Vienen de feeds RSS (gratis, sin cuenta),
// ordenadas por tus áreas de foco y etiquetadas con las mismas etiquetas de
// colores del resto de la app. Cada una se puede pasar por Polaridad para ver con
// cuánto cuidado leerla.
export function Noticias({
  categoria = null,
  titulo = 'Noticias',
}: {
  categoria?: string | null;
  /** "Para informarse" en Finanzas (04/08, pedido de Matías): ahí no son solo
   *  noticias, hay videos también, y "Noticias" mentiría sobre la mitad. */
  titulo?: string;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [data, setData] = useState<Respuesta | null>(null);
  // Imágenes que no cargaron: se ocultan para no dejar un hueco blanco.
  const [rotas, setRotas] = useState<Set<string>>(new Set());
  // Las que ya guardaste con la estrellita (0.6). Se piden una vez al montar;
  // después el estado lo lleva el cliente, para que el toque sea instantáneo.
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivoG = true;
    urlsGuardadas()
      .then((u) => vivoG && setGuardadas(new Set(u)))
      .catch(() => {});
    return () => {
      vivoG = false;
    };
  }, []);

  // ⚠️ OPTIMISTA A PROPÓSITO: la estrella cambia al toque y el server va detrás.
  // Es un guardado, no un pago: si falla se revierte y no se perdió nada. Con un
  // await antes de pintar, tocar la estrella se sentiría trabado.
  async function alternar(n: Noticia) {
    const antes = new Set(guardadas);
    setGuardadas((prev) => {
      const c = new Set(prev);
      if (c.has(n.link)) c.delete(n.link);
      else c.add(n.link);
      return c;
    });
    try {
      await alternarGuardado({
        url: n.link,
        titulo: n.titulo,
        resumen: n.resumen,
        fuente: n.fuente,
        imagen: n.imagen,
        area: n.area,
      });
    } catch {
      setGuardadas(antes);
    }
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/noticias');
        const d = (await r.json()) as Respuesta;
        if (vivo) {
          setData(d);
          setEstado('listo');
        }
      } catch {
        if (vivo) setEstado('error');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const todas = data?.noticias ?? [];
  const noticias = categoria ? todas.filter((n) => n.area === categoria) : todas;

  return (
    <section>
      {/* "Noticias" a secas: el "para vos" ya lo dice la categoría elegida arriba. */}
      <TituloSeccion
        aside={data?.fecha && estado === 'listo' ? (data.sinConexion ? 'sin conexión' : `al día · ${haceCuantoLlego(data.fecha) ?? 'hace un rato'}`) : undefined}
      >
        Noticias
      </TituloSeccion>

      {estado === 'cargando' && (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-[18px] bg-white/70 sombra-card" />
          ))}
        </div>
      )}

      {estado === 'error' && (
        <div className="tarjeta bg-white sombra-card">
          <p className="text-[15px] text-tinta-soft text-pretty">No pude traer las noticias ahora. Probá de nuevo en un rato.</p>
        </div>
      )}

      {estado === 'listo' && data && (
        <>
          {data.sinConexion && data.noticias.length > 0 && (
            <p className="mb-2.5 text-[12px] text-niebla text-pretty">Sin internet: te muestro las últimas que guardé.</p>
          )}
          {noticias.length === 0 ? (
            <div className="tarjeta bg-white sombra-card">
              <p className="text-[15px] text-tinta-soft text-pretty">
                {categoria
                  ? `No hay noticias de ${categoria} ahora mismo. Probá otra categoría o volvé más tarde.`
                  : 'Todavía no hay noticias. Cuando tengas internet, las traigo y quedan guardadas para leer después.'}
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-2.5">
              {noticias.slice(0, 8).map((n) => {
                const t = tintArea(n.area);
                const sinImagen = !n.imagen || rotas.has(n.link);
                return (
                  <article
                    key={n.link}
                    className="noti-card mb-2.5 break-inside-avoid overflow-hidden rounded-[14px] shadow-[0_3px_12px_rgba(12,12,28,.13)]"
                  >
                    {/* La foto va con su proporción real (ancho de la tarjeta, alto
                        natural): no se estira ni se recorta, así no se pixela. El
                        borde de abajo se funde en el negro de la tarjeta, y el
                        texto vive sobre ese negro — no encima de la imagen. */}
                    <div className="noti-fundido relative">
                      {sinImagen ? (
                        <div className="h-[70px]" style={{ background: `linear-gradient(150deg, ${t.color}, ${t.tint})` }} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.imagen!}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          // Sin esto, cada diario que publica el feed se entera
                          // de qué pantalla de tu app estabas mirando.
                          referrerPolicy="no-referrer"
                          // Alto natural, pero con techo: una foto vertical de
                          // 600x1600 haría una tarjeta de media pantalla. Solo
                          // en ese caso extremo se recorta.
                          className="block max-h-[260px] w-full object-cover"
                          // Muchos feeds meten logos o pixeles de tracking de 1x1
                          // como "imagen": si viene diminuta, es basura → al color.
                          onLoad={(e) => {
                            if (e.currentTarget.naturalWidth < 140) setRotas((prev) => new Set(prev).add(n.link));
                          }}
                          onError={() => setRotas((prev) => new Set(prev).add(n.link))}
                        />
                      )}
                    </div>

                    <div className="p-[2px_13px_13px]">
                      {n.area && (
                        <span className="mb-1.5 inline-block rounded-md bg-white/12 px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.3px] text-white/85">
                          {n.area}
                        </span>
                      )}
                      <h3 className="line-clamp-4 text-[13px] font-semibold leading-snug text-white text-pretty">{n.titulo}</h3>
                      <div className="mt-1.5 font-mono text-[11px] text-white/55">
                        {n.fuente}
                        {haceCuantoLlego(n.fecha) ? ` · ${haceCuantoLlego(n.fecha)}` : ''}
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-[11px] font-bold text-white"
                        >
                          Leer
                        </a>
                        <button
                          type="button"
                          onClick={() => router.push(`/polaridad?texto=${encodeURIComponent(n.titulo)}`)}
                          className="rounded-full border border-white/20 px-2.5 py-1 font-mono text-[11px] font-semibold text-white/80"
                        >
                          Polaridad
                        </button>
                        {/* LA ESTRELLITA (0.6). Va al final y SIN palabra: es la
                            única de las tres que no te lleva a ningún lado, y con
                            texto competiría con "Leer", que es lo que la tarjeta
                            quiere que hagas. */}
                        <button
                          type="button"
                          onClick={() => alternar(n)}
                          aria-pressed={guardadas.has(n.link)}
                          aria-label={guardadas.has(n.link) ? 'Sacar de guardados' : 'Guardar para después'}
                          className="ml-auto rounded-full px-2 py-1 text-white/80"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill={guardadas.has(n.link) ? '#ffd28a' : 'none'}
                            stroke={guardadas.has(n.link) ? '#ffd28a' : 'currentColor'}
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-[15px]"
                          >
                            <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
