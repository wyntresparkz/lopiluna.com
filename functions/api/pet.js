// Cloudflare Pages Function API for Tamalopi
// Route: /api/pet

const KV_NAMESPACE = 'LOPI_KV';

export async function onRequestGet(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) return Response.json({ error: "KV not configured" }, { status: 500 });
        
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        
        if (!id) return Response.json({ error: "Missing ID" }, { status: 400 });

        const dataStr = await kv.get(`pet_${id.toUpperCase()}`);
        if (!dataStr) return Response.json({ error: "Pet not found" }, { status: 404 });
        
        return Response.json(JSON.parse(dataStr), { status: 200 });
    } catch (err) {
        return Response.json({ error: "Failed to fetch pet" }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) return Response.json({ error: "KV not configured" }, { status: 500 });

        const body = await context.request.json();
        const { id, hunger, happy, lastUpdated } = body;

        if (!id || typeof id !== 'string' || id.length > 10) {
            return Response.json({ error: "Invalid ID" }, { status: 400 });
        }

        const sanitizedData = {
            id: id.toUpperCase(),
            hunger: Math.max(0, Math.min(100, Number(hunger) || 0)),
            happy: Math.max(0, Math.min(100, Number(happy) || 0)),
            lastUpdated: Number(lastUpdated) || Date.now()
        };

        // Save back to KV using a unique pet_ prefix to not overlap with snake scores
        await kv.put(`pet_${sanitizedData.id}`, JSON.stringify(sanitizedData));

        return Response.json(sanitizedData, { status: 200 });
    } catch (err) {
        return Response.json({ error: "Failed to save pet" }, { status: 500 });
    }
}
