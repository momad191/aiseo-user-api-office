import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(
    `🚀 Server listening on http://localhost:${PORT} (env=${process.env.NODE_ENV || 'development'})`
  );
});