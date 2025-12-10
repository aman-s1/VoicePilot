interface InterpretFormRequest {
	speech: string;
	fields: {
		key: string;
		label?: string;
		name?: string;
		type?: 'input' | 'textarea' | 'select';
	}[];
}

interface InterpretFormResponse {
	data: Record<string, string>;
	confidence?: Record<string, number>;
}

function buildInterpretPrompt(speech: string, fields: { key: string; label?: string; type?: string }[]) {
	return `
    You are a voice-to-form extraction engine.

    TASK:
    Extract structured values from speech and assign them ONLY to the matching field keys.

    FIELDS:
    ${fields.map((f) => `- ${f.key} (${f.type ?? 'text'}): ${f.label ?? f.key}`).join('\n')}

    RULES:
    - Output MUST be valid JSON only.
    - JSON structure:
    {
      "data": { "<fieldKey>": "<value>" },
      "confidence": { "<fieldKey>": 0.0 - 1.0 }
    }
    - Keys MUST exactly match provided field keys.
    - Do NOT combine multiple fields.
    - Do NOT hallucinate values.
    - Preserve capitalization for names, companies, sentences.
    - Convert spoken email phrases ("at the rate", "dot") into valid email.
    - Convert spoken numbers into digits ONLY if field type suggests it.
    - If value is unclear, omit the key entirely.

    SPEECH:
    "${speech}"

    JSON OUTPUT:
`;
}

async function callLLM(prompt: string, env: Env) {
	const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
		prompt,
		max_tokens: 400,
		temperature: 0,
	});

	return result.response;
}

export async function interpretFormController(req: Request, env: Env): Promise<Response> {
	if (req.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	let body: InterpretFormRequest;

	try {
		body = await req.json();
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const { speech, fields } = body;

	if (!speech || typeof speech !== 'string') {
		return Response.json({ error: 'speech is required' }, { status: 400 });
	}

	if (!Array.isArray(fields) || fields.length === 0) {
		return Response.json({ error: 'fields must be a non-empty array' }, { status: 400 });
	}

	const prompt = buildInterpretPrompt(speech, fields);

	let aiRaw: string;
	try {
		aiRaw = (await callLLM(prompt, env)) as string;
		console.log('AI Raw Output:', aiRaw); // Debug logging
	} catch (err) {
		console.error('AI Call Failed:', err);
		return Response.json({ error: 'AI processing failed' }, { status: 500 });
	}

	let parsed: InterpretFormResponse;
	try {
		// Clean up markdown code blocks if present
		const jsonMatch = aiRaw.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			aiRaw = jsonMatch[0];
		}
		parsed = JSON.parse(aiRaw);
	} catch {
		console.error('JSON Parse Failed. Raw:', aiRaw);
		return Response.json({ error: 'Invalid AI JSON output' }, { status: 500 });
	}

	// ✅ Hard-filter output to allowed keys only
	const allowedKeys = new Set(fields.map((f) => f.key));

	const cleanedData: Record<string, string> = {};
	const cleanedConfidence: Record<string, number> = {};

	if (parsed.data) {
		for (const [key, value] of Object.entries(parsed.data)) {
			if (allowedKeys.has(key) && typeof value === 'string') {
				cleanedData[key] = value.trim();
			}
		}
	}

	if (parsed.confidence) {
		for (const [key, value] of Object.entries(parsed.confidence)) {
			if (allowedKeys.has(key) && typeof value === 'number') {
				cleanedConfidence[key] = Math.min(1, Math.max(0, value));
			}
		}
	}

	const response: InterpretFormResponse = {
		data: cleanedData,
		confidence: cleanedConfidence,
	};

	return Response.json(response);
}
