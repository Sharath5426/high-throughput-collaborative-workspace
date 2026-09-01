import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export function handleIdempotency() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only enforce idempotency on mutation requests (POST, PUT, PATCH, DELETE)
    if (req.method === 'GET') {
      return next();
    }

    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      req.body?.idempotencyKey ||
      (req.query?.idempotencyKey as string);

    if (!idempotencyKey) {
      return next();
    }

    try {
      // Check if key already processed in PostgreSQL
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        const savedRes = existing.response as { status: number; body: any };
        console.log(`⚡ Idempotency cache hit for key [${idempotencyKey}]. Returning cached response.`);
        res.status(savedRes.status).json(savedRes.body);
        return;
      }

      // Capture response json to save for future duplicate requests
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // Save to DB asynchronously if HTTP status is 2xx/3xx
        if (res.statusCode >= 200 && res.statusCode < 400) {
          prisma.idempotencyKey
            .create({
              data: {
                key: idempotencyKey,
                response: { status: res.statusCode, body },
              },
            })
            .catch((err) => console.error('Failed to save idempotency key:', err));
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
