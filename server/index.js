import { openDb, makeRepo } from './src/db.js';
import { createApp } from './src/app.js';

const port = Number(process.env.PORT) || 8080;
const repo = makeRepo(openDb());
const app = createApp(repo);

app.listen(port, () => {
  console.log(`Top End Survivor running on http://localhost:${port}`);
  console.log(`  Game:  http://localhost:${port}/`);
  console.log(`  Booth: http://localhost:${port}/booth`);
  if (!process.env.ADMIN_TOKEN) console.log('  (admin endpoints disabled - set ADMIN_TOKEN to enable)');
});
