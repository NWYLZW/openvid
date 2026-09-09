#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const command = args.shift() ?? 'help';
let port = 3088;
if (args[0] === '--port' && /^\d+$/.test(args[1] ?? '')) {
  port = Number(args[1]);
  args.splice(0, 2);
}
if (args.length || port < 1 || port > 65535 || !['help', '--help', 'status', 'start'].includes(command)) {
  console.error('Usage: pnpm openvid <help|status|start> [--port 3088]');
  process.exit(2);
}
const url = `http://localhost:${port}/en/editor`;
async function status() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'manual' });
    const body = await response.text();
    return { url, ready: response.ok && body.includes('editor-root') && body.includes('Openvid'), httpStatus: response.status };
  } catch {
    return { url, ready: false, httpStatus: null };
  }
}
if (command === 'help' || command === '--help') {
  console.log(`Openvid local CLI\n\npnpm openvid status [--port 3088]  Check the editor (JSON; exit 1 if unavailable).\npnpm openvid start  [--port 3088]  Run the production build in the foreground.\n\nFirst setup: pnpm install --frozen-lockfile; cp .env.example .env.local; pnpm build\nStop a service started here with Ctrl+C. Existing services are left running.\nRecording, editing, and export currently use the browser; no CLI commands yet.`);
} else if (command === 'status') {
  const result = await status();
  console.log(JSON.stringify(result));
  process.exitCode = result.ready ? 0 : 1;
} else {
  const current = await status();
  if (current.ready) {
    console.log(`Openvid is already available: ${url}`);
  } else if (current.httpStatus !== null) {
    console.error(`Port ${port} responds but is not a ready Openvid editor. Choose another --port.`);
    process.exitCode = 1;
  } else if (!existsSync(resolve(root, '.next/BUILD_ID'))) {
    console.error('No production build. Configure .env.local and run pnpm build first.');
    process.exitCode = 1;
  } else {
    console.log(`Starting ${url}\nKeep this terminal open; Ctrl+C stops this process.`);
    const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: 'inherit' });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
  }
}
