import { createClient } from "npm:@supabase/supabase-js@2";  // ← pinned version

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const body = await req.json().catch(() => null);
        if (!body) return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { content, contentType, contentId, userId } = body;
        if (!content || !userId) return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const EXACT_WORDS = ["sex", "naked", "nude", "kill", "die", "bomb", "spam", "scam", "fuck", "shit", "bitch", "asshole", "pussy", "dick"];
        const PREFIX_WORDS = ["harass", "harras", "harrass", "violent", "violen", "sexual", "porn", "suicid", "attack", "abus", "hate", "bully", "bulli"];

        const contentLower = content.toLowerCase();

        const isToxicByExact = EXACT_WORDS.some(word => new RegExp(`\\b${word}\\b`, 'i').test(contentLower));
        const isToxicByPrefix = PREFIX_WORDS.some(word => new RegExp(`\\b${word}`, 'i').test(contentLower));
        const containsUnwanted = isToxicByExact || isToxicByPrefix;

        let isToxic = false;
        let categoryScores: Record<string, number> = {};

        if (containsUnwanted) {
            isToxic = true;
            categoryScores = { "custom_blocklist": 1.0 };
        } else {
            const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
            if (!OPENAI_API_KEY) {
                console.warn("OPENAI_API_KEY missing - skipping AI moderation");
            } else {
                try {
                    const resp = await fetch("https://api.openai.com/v1/moderations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
                        body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
                    });

                    if (resp.ok) {
                        const data = await resp.json();
                        const result = data.results?.[0];
                        if (result) {
                            isToxic = !!result.flagged;
                            categoryScores = result.category_scores || {};
                        }
                    } else {
                        console.error("OpenAI API failed:", await resp.text());
                    }
                } catch (err) {
                    console.error("OpenAI fetch error:", err);
                }
            }
        }

        const status = isToxic ? "rejected" : "approved";
        const scores = Object.values(categoryScores).map(v => Number(v) || 0);
        const maxScore = scores.length ? Math.max(...scores) : 0;

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
                await supabaseAdmin.from("moderation_logs").insert({
                    user_id: userId,
                    content_type: contentType || null,
                    content_id: contentId || null,
                    content_body: content.slice(0, 2000),
                    toxicity_score: maxScore,
                    is_flagged: isToxic,
                    status,
                });
            } catch (err) {
                console.error("Logging failed:", err);
            }
        }

        return new Response(JSON.stringify({ flagged: isToxic, status, scores: categoryScores }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("Function Error:", err);
        return new Response(JSON.stringify({ error: "internal_error", message: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
