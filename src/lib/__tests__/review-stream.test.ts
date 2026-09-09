import { expect, it } from "vitest"
import { readReviewStream } from "../review-stream"

it("preserves multibyte text and SSE events split across arbitrary network chunks", async () => {
  const bytes = new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Merci, à bientôt 👋"}}\n\ndata: [DONE]\n')
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
    controller.close()
  } })
  expect(await readReviewStream(stream, () => {})).toBe("Merci, à bientôt 👋")
})

it("surfaces provider errors instead of reporting a successful generation", async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode('data: {"type":"error","error":{"message":"quota exceeded"}}\n'))
    controller.close()
  } })
  await expect(readReviewStream(stream, () => {})).rejects.toThrow("quota exceeded")
})
