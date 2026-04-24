import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  WebhookEvent,
  addWebhook,
  getWebhookById,
  getWebhooksForSeller,
  removeWebhook,
  updateWebhook,
} from '../common/storage';
import { notifySeller } from './webhook.service';

export const webhooksRouter = Router();

const VALID_EVENTS: WebhookEvent[] = [
  'payment.received',
  'payment.forwarded',
  'dataset.queried',
  'dataset.created',
  'ping',
];

// POST /api/webhooks — register a new webhook
webhooksRouter.post('/', (req: Request, res: Response) => {
  const { sellerWallet, url, secret, events } = req.body;

  if (!sellerWallet || typeof sellerWallet !== 'string') {
    return res.status(400).json({ error: 'sellerWallet is required' });
  }
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'secret is required' });
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'URL must use http or https' });
  }

  // Validate events
  let webhookEvents: WebhookEvent[] = [];
  if (events) {
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'events must be an array' });
    }
    const invalid = events.filter((e: string) => !VALID_EVENTS.includes(e as WebhookEvent));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}` });
    }
    webhookEvents = events as WebhookEvent[];
  }

  const webhook = {
    id: `wh-${uuidv4()}`,
    sellerWallet,
    url,
    secret,
    events: webhookEvents,
    active: true,
    createdAt: new Date().toISOString(),
  };

  addWebhook(webhook);

  return res.status(201).json({
    success: true,
    webhook: {
      id: webhook.id,
      sellerWallet: webhook.sellerWallet,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
    },
  });
});

// GET /api/webhooks/:sellerWallet — list webhooks for a seller
webhooksRouter.get('/:sellerWallet', (req: Request, res: Response) => {
  const webhooks = getWebhooksForSeller(req.params.sellerWallet);
  return res.json({
    success: true,
    webhooks: webhooks.map(({ secret: _secret, ...rest }) => rest),
  });
});

// DELETE /api/webhooks/:id — remove a webhook
webhooksRouter.delete('/:id', (req: Request, res: Response) => {
  const webhook = getWebhookById(req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  removeWebhook(req.params.id);
  return res.json({ success: true, message: 'Webhook deleted' });
});

// POST /api/webhooks/:id/test — send a test ping event
webhooksRouter.post('/:id/test', async (req: Request, res: Response) => {
  const webhook = getWebhookById(req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  if (!webhook.active) {
    return res.status(400).json({ error: 'Webhook is inactive' });
  }

  try {
    await notifySeller(webhook.sellerWallet, 'ping', {
      message: 'Test ping from Hazina Escrow',
      webhookId: webhook.id,
    });
    return res.json({ success: true, message: 'Test ping dispatched' });
  } catch {
    return res.status(500).json({ error: 'Failed to dispatch test ping' });
  }
});

// PATCH /api/webhooks/:id — update webhook (url, secret, events, active)
webhooksRouter.patch('/:id', (req: Request, res: Response) => {
  const webhook = getWebhookById(req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  const { url, secret, events, active } = req.body;
  const updates: Partial<typeof webhook> = {};

  if (url !== undefined) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'URL must use http or https' });
      }
      updates.url = url;
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
  }

  if (secret !== undefined) {
    if (typeof secret !== 'string' || secret.length === 0) {
      return res.status(400).json({ error: 'secret must be a non-empty string' });
    }
    updates.secret = secret;
  }

  if (events !== undefined) {
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'events must be an array' });
    }
    const invalid = events.filter((e: string) => !VALID_EVENTS.includes(e as WebhookEvent));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}` });
    }
    updates.events = events as WebhookEvent[];
  }

  if (active !== undefined) {
    updates.active = Boolean(active);
  }

  const updated = updateWebhook(req.params.id, updates);
  if (!updated) {
    return res.status(500).json({ error: 'Failed to update webhook' });
  }

  const { secret: _secret, ...rest } = updated;
  return res.json({ success: true, webhook: rest });
});

