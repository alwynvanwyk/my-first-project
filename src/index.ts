/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/message':
				return new Response('Hello, Wordl!');
			case '/random':
				return new Response(crypto.randomUUID());
			case '/send-queue':
				// Send a message to the queue
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

	// Queue consumer handler
	async queue(batch, env, ctx): Promise<void> {
		for (const message of batch.messages) {
			console.log('Processing message:', message.body);
			
			try {
				// Process your message here
				// For example, log the message content
				console.log('Message data:', JSON.stringify(message.body));
				
				// Acknowledge the message (mark as successfully processed)
				message.ack();
			} catch (error) {
				console.error('Error processing message:', error);
				// Retry the message (it will be redelivered)
				message.retry();
			}
		}
	},
} satisfies ExportedHandler<Env>;
