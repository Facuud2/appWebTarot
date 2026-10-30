import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createVoiceAudioMeter,
  VOICE_BAND_COUNT,
  type VoiceAudioFrame,
} from "@/lib/voice-audio-meter";

class MockAnalyserNode {
  static latest: MockAnalyserNode | null = null;
  fftSize = 1024;
  frequencyBinCount = 512;
  smoothingTimeConstant = 0;
  minDecibels = -90;
  maxDecibels = -10;
  timeData = new Uint8Array(1024).fill(128);
  freqData = new Uint8Array(512);
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    MockAnalyserNode.latest = this;
  }

  getByteTimeDomainData(target: Uint8Array) {
    target.set(this.timeData);
  }

  getByteFrequencyData(target: Uint8Array) {
    target.set(this.freqData);
  }
}

class MockAudioContext {
  sampleRate = 48000;
  close = vi.fn(() => Promise.resolve());
  resume = vi.fn(() => Promise.resolve());
  createAnalyser = () => new MockAnalyserNode();
  createMediaStreamSource = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
}

function fillVoice(analyser: MockAnalyserNode, amplitude: number) {
  for (let index = 0; index < analyser.timeData.length; index += 1) {
    const sample = Math.sin((index / analyser.timeData.length) * Math.PI * 12);
    analyser.timeData[index] = 128 + Math.round(sample * amplitude);
  }
  analyser.freqData.fill(amplitude);
}

describe("voice audio meter", () => {
  let frames: VoiceAudioFrame[];
  let frameCallback: ((time: number) => void) | null;
  let originalRaf: typeof window.requestAnimationFrame;
  let originalCancel: typeof window.cancelAnimationFrame;

  beforeEach(() => {
    frames = [];
    frameCallback = null;
    originalRaf = window.requestAnimationFrame;
    originalCancel = window.cancelAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      frameCallback = callback as (time: number) => void;
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: MockAudioContext,
    });
    MockAnalyserNode.latest = null;
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
    delete (window as Window & { AudioContext?: unknown }).AudioContext;
    vi.restoreAllMocks();
  });

  function runFrame(time: number) {
    frameCallback?.(time);
  }

  it("deja las barras en el piso cuando no hay audio", () => {
    const meter = createVoiceAudioMeter({} as MediaStream, (frame) =>
      frames.push(frame)
    );
    expect(meter).not.toBeNull();

    runFrame(100);
    runFrame(200);

    expect(frames).toHaveLength(2);
    expect(frames[0]!.level).toBe(0);
    expect(frames[0]!.bands).toHaveLength(VOICE_BAND_COUNT);
    expect(Math.max(...frames[0]!.bands)).toBe(0);

    meter!.stop();
  });

  it("eleva el nivel y las bandas cuando el micrófono capta voz", () => {
    const meter = createVoiceAudioMeter({} as MediaStream, (frame) =>
      frames.push(frame)
    );
    const analyser = MockAnalyserNode.latest!;
    fillVoice(analyser, 120);

    runFrame(100);
    runFrame(200);
    runFrame(300);

    const last = frames.at(-1)!;
    expect(last.level).toBeGreaterThan(0.4);
    expect(last.bands).toHaveLength(VOICE_BAND_COUNT);
    expect(Math.max(...last.bands)).toBeGreaterThan(0.3);

    meter!.stop();
  });

  it("vuelve al piso en cuanto se hace silencio", () => {
    const meter = createVoiceAudioMeter({} as MediaStream, (frame) =>
      frames.push(frame)
    );
    const analyser = MockAnalyserNode.latest!;
    fillVoice(analyser, 120);
    runFrame(100);
    runFrame(200);
    expect(frames.at(-1)!.level).toBeGreaterThan(0.4);

    fillVoice(analyser, 0);
    for (let step = 3; step < 30; step += 1) runFrame(step * 100);

    const last = frames.at(-1)!;
    expect(last.level).toBeLessThan(0.05);
    expect(Math.max(...last.bands)).toBeLessThan(0.05);

    meter!.stop();
  });

  it("libera el contexto al detenerse", () => {
    const meter = createVoiceAudioMeter({} as MediaStream, vi.fn());
    const analyser = MockAnalyserNode.latest!;
    meter!.stop();
    expect(analyser.disconnect).toHaveBeenCalled();
  });

  it("devuelve null si el navegador no expone AudioContext", () => {
    delete (window as Window & { AudioContext?: unknown }).AudioContext;
    expect(createVoiceAudioMeter({} as MediaStream, vi.fn())).toBeNull();
  });
});
