/**
 * Direct browser → OpenAI streaming call for word explanations.
 *
 * Uses the Chat Completions endpoint with Server-Sent Events. The API key lives
 * in the frontend (localStorage) and is sent straight to api.openai.com — fine
 * for personal use; never ship a shared key this way.
 */

export interface ExplainParams {
  word: string;
  sentence: string;
  baseLanguage: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

function systemPrompt(base: string): string {
  return [
    `You are a warm, concise language tutor helping a learner pick up vocabulary from TV subtitles.`,
    `Write ALL explanations in ${base}.`,
    `Keep the target word and any example phrases in their ORIGINAL language — do not translate the headword itself.`,
    `Reply in GitHub-flavored markdown using EXACTLY these five H2 sections, in this order, nothing before or after:`,
    `## Meaning`,
    `## In this sentence`,
    `## Other meanings`,
    `## Good to know`,
    `## Memory hook`,
    `Keep each section to 1–3 short sentences. The "Memory hook" must be a vivid, sticky mnemonic that makes the word unforgettable. Do not use code fences.`,
  ].join('\n');
}

/** Stream an explanation for a word, yielding text deltas as they arrive. */
export async function* explainWord(p: ExplainParams): AsyncGenerator<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify({
      model: p.model,
      stream: true,
      max_completion_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt(p.baseLanguage) },
        {
          role: 'user',
          content: `Word: "${p.word}"\nSubtitle line: "${p.sentence}"\n\nExplain "${p.word}" as it is used in that line.`,
        },
      ],
    }),
    signal: p.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let msg = `OpenAI request failed (${res.status})`;
    try {
      const j = JSON.parse(detail);
      if (j?.error?.message) msg = j.error.message;
    } catch {
      if (detail) msg = detail.slice(0, 300);
    }
    throw new Error(msg);
  }
  if (!res.body) throw new Error('No response body from OpenAI.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
}
