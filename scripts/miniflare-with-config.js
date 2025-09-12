import { Miniflare } from "miniflare";

const mf = new Miniflare({
  script: `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/message':
        return new Response('Hello, World!');
      case '/random':
        return new Response(crypto.randomUUID());
      case '/send-queue':
        await env.MY_FIRST_QUEUE.send({
          message: 'Hello from queue!',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        });
        return new Response('Message sent to queue!');
      default:
        return new Response('Not Found', { status: 404 });
    }
  },

  async queue(batch, env, ctx) {
    console.log('🔄 Processing queue batch with', batch.messages.length, 'messages');
    for (const message of batch.messages) {
      console.log('📨 Processing message:', message.body);
      
      try {
        console.log('✅ Message data:', JSON.stringify(message.body));
        message.ack();
        console.log('✅ Message acknowledged');
      } catch (error) {
        console.error('❌ Error processing message:', error);
        message.retry();
      }
    }
  },
};
  `,
  modules: true,
  compatibilityDate: "2025-09-06",
  compatibilityFlags: ["global_fetch_strictly_public"],
  queueProducers: {
    MY_FIRST_QUEUE: "my-first-queue"
  },
  queueConsumers: {
    "my-first-queue": {
      maxBatchSize: 10,
      maxBatchTimeout: 60,
      maxRetries: 3
    }
  },
  verbose: true,
});

// Test the setup
const response = await mf.dispatchFetch("http://localhost:8787/send-queue");
console.log("Response:", await response.text());

// Keep the process alive to allow queue processing
console.log("Miniflare running... waiting for queue processing...");
console.log("Press Ctrl+C to stop");

// Keep alive
process.stdin.resume();
