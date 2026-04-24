import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRateLimitMiddleware } from '../rateLimit';

describe('rateLimitMiddleware', () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        // Use the factory to create a middleware with small limits for testing
        const testMiddleware = createRateLimitMiddleware({
            maxRequests: 3,
            windowMs: 60000 // 1 minute
        });

        app.use(testMiddleware);
        app.get('/test', (req, res) => {
            res.status(200).json({ success: true });
        });
    });

    it('should allow requests below the limit and set headers', async () => {
        const response = await request(app).get('/test');

        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-limit']).toBe('3');
        expect(response.headers['x-ratelimit-remaining']).toBe('2');
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrement remaining count on subsequent requests', async () => {
        await request(app).get('/test');
        const response = await request(app).get('/test');

        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-remaining']).toBe('1');
    });

    it('should block requests exceeding the limit', async () => {
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');

        const response = await request(app).get('/test');

        expect(response.status).toBe(429);
        expect(response.body.error).toBe('Too many requests');
        expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });
});
