import express, { Express, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import { LRUCache } from "./utils/LRUCache";
import { mockUsers } from "./data/mockUsers";

import { rateLimiter } from "./middleware/rateLimiter";
import { getUser } from "./controllers/userController";

// Create cache: 100 entries max, TTL 60s
export const userCache = new LRUCache<string, any>(100, 60);

export const testCache = new LRUCache<string, string>(10, 5); // TTL = 5s

const pendingFetches: Map<number, Promise<any>> = new Map();

// Simulate DB call with delay
async function fetchUserFromDB(id: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[id];
      if (!user) return reject(new Error("User not found"));
      resolve(user);
    }, 200); // 200ms artificial delay
  });
}

export function createApp(): Express {
  const app = express();

  // security headers
  app.use(helmet());

  // CORS - in prod tighten this up to allowed origins
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // body parsing
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  //  request logger
  app.use((req: Request, _res: Response, next) => {
    console.log(
      `${new Date().toISOString()} — ${req.method} ${req.originalUrl}`
    );
    next();
  });

  // Apply globally
  //test ratelimiter
  //Test burst capacity (5 requests / 10s)
  //for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/users/1; done
  //Test per-minute quota (10 requests/min)
  //for i in {1..11}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/users/2; done
  app.use(rateLimiter);

  // health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/cache-status", (_req, res) => {
    res.json(userCache.stats());
  });

  app.delete("/cache", (_req, res) => {
    userCache.clear();
    res.json({ message: "Cache cleared" });
  });

  app.get("/test-cache", (_req, res) => {
    const value = testCache.get("hello");
    if (!value) {
      testCache.set("hello", "world");
      return res.json({ message: "Inserted fresh value" });
    }
    return res.json({ value });
  });

  //**************************************************************************** */
  //**************************************************************************** */
  //**************************************************************************** */
  //**************************************************************************** */
  //**************************************************************************** */
  //   Cache-first lookup
  //  200ms DB simulation
  //  Proper 404 errors
  // implemtn users api with cache strategy LRU
  // If the data is available in the cache, return it immediately.
  // ● If not, simulate a database call by returning a mock user object after a delay of 200ms.
  //  The mock user object should contain at least id, name, and email.
  //  ● If the requested user ID does not exist, return a 404 status code with error message.

  // GET /users/:id

  // app.get('/users/:id', async (req: Request, res: Response) => {
  //   const userId = parseInt(req.params.id, 10);

  //   if (isNaN(userId)) {
  //     return res.status(400).json({ error: 'Invalid user ID format' });
  //   }

  //   // 1. Try cache
  //   const cached = userCache.get(userId.toString());
  //   if (cached) {
  //     return res.json({ fromCache: true, user: cached });
  //   }

  //   // 2. Simulate DB fetch
  //   try {
  //     const user = await fetchUserFromDB(userId);
  //     userCache.set(userId.toString(), user); // store in cache
  //     return res.json({ fromCache: false, user });
  //   } catch (err: any) {
  //     return res.status(404).json({ error: err.message || 'User not found' });
  //   }
  // });

  //   ********************************************************************************************************
  //   ********************************************************************************************************
  //   ********************************************************************************************************
  //   ********************************************************************************************************
  //   ********************************************************************************************************
  //   ********************************************************************************************************

  //   First request for /users/1 → triggers DB fetch (200ms delay).
  // Concurrent requests (while DB call is running) → wait on the same promise, then return cached result instantly.
  // Subsequent requests → hit cache directly, instant.
  // Cache updates only when key is not already cached.

  app.get("/users/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // 1. Try cache first
    const cached = userCache.get(userId.toString());
    if (cached) {
      return res.json({ fromCache: true, user: cached });
    }

    // 2. Check if a fetch is already in progress for this user
    if (pendingFetches.has(userId)) {
      try {
        const user = await pendingFetches.get(userId);
        return res.json({ fromCache: true, user });
      } catch (err: any) {
        return res.status(404).json({ error: err.message || "User not found" });
      }
    }

    // 3. Start a new fetch
    const fetchPromise = (async () => {
      const user = await fetchUserFromDB(userId); // 200ms simulated DB
      // ✅ Update cache only if still not cached
      if (!userCache.get(userId.toString())) {
        userCache.set(userId.toString(), user);
      }
      return user;
    })();

    pendingFetches.set(userId, fetchPromise);

    try {
      const user = await fetchPromise;
      return res.json({ fromCache: false, user });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "User not found" });
    } finally {
      // cleanup pending promise
      pendingFetches.delete(userId);
    }
  });

  app.get("/users/:id", rateLimiter, getUser);

  return app;
}
