import { MessageBridge } from '../bridge/message-bridge';

/**
 * Gemini MAIN-world fetch interceptor.
 * Intercepts Gemini StreamGenerate calls to capture turns.
 */
(function setupGeminiInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    const isGeminiChat =
      url.includes('StreamGenerate') ||
      url.includes('streamGenerate') ||
      url.includes('BardFrontendService');

    if (!isGeminiChat || !init || init.method !== 'POST') {
      return originalFetch.apply(this, [input, init]);
    }

    let userPrompt = '';

    try {
      if (typeof init.body === 'string') {
        const bodyStr = init.body;
        // In Gemini web, body often includes `f.req=[[[...prompt...]]]` URL encoded
        if (bodyStr.includes('f.req=')) {
          const rawParam = new URLSearchParams(bodyStr).get('f.req');
          if (rawParam) {
            const parsed = JSON.parse(rawParam);
            if (Array.isArray(parsed) && parsed[0] && Array.isArray(parsed[0][0])) {
              userPrompt = String(parsed[0][0][0] ?? '');
            }
          }
        }
      }
    } catch {
      // Defensive
    }

    const response = await originalFetch.apply(this, [input, init]);

    if (!response.body) {
      return response;
    }

    try {
      const [streamForBrowser, streamForLiya] = response.body.tee();
      readGeminiStream(streamForLiya, userPrompt);

      return new Response(streamForBrowser, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return response;
    }
  };

  async function readGeminiStream(stream: ReadableStream<Uint8Array>, detectedPrompt: string) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Gemini streaming responses contain nested JSON arrays
        const matches = chunk.matchAll(/\[\["(.*?)",/g);
        for (const match of matches) {
          const textCandidate = match[1];
          if (textCandidate && textCandidate.length > 20 && !textCandidate.startsWith('http')) {
            accumulatedResponse = textCandidate.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
        }
      }

      // If prompt was not parsed from the body, extract from DOM fallback or pass what we have
      if (accumulatedResponse.trim()) {
        MessageBridge.dispatchFromMainWorld({
          platform: 'GEMINI',
          prompt: detectedPrompt.trim() || 'Gemini Interaction',
          response: accumulatedResponse.trim(),
          timestamp: Date.now(),
        });
      }
    } catch {
      // Defensive
    }
  }
})();
