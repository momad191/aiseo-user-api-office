import { Request, Response, NextFunction } from "express";

type ClientRecord = {
  tokens: number; // per-minute tokens
  burstTokens: number; // burst tokens
  lastRefill: number;
  lastBurstRefill: number;
};

const clients: Map<string, ClientRecord> = new Map();

// Limits
const MAX_REQUESTS_PER_MINUTE = 10;
const BURST_CAPACITY = 5;
const BURST_WINDOW_MS = 10_000; // 10 seconds
const REFILL_INTERVAL_MS = 60_000; // 1 minute

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  let record = clients.get(ip);

  if (!record) {
    record = {
      tokens: MAX_REQUESTS_PER_MINUTE,
      burstTokens: BURST_CAPACITY,
      lastRefill: now,
      lastBurstRefill: now,
    };
    clients.set(ip, record);
  }

  // Refill per-minute tokens
  if (now - record.lastRefill >= REFILL_INTERVAL_MS) {
    record.tokens = MAX_REQUESTS_PER_MINUTE;
    record.lastRefill = now;
  }

  // Refill burst tokens
  if (now - record.lastBurstRefill >= BURST_WINDOW_MS) {
    record.burstTokens = BURST_CAPACITY;
    record.lastBurstRefill = now;
  }

  // 🚨 Enforce burst window strictly
  if (record.burstTokens > 0) {
    record.burstTokens--;
    record.tokens--; // also decrement from per-minute pool
    return next();
  }

  // If burst exhausted → block immediately, regardless of per-minute tokens
  return res.status(429).json({
    error: "Too many requests. Please slow down.",
    limit: MAX_REQUESTS_PER_MINUTE,
    burstCapacity: BURST_CAPACITY,
    retryAfterSeconds: Math.ceil(REFILL_INTERVAL_MS / 1000),
  });
}
