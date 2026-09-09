import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Runs inside the computer-use REPL with its documented tab CDP capability. */
export async function startRecording(cdp, directory) {
  const dir = resolve(directory);
  await mkdir(dir, { recursive: true });
  // Refuse to mix two takes, even after an interrupted run.
  await writeFile(`${dir}/frames.jsonl`, '', { flag: 'wx' });
  const initial = await cdp.readEvents({ methods: ['Page.screencastFrame'] });
  let cursor = initial.cursor;
  const state = { frames: 0, firstTimestamp: null, lastTimestamp: null, error: null };
  const events = [];
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  async function capture(action) {
    let running = true;
    const pump = (async () => {
      while (running) {
        const batch = await cdp.readEvents({ afterSequence: cursor, methods: ['Page.screencastFrame'], limit: 100, timeoutMs: 250 });
        if (batch.truncated) throw new Error('Recording event buffer overflow; retake this segment.');
        cursor = batch.cursor;
        for (const event of batch.events) {
          const { data, metadata, sessionId } = event.params;
          const timestamp = metadata.timestamp;
          const file = `${String(state.frames).padStart(7, '0')}.jpg`;
          await writeFile(`${dir}/${file}`, Buffer.from(data, 'base64'));
          await appendFile(`${dir}/frames.jsonl`, `${JSON.stringify({ file, timestamp })}\n`);
          state.frames++;
          state.firstTimestamp ??= timestamp;
          state.lastTimestamp = timestamp;
          await cdp.send('Page.screencastFrameAck', { sessionId });
        }
      }
    })().catch(error => { state.error = error.message; running = false; });
    try { return await action(); }
    finally { running = false; await pump; }
  }
  return {
    state,
    capture,
    mark(label) { events.push({ label, timestamp: Date.now() / 1000 }); },
    async stop() {
      const stoppedAt = Date.now() / 1000;
      await cdp.send('Page.stopScreencast');
      const result = { ...state, stoppedAt, events };
      await writeFile(`${dir}/recording.json`, JSON.stringify(result, null, 2));
      if (state.error) throw new Error(state.error);
      if (!state.frames) throw new Error('No frames captured.');
      return result;
    },
  };
}
