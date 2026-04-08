import { onRequestGet as guestbookGet, onRequestPost as guestbookPost } from './functions/api/guestbook.js';
import { onRequestGet as scoresGet, onRequestPost as scoresPost } from './functions/api/scores.js';
import { onRequestGet as petGet, onRequestPost as petPost } from './functions/api/pet.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Create a Pages-compatible context object
    const context = {
      request,
      env,
      ctx,
      params: {},
    };

    try {
      // 1. Guestbook Routing
      if (url.pathname === '/api/guestbook') {
        if (request.method === 'POST') return await guestbookPost(context);
        return await guestbookGet(context);
      }
      
      // 2. Scores Routing
      if (url.pathname === '/api/scores') {
        if (request.method === 'POST') return await scoresPost(context);
        return await scoresGet(context);
      }

      // 3. Pet Routing
      if (url.pathname === '/api/pet') {
        if (request.method === 'POST') return await petPost(context);
        return await petGet(context);
      }

      // 4. Fallback to static assets
      // This is the key: if it's not an API call, we let the Assets system handle it.
      return await env.ASSETS.fetch(request);
      
    } catch (err) {
      console.error("Router Error:", err);
      return new Response(`Worker Router Error: ${err.message}`, { status: 500 });
    }
  },
};
