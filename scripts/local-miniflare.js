import { Miniflare } from "miniflare";
import path from "path";

const mf = new Miniflare({
  scriptPath: "./src/index.ts",
  modules: true,
  compatibilityDate: "2025-09-06",
  compatibilityFlags: ["global_fetch_strictly_public"],
  
  // Queue configuration
  queueProducers: {
    MY_FIRST_QUEUE: "my-first-queue"
  },
  queueConsumers: {
    "my-first-queue": {
      maxBatchSize: 10,
      maxBatchTimeout: 5000,
      maxRetries: 3,
      deadLetterQueue: "my-dlq"
    }
  },
  
  // Enable logging
  verbose: true,
});

// Test the setup
const response = await mf.dispatchFetch("http://localhost:8787/send-queue");
console.log("Response:", await response.text());

// Keep running to process queue messages
console.log("Miniflare running... Press Ctrl+C to stop");