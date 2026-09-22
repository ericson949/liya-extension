import { RawTurnDTO } from '@features/capture/domain/raw-turn.dto';

export const LIYA_BRIDGE_CHANNEL = 'LIYA_CAPTURE_V1_BRIDGE';
export const SYNAPSE_BRIDGE_CHANNEL = LIYA_BRIDGE_CHANNEL;

export interface LiyaBridgeMessage {
  channel: typeof LIYA_BRIDGE_CHANNEL | 'SYNAPSE_CAPTURE_V1_BRIDGE';
  type: 'TURN_STREAM_COMPLETE';
  payload: RawTurnDTO;
}
export type SynapseBridgeMessage = LiyaBridgeMessage;

export class MessageBridge {
  /**
   * Dispatches a captured turn from the MAIN world to the ISOLATED world.
   */
  public static dispatchFromMainWorld(turn: RawTurnDTO): void {
    if (typeof window === 'undefined') return;

    const message: LiyaBridgeMessage = {
      channel: LIYA_BRIDGE_CHANNEL,
      type: 'TURN_STREAM_COMPLETE',
      payload: turn,
    };

    window.postMessage(message, '*');
  }

  /**
   * Listens in the ISOLATED world for turns emitted by the MAIN world interceptor.
   * Returns an unsubscribe function.
   */
  public static listenInIsolatedWorld(onTurn: (turn: RawTurnDTO) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handler = (event: MessageEvent) => {
      // Security: ensure origin is the current window and payload matches our channel
      if (event.source !== window || !event.data || typeof event.data !== 'object') {
        return;
      }

      const data = event.data as Partial<LiyaBridgeMessage>;
      if (
        (data.channel !== LIYA_BRIDGE_CHANNEL && data.channel !== 'SYNAPSE_CAPTURE_V1_BRIDGE') ||
        data.type !== 'TURN_STREAM_COMPLETE'
      ) {
        return;
      }

      const payload = data.payload;
      if (
        payload &&
        typeof payload.prompt === 'string' &&
        typeof payload.response === 'string' &&
        typeof payload.platform === 'string'
      ) {
        onTurn(payload);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
}
