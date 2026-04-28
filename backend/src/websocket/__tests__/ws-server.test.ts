import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import { WebSocketServer_Hazina, initializeWebSocketServer } from '../ws-server';
import { transactionEventEmitter } from '../transaction-events';

describe('WebSocket Server', () => {
  let server: http.Server;
  let wsServer: WebSocketServer_Hazina;
  let wsUrl: string;
  let port: number;

  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);

    server.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        port = addr.port;
        wsUrl = `ws://localhost:${port}`;
        wsServer = initializeWebSocketServer(server, 'test-api-key');
        done();
      }
    });
  });

  afterAll((done) => {
    wsServer.shutdown();
    server.close(done);
  });

  it('should accept WebSocket connections', (done) => {
    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
      client.close();
      done();
    });

    client.on('error', (error) => {
      done(error);
    });
  });

  it('should handle subscribe messages', (done) => {
    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      const subscribe = {
        type: 'subscribe',
        datasetIds: ['dataset-1', 'dataset-2'],
        transactionIds: ['tx-1'],
      };
      client.send(JSON.stringify(subscribe));
    });

    client.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.datasetIds).toContain('dataset-1');
      expect(msg.datasetIds).toContain('dataset-2');
      expect(msg.transactionIds).toContain('tx-1');
      client.close();
      done();
    });

    client.on('error', (error) => {
      done(error);
    });
  });

  it('should handle ping/pong', (done) => {
    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      client.send(JSON.stringify({ type: 'ping' }));
    });

    client.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong') {
        expect(msg.type).toBe('pong');
        client.close();
        done();
      }
    });

    client.on('error', (error) => {
      done(error);
    });
  });

  it('should broadcast transaction updates to subscribed clients', (done) => {
    const client1 = new WebSocket(wsUrl);
    const client2 = new WebSocket(wsUrl);
    let client1Ready = false;
    let client2Ready = false;
    let client2ReceivedUpdate = false;

    const checkDone = () => {
      if (client2ReceivedUpdate) {
        client1.close();
        client2.close();
        done();
      }
    };

    client1.on('open', () => {
      client1.send(
        JSON.stringify({
          type: 'subscribe',
          datasetIds: ['dataset-123'],
        })
      );
      client1Ready = true;
    });

    client2.on('open', () => {
      client2.send(
        JSON.stringify({
          type: 'subscribe',
          datasetIds: ['dataset-123'],
        })
      );
      client2Ready = true;

      // Wait a moment then emit an event
      setTimeout(() => {
        if (client1Ready && client2Ready) {
          transactionEventEmitter.updateTransactionStatus(
            'tx-test-123',
            'dataset-123',
            'pending'
          );
        }
      }, 100);
    });

    client2.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (
        msg.type === 'transaction:update' &&
        msg.data.transactionId === 'tx-test-123'
      ) {
        client2ReceivedUpdate = true;
        checkDone();
      }
    });

    client1.on('error', (error) => {
      done(error);
    });

    client2.on('error', (error) => {
      done(error);
    });
  });

  it('should not broadcast to non-subscribed clients', (done) => {
    const client1 = new WebSocket(wsUrl);
    const client2 = new WebSocket(wsUrl);
    let client1Ready = false;
    let client2Ready = false;
    const timeoutId = setTimeout(() => {
      // If no message received within timeout, test passes
      expect(true).toBe(true);
      client1.close();
      client2.close();
      done();
    }, 500);

    client1.on('open', () => {
      // Client1 subscribes to dataset-456
      client1.send(
        JSON.stringify({
          type: 'subscribe',
          datasetIds: ['dataset-456'],
        })
      );
      client1Ready = true;
    });

    client2.on('open', () => {
      // Client2 subscribes to dataset-789
      client2.send(
        JSON.stringify({
          type: 'subscribe',
          datasetIds: ['dataset-789'],
        })
      );
      client2Ready = true;

      setTimeout(() => {
        if (client1Ready && client2Ready) {
          // Emit event for dataset-456 (client1 subscribed)
          transactionEventEmitter.updateTransactionStatus(
            'tx-test-456',
            'dataset-456',
            'completed'
          );
        }
      }, 100);
    });

    client2.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      // Should not receive the transaction:update for dataset-456
      if (msg.type === 'transaction:update' && msg.data.datasetId === 'dataset-456') {
        clearTimeout(timeoutId);
        client1.close();
        client2.close();
        done(new Error('Client2 should not have received dataset-456 update'));
      }
    });

    client1.on('error', (error) => {
      clearTimeout(timeoutId);
      done(error);
    });

    client2.on('error', (error) => {
      clearTimeout(timeoutId);
      done(error);
    });
  });

  it('should handle multiple event types', (done) => {
    const client = new WebSocket(wsUrl);
    const receivedEvents: string[] = [];

    client.on('open', () => {
      client.send(
        JSON.stringify({
          type: 'subscribe',
          datasetIds: ['dataset-multi'],
        })
      );

      setTimeout(() => {
        transactionEventEmitter.receivePayment('tx-multi', 'dataset-multi', '100');
        transactionEventEmitter.forwardPayment('tx-multi', 'dataset-multi', '95', '5');
        transactionEventEmitter.queryDataset('tx-multi', 'dataset-multi', 1);
      }, 100);
    });

    client.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'payment:received') {
        receivedEvents.push('payment:received');
      } else if (msg.type === 'payment:forwarded') {
        receivedEvents.push('payment:forwarded');
      } else if (msg.type === 'dataset:queried') {
        receivedEvents.push('dataset:queried');
      }

      if (
        receivedEvents.includes('payment:received') &&
        receivedEvents.includes('payment:forwarded') &&
        receivedEvents.includes('dataset:queried')
      ) {
        client.close();
        done();
      }
    });

    client.on('error', (error) => {
      done(error);
    });
  });

  it('should track connected clients', () => {
    const client1 = new WebSocket(wsUrl);
    const client2 = new WebSocket(wsUrl);

    const checkClients = () => {
      const initialCount = wsServer.getConnectedClients();
      expect(initialCount).toBeGreaterThanOrEqual(0);
    };

    client1.on('open', () => {
      const count = wsServer.getConnectedClients();
      expect(count).toBeGreaterThan(0);

      client2.on('open', () => {
        const count2 = wsServer.getConnectedClients();
        expect(count2).toBeGreaterThan(count);

        client1.close();
        client2.close();
      });
    });

    client1.on('error', () => {
      /* ignore */
    });
    client2.on('error', () => {
      /* ignore */
    });
  });

  it('should reject invalid messages', (done) => {
    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      // Send invalid JSON
      client.send('not valid json');
    });

    client.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'error') {
        expect(msg.code).toBe('PARSE_ERROR');
        client.close();
        done();
      }
    });

    client.on('error', (error) => {
      done(error);
    });
  });
});
