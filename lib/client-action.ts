import type { ActionResult } from "./types";
/** Also covers loss of connectivity before a server action reaches the server. */
export async function clientAction<T>(
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch {
    return {
      ok: false,
      error:
        "Could not reach MacroMine. Check your connection and try again. Your changes are still here.",
    };
  }
}
