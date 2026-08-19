# El buscador local

Lo usa la estimación de Objetivos (`src/lib/buscar.ts`) para leer la cifra en una
página real en vez de confiar en la memoria del modelo.

## Levantarlo

```
cp docker/searxng/settings.example.yml docker/searxng/settings.yml
sed -i '' "s/PONER-UNO-CON-openssl-rand-hex-16/$(openssl rand -hex 16)/" docker/searxng/settings.yml
docker compose -f docker/searxng/compose.yml up -d
```

## Dos cosas que no son obvias

⚠️ **`json` en `search.formats` no es opcional.** Viene deshabilitado de fábrica
y sin él `/search?format=json` devuelve 403. Es el único motivo por el que hay
un `settings.yml` propio en vez de usar la imagen tal cual.

⚠️ **`limiter: false`.** Con el limiter prendido, el bot-detection de SearXNG le
corta las consultas al propio worker de la app.

## Apagado no rompe nada

`buscar()` devuelve `null`, y el estimador sigue con la memoria del modelo
marcando la cifra como "sin verificar". No hace falta tener Docker prendido para
usar el diario.
