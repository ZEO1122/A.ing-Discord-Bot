import { ProbeError } from "./domain";

export async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  const size = Number(response.headers.get("content-length"));
  if (size > maxBytes) {
    await response.body?.cancel();
    throw new ProbeError("response_too_large");
  }
  if (!response.body) throw new ProbeError("empty_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new ProbeError("response_too_large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export async function fetchSource(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "manual", signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": "DiscordStudyProbe/1.0", "Accept-Encoding": "identity" },
    });
  } catch { throw new ProbeError("source_network_error"); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProbeError(`source_http_${response.status}`);
  }
  return response;
}
