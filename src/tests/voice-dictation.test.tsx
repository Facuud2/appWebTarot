import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
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
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: MockSpeechResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn(() => this.onend?.());

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

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
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
  });

  afterEach(() => {
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("uses Spanish Argentina and appends normalized speech to existing text", async () => {
    const user = userEvent.setup();
    function DictationField() {
      const [text, setText] = React.useState("");
      return (
        <div>
          <textarea
            aria-label="Síntesis o conclusión"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <VoiceMicButton
            fieldLabel="síntesis o conclusión"
            onTranscript={(chunk) =>
              setText((current) => appendVoiceTranscript(current, chunk))
            }
          />
        </div>
      );
    }

    render(<DictationField />);
    const field = screen.getByRole("textbox", { name: "Síntesis o conclusión" });
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
});
