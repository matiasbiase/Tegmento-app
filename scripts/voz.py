"""Genera voz con Kokoro (MLX). Uso: python3 voz.py "texto" voz salida.wav"""
import sys

import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper

EspeakWrapper.set_library(espeakng_loader.get_library_path())

import numpy as np
import soundfile as sf
from mlx_audio.tts.models.kokoro import KokoroPipeline
from mlx_audio.tts.utils import load_model

MODELO = "mlx-community/Kokoro-82M-bf16"

def main() -> None:
    texto, voz, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    model = load_model(MODELO)
    pipeline = KokoroPipeline(lang_code="e", model=model, repo_id=MODELO)
    partes = []
    for _, _, audio in pipeline(texto, voice=voz):
        arr = np.asarray(audio)
        partes.append(arr[0] if arr.ndim > 1 else arr)
    if not partes:
        print("Kokoro no produjo audio", file=sys.stderr)
        sys.exit(2)
    sf.write(salida, np.concatenate(partes), 24000)
    print("OK")

if __name__ == "__main__":
    main()
