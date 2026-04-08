// Cloudflare Pages Function API for Snake Highscores
// Route: /api/scores

const KV_NAMESPACE = 'LOPI_KV'; // The binding name we will set in Cloudflare dashboard
const SCORE_KEY = 'highscores';

export async function onRequestGet(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) return Response.json([], { status: 200 });

        const scoresStr = await kv.get(SCORE_KEY);
        const scores = scoresStr ? JSON.parse(scoresStr) : [];
        
        return Response.json(scores, { status: 200 });
    } catch (err) {
        return Response.json({ error: "Failed to fetch scores" }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) return Response.json({ error: "KV not configured" }, { status: 500 });

        const body = await context.request.json();
        const { name, score } = body;

        // Basic validation
        if (!name || typeof name !== 'string' || name.length > 3) {
            return Response.json({ error: "Invalid name" }, { status: 400 });
        }
        if (typeof score !== 'number' || score <= 0) {
            return Response.json({ error: "Invalid score" }, { status: 400 });
        }

        // Fetch existing scores
        const scoresStr = await kv.get(SCORE_KEY);
        let scores = scoresStr ? JSON.parse(scoresStr) : [];

        // Insert, sort, and trim to top 20
        scores.push({
            name: name.toUpperCase(),
            score: Math.floor(score)
        });
        
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 20);

        // Save back to KV
        await kv.put(SCORE_KEY, JSON.stringify(scores));

        return Response.json(scores, { status: 200 });
    } catch (err) {
        return Response.json({ error: "Failed to save score" }, { status: 500 });
    }
}
