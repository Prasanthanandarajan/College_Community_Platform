import { supabase } from '../lib/supabase'

// ── Client-side blocklist (mirrors the Edge Function) ──
const EXACT_WORDS = ["sex", "naked", "nude", "kill", "die", "bomb", "spam", "scam", "fuck", "shit", "bitch", "asshole", "pussy", "dick"]
const PREFIX_WORDS = ["harass", "harras", "harrass", "violent", "violen", "sexual", "porn", "suicid", "attack", "abus", "hate", "bully", "bulli"]

/**
 * Checks content against the local blocklist.
 * @returns {{ flagged: boolean, status: string, reason?: string }}
 */
function checkBlocklist(text) {
    const lower = text.toLowerCase().trim()
    console.log('[Moderation] Checking content:', lower)

    // Exact word matches
    for (const word of EXACT_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(lower)) {
            console.warn('[Moderation] Blocked by exact match:', word);
            return { flagged: true, status: 'rejected', reason: `Blocked word: "${word}"` };
        }
    }

    // Prefix matches
    for (const prefix of PREFIX_WORDS) {
        const regex = new RegExp(`\\b${prefix}`, 'i');
        if (regex.test(lower)) {
            console.warn('[Moderation] Blocked by prefix match:', prefix);
            return { flagged: true, status: 'rejected', reason: `Blocked word prefix: "${prefix}"` };
        }
    }

    return { flagged: false, status: 'clean' }
}

/**
 * Moderates content: first checks the local blocklist, then calls the Edge Function.
 * @param {string} content - The text to moderate
 * @param {string} contentType - 'post', 'comment', or 'message'
 * @param {string} userId - The ID of the user creating the content
 * @returns {Promise<{flagged: boolean, status: string, scores?: object}>}
 */
export const moderateContent = async (content, contentType, userId) => {
    // 1) Client-side blocklist check (always works, no network needed)
    const localResult = checkBlocklist(content)
    if (localResult.flagged) {
        console.warn('Content blocked by local filter:', localResult.reason)
        return localResult
    }

    // 2) Try the Edge Function for deeper AI moderation
    try {
        const { data, error } = await supabase.functions.invoke('moderate-content', {
            body: { content, contentType, userId },
            headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
        })

        if (error) throw error
        return data
    } catch (error) {
        console.warn('Edge Function unavailable – local filter passed, allowing content:', error.message)

        // Edge Function is down but local blocklist already passed → allow
        return {
            flagged: false,
            status: 'local_approved',
            error: error.message || 'Moderation service unreachable'
        }
    }
}
