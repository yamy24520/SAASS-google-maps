// Network chunks do not necessarily end at an SSE line boundary.
export async function readReviewStream(stream: ReadableStream<Uint8Array>, onText: (text: string) => void) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  let text = ""
  function line(value: string) {
    if (!value.startsWith("data:")) return
    const json = value.slice(5).trim()
    if (!json || json === "[DONE]") return
    const event = JSON.parse(json)
    if (event.type === "error") throw new Error(event.error?.message ?? "La génération a échoué.")
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      text += event.delta.text
      onText(text)
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      const lines = pending.split("\n")
      pending = lines.pop() ?? ""
      for (const item of lines) line(item.trimEnd())
      if (done) { if (pending) line(pending); break }
    }
    return text
  } finally { reader.releaseLock() }
}
