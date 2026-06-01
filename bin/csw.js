#!/usr/bin/env node
import { main } from '../src/cli.js';

main(process.argv.slice(2)).catch((err) => {
  if (err && err.name === 'ExitPromptError') {
    process.exit(0);
  }
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
