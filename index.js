// Dummy entry point to satisfy Wrangler's "main" requirement for KV bindings.
export default {
  async fetch(request, env, ctx) {
    return env.ASSETS.fetch(request);
  },
};
