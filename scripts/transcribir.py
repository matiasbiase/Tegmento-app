"""Transcribe un WAV 16 kHz mono PCM16 con mlx-whisper. Uso: python3 transcribir.py archivo.wav"""
import json
import sys
import wave

import numpy as np
import mlx_whisper

MODELO = "mlx-community/whisper-large-v3-turbo"

def main() -> None:
    ruta = sys.argv[1]
    with wave.open(ruta, "rb") as w:
        canales = w.getnchannels()
        ancho = w.getsampwidth()
        crudo = w.readframes(w.getnframes())
    if ancho != 2:
        print(f"WAV inesperado: {ancho*8}bit (esperado 16 bit)", file=sys.stderr)
        sys.exit(2)
    audio = np.frombuffer(crudo, dtype=np.int16).astype(np.float32) / 32768.0
    # si viniera estéreo, promediamos a mono (afconvert entrega 16 kHz)
    if canales > 1:
        audio = audio.reshape(-1, canales).mean(axis=1)
    resultado = mlx_whisper.transcribe(audio, path_or_hf_repo=MODELO, language="es")
    print(json.dumps({"texto": str(resultado["text"]).strip()}))

if __name__ == "__main__":
    main()
