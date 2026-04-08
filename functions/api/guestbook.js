// Cloudflare Pages Function API for Digital Guestbook
// Route: /api/guestbook

const KV_NAMESPACE = 'LOPI_KV';
const GUESTBOOK_KEY = 'global_guestbook';

export async function onRequestGet(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) {
            console.error(`KV Namespace ${KV_NAMESPACE} not found in environment.`);
            return Response.json({ error: "KV not configured" }, { status: 500 });
        }
        
        const dataStr = await kv.get(GUESTBOOK_KEY);
        const list = dataStr ? JSON.parse(dataStr) : [];
        console.log(`Fetched guestbook: ${list.length} entries found.`);
        
        return Response.json(list, { status: 200 });
    } catch (err) {
        console.error("GET Guestbook Error:", err);
        return Response.json({ error: "Failed to fetch guestbook" }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const kv = context.env[KV_NAMESPACE];
        if (!kv) {
            console.error(`KV Namespace ${KV_NAMESPACE} not found in environment.`);
            return Response.json({ error: "KV not configured" }, { status: 500 });
        }

        const body = await context.request.json();
        const { name } = body;
        console.log(`Received Guestbook POST: name="${name}"`);

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return Response.json({ error: "Invalid name" }, { status: 400 });
        }

        const cleanName = name.trim().substring(0, 50); // Sanitize

        const dataStr = await kv.get(GUESTBOOK_KEY);
        let list = dataStr ? JSON.parse(dataStr) : [];

        // Deduplicate: Check existing list case-insensitively
        const isDuplicate = list.some(existing => existing.toLowerCase() === cleanName.toLowerCase());
        if (!isDuplicate) {
            list.push(cleanName);
            await kv.put(GUESTBOOK_KEY, JSON.stringify(list));
            console.log(`Successfully added "${cleanName}" to guestbook.`);
        } else {
            console.log(`Name "${cleanName}" is a duplicate, skipping.`);
        }

        return Response.json({ success: true, count: list.length }, { status: 200 });
    } catch (err) {
        console.error("POST Guestbook Error:", err);
        return Response.json({ error: "Failed to save to guestbook" }, { status: 500 });
    }
}
