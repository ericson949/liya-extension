import { MessageBridge } from '../bridge/message-bridge';

/**
 * Claude.ai MAIN-world fetch interceptor.
 * Intercepts Claude completion / append_message SSE streams to capture full turns.
 */
(function setupClaudeInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    const isClaudeChat =
      url.includes('/api/append_message') ||
      url.includes('/completion') ||
      url.includes('/api/organizations/') && url.includes('/chat_conversations/');

    if (!isClaudeChat || !init || init.method !== 'POST') {
      return originalFetch.apply(this, [input, init]);
    }

    let userPrompt = '';
    let conversationId: string | undefined;

    try {
      if (typeof init.body === 'string') {
        const parsed = JSON.parse(init.body);
        conversationId = parsed.conversation_uuid || parsed.uuid;
        if (typeof parsed.prompt === 'string') {
          userPrompt = parsed.prompt;
        } else if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          const lastMsg = parsed.messages[parsed.messages.length - 1];
          if (lastMsg.sender === 'human' || lastMsg.role === 'user') {
            userPrompt = typeof lastMsg.text === 'string' ? lastMsg.text : JSON.stringify(lastMsg.content);
          }
        }
      }
    } catch {
      // Defensive
    }

    const response = await originalFetch.apply(this, [input, init]);

    if (!response.body || !userPrompt) {
      return response;
    }

    try {
      const [streamForBrowser, streamForLiya] = response.body.tee();
      readClaudeStream(streamForLiya, userPrompt, conversationId);

      return new Response(streamForBrowser, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return response;
    }
  };

  async function readClaudeStream(stream: ReadableStream<Uint8Array>, prompt: string, conversationId?: string) {
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

          try {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]') continue;

            const data = JSON.parse(jsonStr);

            // Format 1: content_block_delta
            if (data.type === 'content_block_delta' && data.delta?.text) {
              accumulatedResponse += data.delta.text;
            }
            // Format 2: completion delta
            else if (typeof data.completion === 'string') {
              accumulatedResponse += data.completion;
            }
          } catch {
            // Keep-alive or unparseable line
          }
        }
      }

      if (prompt.trim() && accumulatedResponse.trim()) {
        MessageBridge.dispatchFromMainWorld({
          platform: 'CLAUDE',
          prompt: prompt.trim(),
          response: accumulatedResponse.trim(),
          conversationId,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Defensive
    }
  }
})();
