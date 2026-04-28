import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { Sentry } from '../common/sentry';
import { transactionEventEmitter } from './transaction-events';
import {
  ClientMessageSchema,
  ServerEvent,
  PongMessage,
  ErrorMessage,
  SubscribeMessage,
  UnsubscribeMessage,
} from './ws.types';

interface ClientSession {
  ws: WebSocket;
  subscribed: {
    datasetIds: Set<string>;
    transactionIds: Set<string>;
  };
  isAlive: boolean;
}

/**
 * WebSocket server for real-time transaction updates
 */
export class WebSocketServer_Hazina {
  private wss: WebSocketServer;
  private clients: Map<string, ClientSession> = new Map();
  private clientCounter: number = 0;
  private heartbeatInterval: NodeJS.Timer | null = null;
  private apiKey: string;

  constructor(httpServer: HTTPServer, apiKey: string = '') {
    this.apiKey = apiKey || process.env.WEBSOCKET_API_KEY || '';

    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    // Listen for transaction events
    this.attachEventListeners();

    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = `client_${++this.clientCounter}`;
    const session: ClientSession = {
      ws,
      subscribed: {
        datasetIds: new Set(),
        transactionIds: new Set(),
      },
      isAlive: true,
    };

    this.clients.set(clientId, session);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    // Handle client messages
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for ${clientId}:`, error);
      Sentry.captureException(error, { tags: { clientId } });
    });

    // Handle client disconnection
    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleMessage(clientId: string, data: WebSocket.Data): void {
    const session = this.clients.get(clientId);
    if (!session) return;

    try {
      const message = JSON.parse(data.toString());
      const validated = ClientMessageSchema.parse(message);

      switch (validated.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, validated as SubscribeMessage);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, validated as UnsubscribeMessage);
          break;
        case 'ping':
          this.sendPong(clientId);
          break;
        default:
          this.sendError(clientId, 'Unknown message type', 'UNKNOWN_TYPE');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid message';
      this.sendError(clientId, message, 'PARSE_ERROR');
      Sentry.captureException(error, { tags: { clientId } });
    }
  }

  /**
   * Handle subscribe message
   */
  private handleSubscribe(clientId: string, msg: SubscribeMessage): void {
    const session = this.clients.get(clientId);
    if (!session) return;

    // Validate API key if provided
    if (msg.token && this.apiKey && msg.token !== this.apiKey) {
      this.sendError(clientId, 'Unauthorized', 'UNAUTHORIZED');
      return;
    }

    // Subscribe to datasets
    if (msg.datasetIds && msg.datasetIds.length > 0) {
      msg.datasetIds.forEach((id) => {
        session.subscribed.datasetIds.add(id);
      });
      console.log(`[WebSocket] ${clientId} subscribed to datasets: ${msg.datasetIds.join(', ')}`);
    }

    // Subscribe to transactions
    if (msg.transactionIds && msg.transactionIds.length > 0) {
      msg.transactionIds.forEach((id) => {
        session.subscribed.transactionIds.add(id);
      });
      console.log(
        `[WebSocket] ${clientId} subscribed to transactions: ${msg.transactionIds.join(', ')}`
      );
    }

    // Send confirmation
    this.sendMessage(clientId, {
      type: 'subscribe',
      datasetIds: Array.from(session.subscribed.datasetIds),
      transactionIds: Array.from(session.subscribed.transactionIds),
    });
  }

  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe(clientId: string, msg: UnsubscribeMessage): void {
    const session = this.clients.get(clientId);
    if (!session) return;

    // Unsubscribe from datasets
    if (msg.datasetIds) {
      msg.datasetIds.forEach((id) => {
        session.subscribed.datasetIds.delete(id);
      });
    }

    // Unsubscribe from transactions
    if (msg.transactionIds) {
      msg.transactionIds.forEach((id) => {
        session.subscribed.transactionIds.delete(id);
      });
    }

    console.log(`[WebSocket] ${clientId} unsubscribed`);
  }

  /**
   * Attach listeners to transaction events
   */
  private attachEventListeners(): void {
    transactionEventEmitter.on('transaction:update', (event) => {
      this.broadcastToSubscribers(event, (session, evt) => {
        const dataEvent = evt as any;
        return session.subscribed.datasetIds.has(dataEvent.data.datasetId) ||
          session.subscribed.transactionIds.has(dataEvent.data.transactionId);
      });
    });

    transactionEventEmitter.on('payment:received', (event) => {
      this.broadcastToSubscribers(event, (session, evt) => {
        const dataEvent = evt as any;
        return session.subscribed.datasetIds.has(dataEvent.data.datasetId) ||
          session.subscribed.transactionIds.has(dataEvent.data.transactionId);
      });
    });

    transactionEventEmitter.on('payment:forwarded', (event) => {
      this.broadcastToSubscribers(event, (session, evt) => {
        const dataEvent = evt as any;
        return session.subscribed.datasetIds.has(dataEvent.data.datasetId) ||
          session.subscribed.transactionIds.has(dataEvent.data.transactionId);
      });
    });

    transactionEventEmitter.on('dataset:queried', (event) => {
      this.broadcastToSubscribers(event, (session, evt) => {
        const dataEvent = evt as any;
        return session.subscribed.datasetIds.has(dataEvent.data.datasetId) ||
          session.subscribed.transactionIds.has(dataEvent.data.transactionId);
      });
    });
  }

  /**
   * Broadcast event to subscribers
   */
  private broadcastToSubscribers(
    event: ServerEvent,
    shouldSend: (session: ClientSession, event: ServerEvent) => boolean
  ): void {
    this.clients.forEach((session) => {
      if (shouldSend(session, event)) {
        this.sendServerEvent(session.ws, event);
      }
    });
  }

  /**
   * Send a server event to a client
   */
  private sendServerEvent(ws: WebSocket, event: ServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendMessage(clientId: string, message: any): void {
    const session = this.clients.get(clientId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send a pong message
   */
  private sendPong(clientId: string): void {
    const pong: PongMessage = { type: 'pong' };
    this.sendMessage(clientId, pong);
  }

  /**
   * Send an error message
   */
  private sendError(clientId: string, message: string, code?: string): void {
    const error: ErrorMessage = {
      type: 'error',
      message,
      code,
    };
    this.sendMessage(clientId, error);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((session, clientId) => {
        if (!session.isAlive) {
          console.log(`[WebSocket] Terminating dead connection: ${clientId}`);
          session.ws.terminate();
          return;
        }
        session.isAlive = false;
        session.ws.ping();
      });
    }, 30000); // 30 second heartbeat
  }

  /**
   * Shutdown the WebSocket server
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((session) => {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close(1000, 'Server shutting down');
      }
    });

    this.wss.close(() => {
      console.log('[WebSocket] Server shutdown complete');
    });
  }

  /**
   * Get number of connected clients
   */
  public getConnectedClients(): number {
    return this.clients.size;
  }

  /**
   * Get server statistics
   */
  public getStats() {
    return {
      connectedClients: this.clients.size,
      subscriptions: Array.from(this.clients.entries()).map(([clientId, session]) => ({
        clientId,
        datasetIds: Array.from(session.subscribed.datasetIds),
        transactionIds: Array.from(session.subscribed.transactionIds),
      })),
    };
  }
}

// Export singleton instance holder
let wsServer: WebSocketServer_Hazina | null = null;

export function initializeWebSocketServer(
  httpServer: HTTPServer,
  apiKey?: string
): WebSocketServer_Hazina {
  wsServer = new WebSocketServer_Hazina(httpServer, apiKey);
  return wsServer;
}

export function getWebSocketServer(): WebSocketServer_Hazina | null {
  return wsServer;
}
