// Generative AI provider for the support chatbot. Pick it with CHAT_PROVIDER; only the provider talks to the
// outside API, so adding another one (Claude, OpenAI, ...) means adding one function to PROVIDERS.
//
// streamChat({ system, messages, signal }) yields text chunks as they arrive.
// messages: [{ role: 'user' | 'assistant', content: string }]

const TIMEOUT_MS = 30000;

// Split an SSE byte stream into the JSON payloads of its "data:" lines.
async function* sseData(body) {
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of body) {
        buffer += decoder.decode(chunk, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line.startsWith('data:')) {
                const payload = line.slice(5).trim();
                if (payload && payload !== '[DONE]') yield JSON.parse(payload);
            }
        }
    }
}
exports.sseData = sseData;

async function* gemini({ system, messages, signal }) {
    const model = process.env.CHAT_MODEL || 'gemini-3.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.CHAT_API_KEY },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    for await (const event of sseData(res.body)) {
        if (event.promptFeedback?.blockReason) throw new Error(`Gemini blocked the prompt: ${event.promptFeedback.blockReason}`);
        const parts = event.candidates?.[0]?.content?.parts || [];
        for (const p of parts) if (p.text && !p.thought) yield p.text;
    }
}

const PROVIDERS = { gemini };

exports.isConfigured = () => Boolean(PROVIDERS[process.env.CHAT_PROVIDER || 'gemini'] && process.env.CHAT_API_KEY);

exports.streamChat = async function* ({ system, messages, signal }) {
    const provider = PROVIDERS[process.env.CHAT_PROVIDER || 'gemini'];
    if (!provider) throw new Error(`Unknown CHAT_PROVIDER "${process.env.CHAT_PROVIDER}"`);
    // stop on client disconnect (signal) or after TIMEOUT_MS, whichever comes first
    const combined = AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)].filter(Boolean));
    yield* provider({ system, messages, signal: combined });
};
