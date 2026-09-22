import { MessageBridge } from '../bridge/message-bridge';

/**
 * ChatGPT MAIN-world fetch interceptor.
 * Intercepts /backend-api/conversation SSE responses to capture full turns with 100% fidelity.
 */
(function setupChatGPTInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Check if this is a ChatGPT conversation generation request
    const isConversation =
      url.includes('/backend-api/conversation') ||
      url.includes('/backend-api/f/conversation') ||
      url.includes('/backend-api/lat/r');

    if (!isConversation || !init || init.method !== 'POST') {
      return originalFetch.apply(this, [input, init]);
    }

    let userPrompt = '';
    let conversationId: string | undefined;

    try {
      if (typeof window !== 'undefined') {
        const urlMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
          conversationId = urlMatch[1];
        }
      }

      if (typeof init.body === 'string') {
        const parsed = JSON.parse(init.body);
        if (parsed.conversation_id) {
          conversationId = parsed.conversation_id;
        }
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          const lastMsg = parsed.messages[parsed.messages.length - 1];
          if (lastMsg.author?.role === 'user' && lastMsg.content?.parts) {
            userPrompt = lastMsg.content.parts.filter((p: unknown) => typeof p === 'string').join('\n');
          }
        }
      }
    } catch {
      // Defensive parsing: proceed without failing the original fetch
    }

    const response = await originalFetch.apply(this, [input, init]);

    // If no body or prompt captured, return original response
    if (!response.body || !userPrompt) {
      return response;
    }

    try {
      const [streamForBrowser, streamForLiya] = response.body.tee();
      readSseStream(streamForLiya, userPrompt, conversationId);

      return new Response(streamForBrowser, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return response;
    }
  };

  async function readSseStream(stream: ReadableStream<Uint8Array>, prompt: string, conversationId?: string) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          if (trimmed === 'data: [DONE]') {
            continue;
          }

          try {
            const jsonStr = trimmed.slice(5).trim();
            const data = JSON.parse(jsonStr);

            // Extract conversation_id if present in chunk
            if (data.conversation_id && !conversationId) {
              conversationId = data.conversation_id;
            }

            // ChatGPT format: message.content.parts array
            if (data.message?.content?.parts && Array.isArray(data.message.content.parts)) {
              const fullText = data.message.content.parts.filter((p: unknown) => typeof p === 'string').join('');
              if (fullText.length > accumulatedResponse.length) {
                accumulatedResponse = fullText;
              }
            } else if (data.v && typeof data.v === 'string' && data.o === 'append') {
              // Delta append format
              accumulatedResponse += data.v;
            }
          } catch {
            // Partial JSON chunk line or keep-alive ping
          }
        }
      }

      // Final URL fallback if conversation_id was not in body or SSE stream
      if (!conversationId && typeof window !== 'undefined') {
        const urlMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
          conversationId = urlMatch[1];
        }
      }

      if (prompt.trim() && accumulatedResponse.trim()) {
        MessageBridge.dispatchFromMainWorld({
          platform: 'CHATGPT',
          prompt: prompt.trim(),
          response: accumulatedResponse.trim(),
          conversationId,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Defensive: swallow stream read errors
    }
  }
})();
