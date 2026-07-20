import express from 'express';
import { router } from './api/routes.js';
import { initDb } from './db.js';

const app = express();
app.use(express.json());

initDb();

app.use(router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
