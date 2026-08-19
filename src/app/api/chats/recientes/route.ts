import { count, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { chats } from '@/lib/db/schema';

// Los últimos chats, para el menú lateral (27/07, pedido de Matías: "que se
// vayan viendo ahí, para no tener que ir al historial", como en Claude).
//
// ⚠️ SIN FILTRAR POR ESTADO, y esto es el arreglo de un bug que volvía loco a
// Matías: los chats aparecían en el menú y **al rato desaparecían solos**.
// La causa: el worker archiva todo chat que pasa 30 minutos sin actividad
// (`cerrarChatsInactivos`, cada 5 min), y acá se pedía `estado = 'abierto'`.
// O sea, cada chat vivía media hora en el menú y después se esfumaba. Cuando
// lo encontramos, los 48 chats de la base estaban archivados y el menú estaba
// vacío.
// **Archivado no es borrado.** Archivar es que ya se le sacó el resumen y el
// tema; el chat sigue estando y sigue siendo a donde querés volver. Para esta
// lista el estado no importa: importa cuál tocaste último.
//
// Va por API y no por server component porque el Sidebar es cliente y se monta
// en todas las pantallas: cargar esto en cada render del layout sería una
// consulta por navegación. Así se pide UNA vez, cuando abrís el menú.

export const dynamic = 'force-dynamic';

export async function GET() {
  // Se traen unos cuantos aunque el menú muestre dos: el resto es el número
  // que va en "Ver los otros N", y sale de la misma ida a la base.
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({ id: chats.id, titulo: chats.titulo, ultimaActividad: chats.ultimaActividad })
      .from(chats)
      .orderBy(desc(chats.ultimaActividad))
      .limit(20),
    db.select({ total: count() }).from(chats),
  ]);

  return NextResponse.json({ chats: filas, total });
}
