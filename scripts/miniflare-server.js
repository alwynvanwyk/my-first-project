import { Miniflare } from "miniflare";
import { createServer } from 'http';

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
      maxBatchSize: 5,
      maxBatchTimeout: 10,  // Max allowed is 60 seconds
      maxRetries: 3
    }
  },
  verbose: true,
});

const server = createServer(async (req, res) => {
  try {
    // console.log('🔍 Incoming request:', {
    //   method: req.method,
    //   url: req.url,
    //   headers: req.headers
    // });

    // Read request body
    let body = '';
    req.on('data', chunk => {
      // console.log('📦 Received chunk:', chunk.toString());
      body += chunk.toString();
    });
    
    await new Promise(resolve => {
      req.on('end', () => {
        // console.log('✅ Request body complete:', body);
        resolve();
      });
    });

    const url = `http://localhost:8787${req.url}`;
    // console.log('🌐 Constructed URL:', url);

    const processedHeaders = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value
      ])
    );
    // console.log('📋 Processed headers:', processedHeaders);

    const requestOptions = {
      method: req.method,
      headers: processedHeaders,
      body: body || undefined,
    };
    // console.log('⚙️ Request options:', requestOptions);

    // console.log('� Dispatching to Miniflare...');
    const response = await mf.dispatchFetch(url, {
      method: req.method,
      headers: processedHeaders,
      body: body || undefined,
    });
    // console.log('✅ Response received:', response.status);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    console.log('📤 Sending response:', responseBody);
    res.end(responseBody);
  } catch (error) {
    console.error('❌ Server error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(8787, () => {
  console.log("🚀 Miniflare server running on http://localhost:8787");
  console.log("📨 Try: curl http://localhost:8787/send-queue");
  console.log("🛑 Press Ctrl+C to stop");
});
