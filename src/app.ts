import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { LRUCache } from './utils/LRUCache';
import { mockUsers } from './data/mockUsers';

// Create cache: 100 entries max, TTL 60s
export const userCache = new LRUCache<string, any>(100, 60);

export const testCache = new LRUCache<string, string>(10, 5); // TTL = 5s



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
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }));

  // body parsing
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  //  request logger 
  app.use((req: Request, _res: Response, next) => {
    console.log(`${new Date().toISOString()} — ${req.method} ${req.originalUrl}`);
    next();
  });

  // health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });



  app.get('/cache-status', (_req, res) => {
    res.json(userCache.stats());
  });

  app.delete('/cache', (_req, res) => {
    userCache.clear();
    res.json({ message: 'Cache cleared' });
  });

  app.get('/test-cache', (_req, res) => {
    const value = testCache.get('hello');
    if (!value) {
      testCache.set('hello', 'world');
      return res.json({ message: 'Inserted fresh value' });
    }
    return res.json({ value });
  });




// GET /users/:id
app.get('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  // 1. Try cache
  const cached = userCache.get(userId.toString());
  if (cached) {
    return res.json({ fromCache: true, user: cached });
  }

  // 2. Simulate DB fetch
  try {
    const user = await fetchUserFromDB(userId);
    userCache.set(userId.toString(), user); // store in cache
    return res.json({ fromCache: false, user });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'User not found' });
  }
});




  return app;
}
