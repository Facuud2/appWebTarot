import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { DeviceEnvironmentProvider } from "@/components/providers/device-environment-provider";
import { appendVoiceTranscript } from "@/lib/voice-normalizer";

interface MockSpeechResult {
  isFinal: boolean;
  length: number;
  0: { transcript: string };
}

interface MockSpeechResultEvent {
  resultIndex: number;
  results: MockSpeechResult[];
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  /** Simula un navegador que ya cerró la sesión: `stop()`/`abort()` fallan. */
  static failOnStop = false;
  /** Simula el `end` asíncrono de Chrome/WebKit después de `stop()`. */
  static deferredEnd = false;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: MockSpeechResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.end());
  abort = vi.fn(() => this.end());

  private end() {
    if (MockSpeechRecognition.failOnStop) {
      throw new DOMException("La sesión ya terminó", "InvalidStateError");
    }
    if (MockSpeechRecognition.deferredEnd) {
      window.setTimeout(() => this.onend?.(), 20);
      return;
    }
    this.onend?.();
  }

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

let originalUserAgentDescriptor: PropertyDescriptor | undefined;

function emitFinalTranscript(
  recognition: MockSpeechRecognition,
  transcript: string
) {
  act(() => {
    recognition.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, length: 1, 0: { transcript } }],
    });
  });
}

