import type { ActionResult } from "@/types/domain";

export async function callRpc<TResult>(
  op: string,
  payload?: unknown
): Promise<ActionResult<TResult>> {
  try {
    const response = await fetch("/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ op, payload }),
    });

    const json = (await response.json()) as ActionResult<TResult>;
    if (json && typeof json === "object" && "ok" in json) {
      return json;
    }

    return {
      ok: false,
      error: "Respuesta inesperada del servidor.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No fue posible conectar con el servidor.",
    };
  }
}
