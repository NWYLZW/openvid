import { writeFile, rename } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';

/** Log actual Computer Use command coordinates against Openvid's recording clock.
 * Animation between command positions is illustrative, not measured OS motion.
 */
export function createPointerLog(startedAtMs, path) {
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) throw new Error('Recording start time required');
  writeFileSync(path, JSON.stringify({ version: 1, startedAtMs, events: [], marks: [] }), { flag: "wx" });
  const events = [], marks = [];
  const time = () => (Date.now() - startedAtMs) / 1000;
  const save = async () => {
    const temporary = `${path}.pending`;
    await writeFile(temporary, JSON.stringify({ version: 1, startedAtMs, events, marks }, null, 2));
    await rename(temporary, path);
  };
  return {
    events, marks,
    async click(app, x, y, width, height) {
      if (![x,y,width,height].every(Number.isFinite) || width <= 0 || height <= 0 || x < 0 || y < 0 || x > width || y > height) throw new Error('Invalid screenshot-relative coordinates');
      const began = time();
      await app.click([x,y]);
      const ended = time();
      events.push({ time: (began + ended) / 2, x: x / width * 100, y: y / height * 100, kind: 'click', screenshot: { width, height }, point: { x, y }, commandStarted: began, commandFinished: ended });
      await save();
    },
    async mark(label) { marks.push({ label, time: time() }); await save(); },
  };
}
