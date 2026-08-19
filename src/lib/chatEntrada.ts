import { guardarAdjunto } from './adjuntos';

export type EntradaChat = {
  contenido: string;
  imagenes?: string[];
  adjuntoTipo: string | null;
  adjuntoPath: string | null;
  /** false = abrir un chat nuevo sí o sí (el botón "Nuevo chat"). Por defecto
   *  se continúa el chat reciente, si lo hay: ver POST /api/chat. */
  continuar?: boolean;
};

export async function leerEntradaChat(req: Request): Promise<EntradaChat | null> {
  const tipo = req.headers.get('content-type') ?? '';

  if (tipo.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    const contenido = String(form.get('contenido') ?? '').trim();
    const foto = form.get('foto');
    if (foto instanceof File && foto.size > 0) {
      if (foto.size > 25_000_000) return null; // tope de 25 MB
      const buffer = Buffer.from(await foto.arrayBuffer());
      const nombre = guardarAdjunto(buffer, 'jpg');
      return {
        contenido: contenido || '¿Qué ves en esta foto? Relacionala con mis líneas si aplica.',
        imagenes: [buffer.toString('base64')],
        adjuntoTipo: 'imagen',
        adjuntoPath: nombre,
        continuar: form.get('continuar') !== 'false',
      };
    }
    if (!contenido) return null;
    return { contenido, adjuntoTipo: null, adjuntoPath: null, continuar: form.get('continuar') !== 'false' };
  }

  const body = (await req.json().catch(() => ({}))) as {
    contenido?: string;
    adjuntoTipo?: string;
    adjuntoPath?: string;
    continuar?: boolean;
  };
  const contenido = String(body.contenido ?? '').trim();
  if (!contenido) return null;
  return {
    contenido,
    adjuntoTipo: body.adjuntoTipo ?? null,
    adjuntoPath: body.adjuntoPath ?? null,
    continuar: body.continuar,
  };
}
