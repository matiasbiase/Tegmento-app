import type { CapacitorConfig } from '@capacitor/cli';

// Wrapper nativo (iOS/Watch) sobre Tegmento. La app sigue corriendo en la Mac
// (Ollama, SQLite, worker); esta cáscara la carga por la URL de Tailscale (cert
// válido) y suma el puente para plugins nativos (HealthKit, Gmail nativo, push…).
//
// Para testear en el simulador SIN pagar nada. Cambiá `server.url` si querés que
// apunte a la instancia de test (:8443) en vez de a tu app real (:443).
const config: CapacitorConfig = {
  appId: 'net.tegmento.app',
  appName: 'Tegmento',
  webDir: 'www',
  // Fondo del contenedor nativo = fondo de la app, así no se ven bandas blancas
  // detrás del WebView ni en las safe areas.
  backgroundColor: '#f3f3fb',
  server: {
    // ⚠️ ACÁ NO PUEDE IR `localhost` (29/07). Estaba en https://localhost:3000, y
    // **dentro del iPhone "localhost" es el iPhone**, no la Mac: la app nativa
    // abría en blanco porque buscaba el server en el propio teléfono.
    //
    // Va el nombre de Tailscale y no la IP de la LAN por dos
    // razones: funciona fuera de casa, y no cambia cuando el router reparte
    // otra IP. El certificado de `certs/` ya lo incluye como SAN, así que no hay
    // advertencia de seguridad.
    //
    // La app sigue viviendo en la Mac (Ollama, SQLite, el worker): esto es una
    // cáscara nativa que la carga. Si la Mac está apagada, la app no abre.
    // ⚠️ SIN PUERTO, Y ESO ES TODO EL ASUNTO (29/07).
    // Con `:3000` se entra DIRECTO al server de Next, que usa un certificado
    // hecho con mkcert. Un navegador te deja aceptarlo a mano; **el WebView de
    // una app nativa no: rechaza la conexión sin mostrar nada y la app queda en
    // blanco.** Eso fue el iPhone X en blanco durante media tarde.
    // Sin puerto se entra por `tailscale serve`, que ya estaba configurado
    // proxeando a localhost:3000 y **pone un certificado público de verdad**.
    // Así ningún dispositivo tiene que instalar el CA de mkcert.
    //   tailscale serve status  → https://TU-MAQUINA.TU-TAILNET.ts.net
    //                             |-- / proxy https+insecure://localhost:3000
    // Tu máquina, en APP_HOST. Tiene que ser alcanzable desde el teléfono:
    // `localhost` acá es el teléfono, no la Mac (ver el comentario de arriba).
    url: process.env.APP_HOST ?? 'https://TU-MAQUINA.TU-TAILNET.ts.net',
    cleartext: false,
  },
  ios: {
    backgroundColor: '#f3f3fb',
    // 'never': el WebView va de borde a borde; el CSS de la app (env(safe-area-*))
    // maneja el notch y la barra inferior. Así no quedan bandas blancas.
    contentInset: 'never',
  },
};

export default config;
