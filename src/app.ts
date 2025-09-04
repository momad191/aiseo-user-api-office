import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';

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

  // simple request logger (dev-friendly)
  app.use((req: Request, _res: Response, next) => {
    console.log(`${new Date().toISOString()} — ${req.method} ${req.originalUrl}`);
    next();
  });

  // health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // TODO: Mount /users, /cache routes in the next steps

  return app;
}
