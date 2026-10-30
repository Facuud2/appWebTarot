import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { DeviceEnvironmentProvider } from "@/components/providers/device-environment-provider";
import { VOICE_BAND_COUNT } from "@/lib/voice-audio-meter";

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

function DictationField({
  id = "voice-field",
  label = "Significado y observaciones",
  onValue,
}: {
  id?: string;
  label?: string;
  onValue?: (value: string) => void;
}) {
  const [text, setText] = React.useState("");
  return (
    <VoiceTextarea
      id={id}
      label={label}
      fieldLabel={label}
      value={text}
      onChange={(next) => {
        setText(next);
        onValue?.(next);
      }}
    />
  );
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
    render(<DictationField />);
    const field = screen.getByRole("textbox", {
      name: "Significado y observaciones",
    });
    await user.type(field, "Inicio de sesión.");
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    const recognition = MockSpeechRecognition.instances[0]!;
    expect(recognition.lang).toBe("es-AR");
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    emitFinalTranscript(recognition, "salio el giro fante en el tarot de tot");

    await user.click(
      screen.getByRole("button", { name: "Detener dictado por voz" })
    );

    expect(
      screen.getByRole("textbox", { name: "Significado y observaciones" })
    ).toHaveValue(
      "Inicio de sesión. Salió El Hierofante en el Tarot de Thoth"
    );
  });

  it("reemplaza el cuadro de texto por ondas reales mientras escucha", async () => {
    const user = userEvent.setup();
    render(<DictationField />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    // El campo desaparece: la superficie de ondas toma su lugar.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const surface = screen.getByRole("group", { name: "Dictado en curso" });
    const bars = surface.querySelectorAll(".voice-live-bar");
    expect(bars).toHaveLength(VOICE_BAND_COUNT);
    // Sin audio medido las barras quedan en el piso, no animadas.
    bars.forEach((bar) => {
      expect((bar as HTMLElement).style.transform).toBe("scaleY(0.050)");
    });
  });

  it("no pierde dos resultados finales que llegan en el mismo evento", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<DictationField onValue={onValue} />);

    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );
    const recognition = MockSpeechRecognition.instances[0]!;

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: true, length: 1, 0: { transcript: "el loco" } },
          { isFinal: true, length: 1, 0: { transcript: "la torre" } },
        ],
      });
    });

    expect(onValue).toHaveBeenLastCalledWith("El Loco. La torre");
  });

  it("stops a previous field before starting a new recognition session", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DictationField id="field-a" label="pregunta" />
        <DictationField id="field-b" label="notas" />
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
    render(
      <>
        <DictationField id="field-a" label="pregunta" />
        <DictationField id="field-b" label="notas" />
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
  });

  it("reinicia el mismo campo si se pulsa de nuevo mientras la sesión cierra", async () => {
    const user = userEvent.setup();
    render(<DictationField label="pregunta" />);

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

  it("funciona en pulsaciones repetidas sin recargar la página", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<DictationField onValue={onValue} />);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await user.click(
        screen.getByRole("button", { name: "Iniciar dictado por voz" })
      );
      const recognition = MockSpeechRecognition.instances[cycle]!;
      expect(recognition.start).toHaveBeenCalledOnce();
      emitFinalTranscript(recognition, `chunk numero ${cycle}`);
      await user.click(
        screen.getByRole("button", { name: "Detener dictado por voz" })
      );
      expect(
        screen.getByRole("button", { name: "Iniciar dictado por voz" })
      ).toBeInTheDocument();
    }

    expect(MockSpeechRecognition.instances).toHaveLength(3);
    expect(onValue).toHaveBeenCalledTimes(3);
  });

  it("reabre la escucha si el navegador aborta la sesión sin pedirlo", async () => {
    const user = userEvent.setup();
    render(<DictationField label="pregunta" />);

    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );
    const firstRecognition = MockSpeechRecognition.instances[0]!;

    act(() => {
      firstRecognition.onerror?.({ error: "aborted" });
    });

    await waitFor(() => {
      expect(MockSpeechRecognition.instances).toHaveLength(2);
      expect(MockSpeechRecognition.instances[1]!.start).toHaveBeenCalledOnce();
    });
    expect(
      screen.getByRole("button", { name: "Detener dictado por voz" })
    ).toBeInTheDocument();
  });

  it("espera el fin de la sesión anterior antes de arrancar la nueva", async () => {
    MockSpeechRecognition.deferredEnd = true;
    const user = userEvent.setup();
    render(
      <>
        <DictationField id="field-a" label="pregunta" />
        <DictationField id="field-b" label="notas" />
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
    render(<DictationField label="pregunta" />);
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
    const onValue = vi.fn();
    render(
      <DeviceEnvironmentProvider>
        <DictationField label="pregunta" onValue={onValue} />
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
    expect(onValue).toHaveBeenCalledOnce();
    emitFinalTranscript(secondRecognition, "hola buenos días");
    expect(onValue).toHaveBeenLastCalledWith("Hola. Buenos días");

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
        <DictationField label="pregunta" />
      </DeviceEnvironmentProvider>
    );
    await user.click(
      screen.getByRole("button", { name: "Iniciar dictado por voz" })
    );

    expect(MockSpeechRecognition.instances[0]!.continuous).toBe(true);
    expect(MockSpeechRecognition.instances[0]!.interimResults).toBe(true);
  });
});
