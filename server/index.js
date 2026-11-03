import { openDb, makeRepo } from './src/db.js';
import { createApp } from './src/app.js';

const port = Number(process.env.PORT) || 8080;
const repo = makeRepo(openDb());
const app = createApp(repo, { cacheMs: Number(process.env.STATS_CACHE_MS ?? 3000) });

// Safety net: log a stray async error instead of letting it stop the server for everyone.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

app.listen(port, () => {
  console.log(`Top End Survivor running on http://localhost:${port}`);
  console.log(`  Game:  http://localhost:${port}/`);
  console.log(`  Booth: http://localhost:${port}/booth`);
  console.log(`  Admin: http://localhost:${port}/admin`);
  if (!process.env.ADMIN_TOKEN) console.log('  (admin endpoints disabled - set ADMIN_TOKEN to enable)');
});
