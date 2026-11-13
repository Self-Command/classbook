import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 20000;

export function createRateLimit(options: {
  windowMs: number;
  max: number;
}): (req: Request, res: Response, next: NextFunction) => void {
  const buckets = new Map<string, Bucket>();
  const max = options.max * Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1);

  return function rateLimit(req, res, next) {
    const userId = req.user?.id ?? req.ip ?? 'anonymous';
    const windowIndex = Math.floor(Date.now() / options.windowMs);
    const key = `${userId}:${windowIndex}`;

    const bucket = buckets.get(key) ?? { count: 0, resetAt: (windowIndex + 1) * options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > MAX_BUCKETS) {
      const now = Date.now();
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt < now) buckets.delete(bucketKey);
      }
    }

    if (bucket.count > max) {
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: '操作太频繁，请稍后再试',
      });
      return;
    }

    next();
  };
}
