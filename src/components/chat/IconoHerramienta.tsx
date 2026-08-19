import { IconCalma, IconComoSeLee, IconFoco, IconObjetivos, IconPolaridad, IconProbando, IconRueda } from '@/components/ui/iconos';
import type { HerramientaChat } from '@/lib/herramientas-chat';

/**
 * EL DIBUJO DE CADA HERRAMIENTA, EN UN SOLO LUGAR.
 *
 * ⚠️ SALIÓ DE `ChatUI` EL 06/08, cuando el composer también necesitó dibujar el
 * ícono de la herramienta elegida. Copiarlo habría dejado dos mapas que se
 * despegan en cuanto se agregue una herramienta sexta: el chip del mensaje la
 * dibujaría y la pastilla del composer no, o al revés. Es la misma trampa del
 * avión de ayer y del tilde-en-caja de esta mañana.
 *
 * ⚠️ Son los MISMOS íconos del menú (`ui/iconos.tsx`), no unos propios: es lo
 * que hace que se entienda de dónde salió ese hashtag sin explicarlo.
 */
const POR_CLAVE = {
  polaridad: IconPolaridad,
  calma: IconCalma,
  foco: IconFoco,
  probando: IconProbando,
  comoselee: IconComoSeLee,
  // ⚠️ `#plan` USA EL ÍCONO DE OBJETIVOS, y no uno propio: lo que deja es
  // exactamente un objetivo. Es la regla de la casa —*todos los íconos de lo
  // mismo, el mismo ícono*— y acá además dice a dónde fue a parar lo que
  // acabás de planear, sin explicarlo.
  plan: IconObjetivos,
  // ⚠️ Y `#reflexión` usa el de la RUEDA: reflexionar sobre algo que te
  // propusiste termina, cuando termina, moviendo un área de la rueda. El ícono
  // adelanta de qué se trata la conversación.
  reflexion: IconRueda,
} as const;

export function IconoHerramienta({ h, className }: { h: HerramientaChat; className?: string }) {
  const Ic = POR_CLAVE[h.icono];
  return <Ic className={className} />;
}
