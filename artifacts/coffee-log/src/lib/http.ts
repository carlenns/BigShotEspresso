/**
 * Extract a human-readable error message from a failed `fetch` Response.
 *
 * The API's graceful error contract returns a JSON body `{ "error": "<message>" }`
 * on 400 / 404 / 409 (and on PATCH/POST validation failures). This reads the body
 * once and unwraps that message, falling back sensibly and never throwing.
 */
export async function errorMessageFrom(response: Response): Promise<string> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    text = "";
  }

  if (text) {
    try {
      const body = JSON.parse(text) as unknown;
      if (
        body &&
        typeof body === "object" &&
        typeof (body as { error?: unknown }).error === "string" &&
        (body as { error: string }).error.trim() !== ""
      ) {
        return (body as { error: string }).error;
      }
    } catch {
      // not JSON — fall through to the raw text
    }
    return text;
  }

  return response.statusText || `Request failed (${response.status})`;
}