describe("native voice dictation", () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    MockSpeechRecognition.failOnStop = false;
    MockSpeechRecognition.deferredEnd = false;
    originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "userAgent"
    );
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
  });

  afterEach(() => {
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
    if (originalUserAgentDescriptor) {
      Object.defineProperty(
        navigator,
        "userAgent",
        originalUserAgentDescriptor
      );
    }
    vi.restoreAllMocks();
  });

  it("uses Spanish Argentina and appends normalized speech to existing text", async () => {
    const user = userEvent.setup();
    function DictationField() {
      const [text, setText] = React.useState("");
      return (
        <div>
          <textarea
            aria-label="Significado y observaciones"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <VoiceMicButton
            fieldLabel="significado y observaciones"
            onTranscript={(chunk) =>
              setText((current) => appendVoiceTranscript(current, chunk))
            }
          />
        </div>
      );
    }

    render(<DictationField />);
    const field = screen.getByRole("textbox", { name: "Significado y observaciones" });
    await user.type(field, "Inicio de sesión.");
    await user.click(screen.getByRole("button", { name: "Iniciar dictado por voz" }));

    const recognition = MockSpeechRecognition.instances[0]!;
    expect(recognition.lang).toBe("es-AR");
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    emitFinalTranscript(recognition, "salio el giro fante en el tarot de tot");

    expect(field).toHaveValue(
      "Inicio de sesión. Salió El Hierofante en el Tarot de Thoth"
    );
  });

  it("stops a previous field before starting a new recognition session", async () => {
    const user = userEvent.setup();
    const firstChunk = vi.fn();
    const secondChunk = vi.fn();
    render(
      <>
        <VoiceMicButton fieldLabel="pregunta" onTranscript={firstChunk} />
        <VoiceMicButton fieldLabel="notas" onTranscript={secondChunk} />
      </>
    );

    const buttons = await screen.findAllByRole("button", {
      name: "Iniciar dictado por voz",
    });
    await user.click(buttons[0]!);
    const firstRecognition = MockSpeechRecognition.instances[0]!;
    await waitFor(() => expect(firstRecognition.start).toHaveBeenCalledOnce());

    await user.click(buttons[1]!);
    const secondRecognition = MockSpeechRecognition.instances[1]!;
    expect(firstRecognition.stop).toHaveBeenCalledOnce();
    expect(secondRecognition.start).toHaveBeenCalledOnce();
  });

  it("arranca en otro campo aunque cerrar la sesión anterior falle", async () => {
    MockSpeechRecognition.failOnStop = true;
    const user = userEvent.setup();
    const firstChunk = vi.fn();
    const secondChunk = vi.fn();
    render(
      <>
        <VoiceMicButton fieldLabel="pregunta" onTranscript={firstChunk} />
        <VoiceMicButton fieldLabel="notas" onTranscript={secondChunk} />
      </>
    );

    const buttons = await screen.findAllByRole("button", {
      name: "Iniciar dictado por voz",
    });
    await user.click(buttons[0]!);
    await user.click(buttons[1]!);

    await waitFor(() =>
      expect(MockSpeechRecognition.instances).toHaveLength(2)
    );
    const secondRecognition = MockSpeechRecognition.instances[1]!;
    expect(secondRecognition.start).toHaveBeenCalledOnce();
    expect(
      screen.getAllByRole("button", { name: "Detener dictado por voz" })
    ).toHaveLength(1);

    emitFinalTranscript(secondRecognition, "notas del segundo campo");
    expect(secondChunk).toHaveBeenCalledWith("Notas del segundo campo");
    expect(firstChunk).not.toHaveBeenCalled();
  });

  it("reinicia el mismo campo si se pulsa de nuevo mientras la sesión cierra", async () => {
    const user = userEvent.setup();
    render(<VoiceMicButton fieldLabel="pregunta" onTranscript={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );
    const firstRecognition = MockSpeechRecognition.instances[0]!;
    // El navegador tarda en emitir `end` tras `stop()`.
    firstRecognition.stop = vi.fn();

    await user.click(
      screen.getByRole("button", { name: "Detener dictado por voz" })
    );
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    // No debe abrir una sesión paralela mientras la anterior sigue viva.
    expect(MockSpeechRecognition.instances).toHaveLength(1);

    act(() => firstRecognition.onend?.());

    await waitFor(() =>
      expect(MockSpeechRecognition.instances).toHaveLength(2)
    );
    expect(MockSpeechRecognition.instances[1]!.start).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Detener dictado por voz" })
    ).toBeInTheDocument();
  });

  it("espera el fin de la sesión anterior antes de arrancar la nueva", async () => {
    MockSpeechRecognition.deferredEnd = true;
    const user = userEvent.setup();
    render(
      <>
        <VoiceMicButton fieldLabel="pregunta" onTranscript={vi.fn()} />
        <VoiceMicButton fieldLabel="notas" onTranscript={vi.fn()} />
      </>
    );

    const buttons = await screen.findAllByRole("button", {
      name: "Iniciar dictado por voz",
    });
    await user.click(buttons[0]!);
    await user.click(buttons[1]!);

    // Todavía no se creó una segunda sesión: se espera el `end` de la primera.
    expect(MockSpeechRecognition.instances).toHaveLength(1);
    const firstRecognition = MockSpeechRecognition.instances[0]!;
    expect(firstRecognition.stop).toHaveBeenCalledOnce();

    act(() => firstRecognition.onend?.());

    await waitFor(() =>
      expect(MockSpeechRecognition.instances).toHaveLength(2)
    );
    expect(MockSpeechRecognition.instances[1]!.start).toHaveBeenCalledOnce();
  });

  it("falls back to the browser language when Spanish Argentina is unsupported", async () => {
    const user = userEvent.setup();
    render(<VoiceMicButton fieldLabel="pregunta" onTranscript={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    const firstRecognition = MockSpeechRecognition.instances[0]!;
    act(() => {
      firstRecognition.onerror?.({ error: "language-not-supported" });
      firstRecognition.onend?.();
    });

    const fallbackRecognition = MockSpeechRecognition.instances[1]!;
    expect(fallbackRecognition.lang).toBe(navigator.language || "es-ES");
    expect(fallbackRecognition.start).toHaveBeenCalledOnce();
  });

  it("restarts non-continuous Android recognition without repeating prior words", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 15) Chrome/133.0",
    });

    const user = userEvent.setup();
    const onTranscript = vi.fn();
    render(
      <DeviceEnvironmentProvider>
        <VoiceMicButton fieldLabel="pregunta" onTranscript={onTranscript} />
      </DeviceEnvironmentProvider>
    );
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    const firstRecognition = MockSpeechRecognition.instances[0]!;
    expect(firstRecognition.continuous).toBe(false);
    emitFinalTranscript(firstRecognition, "hola");
    act(() => firstRecognition.onend?.());

    await waitFor(() => {
      expect(MockSpeechRecognition.instances).toHaveLength(2);
      expect(MockSpeechRecognition.instances[1]!.start).toHaveBeenCalledOnce();
    });
    const secondRecognition = MockSpeechRecognition.instances[1]!;
    emitFinalTranscript(secondRecognition, "hola");
    expect(onTranscript).toHaveBeenCalledOnce();
    emitFinalTranscript(secondRecognition, "hola buenos días");
    expect(onTranscript).toHaveBeenLastCalledWith("Buenos días");

    await user.click(
      screen.getByRole("button", { name: "Detener dictado por voz" })
    );
    await new Promise((resolve) => window.setTimeout(resolve, 200));
    expect(MockSpeechRecognition.instances).toHaveLength(2);

  });

  it("keeps iOS recognition continuous", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });

    const user = userEvent.setup();
    render(
      <DeviceEnvironmentProvider>
        <VoiceMicButton fieldLabel="pregunta" onTranscript={vi.fn()} />
      </DeviceEnvironmentProvider>
    );
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    expect(MockSpeechRecognition.instances[0]!.continuous).toBe(true);
    expect(MockSpeechRecognition.instances[0]!.interimResults).toBe(true);
  });
});
