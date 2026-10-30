/**
 * Medidor de audio real para el dictado por voz.
 *
 * Toma el stream del micrófono y entrega, frame a frame, el RMS suavizado y una
 * banda de frecuencias lista para dibujar ondas. No es una animación
 * decorativa: si el micrófono está en silencio, el nivel y las bandas caen al
 * piso y las barras no se elevan.
 */

export const VOICE_BAND_COUNT = 26;

export interface VoiceAudioFrame {
  /** Nivel RMS suavizado, de 0 (silencio) a 1 (voz fuerte). */
  level: number;
  /** VOICE_BAND_COUNT valores de 0 a 1, uno por barra. */
  bands: number[];
}

export interface VoiceAudioMeter {
  stop: () => void;
}

type AudioContextConstructor = new () => AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

export function createEmptyVoiceBands(): number[] {
  return new Array<number>(VOICE_BAND_COUNT).fill(0);
}

export function createEmptyVoiceFrame(): VoiceAudioFrame {
  return { level: 0, bands: createEmptyVoiceBands() };
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as WindowWithWebkitAudio).webkitAudioContext ??
    null
  );
}

/**
 * Conecta el stream a un `AnalyserNode` y emite un frame cada ~40 ms.
 * Devuelve `null` si el entorno no puede medir audio.
 */
export function createVoiceAudioMeter(
  stream: MediaStream,
  onFrame: (frame: VoiceAudioFrame) => void
): VoiceAudioMeter | null {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) return null;

  let context: AudioContext;
  try {
    context = new AudioContextCtor();
  } catch {
    return null;
  }

  let analyser: AnalyserNode;
  let source: MediaStreamAudioSourceNode;
  try {
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.55;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    // No se conecta a `destination`: solo medimos, no reproducimos.
  } catch {
    void context.close().catch(() => {});
    return null;
  }

  const timeData = new Uint8Array(analyser.fftSize);
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const bands = createEmptyVoiceBands();

  // El habla vive entre ~110 Hz y ~7.8 kHz. Repartimos las barras en escala
  // logarítmica: las vocales mueven el centro y las consonantes los extremos.
  const nyquist = context.sampleRate / 2 || 24000;
  const binHz = nyquist / analyser.frequencyBinCount;
  const minBin = Math.max(1, Math.floor(110 / binHz));
  const maxBin = Math.max(
    minBin + 1,
    Math.min(analyser.frequencyBinCount - 1, Math.ceil(Math.min(7800, nyquist) / binHz))
  );
  const binRatio = maxBin / minBin;

  let smoothedLevel = 0;
  let frameId = 0;
  let lastEmit = 0;
  let stopped = false;

  const readFrame = (): VoiceAudioFrame => {
    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let index = 0; index < timeData.length; index += 1) {
      const sample = (timeData[index]! - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const decibels = rms > 0 ? 20 * Math.log10(rms) : -90;
    const target = Math.min(1, Math.max(0, (decibels + 62) / 52));
    // Ataque inmediato, caída suave: la onda responde al instante pero no
    // parpadea entre sílabas.
    smoothedLevel = target > smoothedLevel ? target : smoothedLevel * 0.86;

    // Compuerta de ruido: por debajo del umbral no hay voz que dibujar.
    const gate = Math.min(1, Math.max(0, (smoothedLevel - 0.05) / 0.07));

    analyser.getByteFrequencyData(freqData);
    for (let index = 0; index < VOICE_BAND_COUNT; index += 1) {
      const from = Math.floor(minBin * Math.pow(binRatio, index / VOICE_BAND_COUNT));
      const to = Math.max(
        from + 1,
        Math.floor(minBin * Math.pow(binRatio, (index + 1) / VOICE_BAND_COUNT))
      );
      let peak = 0;
      for (let bin = from; bin < to && bin < freqData.length; bin += 1) {
        if (freqData[bin]! > peak) peak = freqData[bin]!;
      }
      const normalized = Math.min(1, Math.max(0, (peak - 45) / 190));
      const value = normalized * gate;
      bands[index] = value > bands[index]! ? value : bands[index]! * 0.8;
    }

    return { level: smoothedLevel, bands: bands.slice() };
  };

  const tick = (time: number) => {
    if (stopped) return;
    frameId = window.requestAnimationFrame(tick);
    if (time - lastEmit < 40) return;
    lastEmit = time;
    onFrame(readFrame());
  };
  frameId = window.requestAnimationFrame(tick);

  // Safari crea el contexto suspendido si no nace dentro del gesto.
  try {
    void context.resume().catch(() => {});
  } catch {
    // El contexto seguirá en silencio: las barras quedan en el piso.
  }

  return {
    stop() {
      stopped = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      try {
        source.disconnect();
      } catch {
        // Ya estaba desconectado.
      }
      try {
        analyser.disconnect();
      } catch {
        // Ya estaba desconectado.
      }
      void context.close().catch(() => {});
    },
  };
}
