import { Miniflare } from "miniflare";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Miniflare Queue Tests", () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      scriptPath: "./src/index.ts",
      modules: true,
      compatibilityDate: "2025-09-06",
      compatibilityFlags: ["global_fetch_strictly_public"],
      queueProducers: {
        MY_FIRST_QUEUE: "my-first-queue"
      },
    });
  });

  afterAll(async () => {
    await mf.dispose();
  });

  it("should send message to queue", async () => {
    const response = await mf.dispatchFetch("http://localhost/send-queue");
    expect(await response.text()).toBe("Message sent to queue!");
  });
});
