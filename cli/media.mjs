import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

function run(program, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${program} exited ${code}`)));
  });
}
const quote = path => `'${path.replaceAll("'", "'\\''")}'`;
const finite = value => typeof value === 'number' && Number.isFinite(value);
async function absent(path) {
  try { await access(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Output exists: ${path}. Choose a new output path.`);
}
const encodeArgs = ['-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

export async function mediaCommand(command, args) {
  if (command === 'record' && args[0] === 'encode' && args.length === 3) {
    const dir = resolve(args[1]);
    const output = resolve(args[2]);
    await absent(output);
    const meta = JSON.parse(await readFile(resolve(dir, 'recording.json'), 'utf8'));
    const frames = (await readFile(resolve(dir, 'frames.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    if (meta.error || !frames.length || frames.length !== meta.frames || !finite(meta.stoppedAt)) throw new Error('Incomplete or failed recording.');
    const lines = ['ffconcat version 1.0'];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const end = frames[i + 1]?.timestamp ?? meta.stoppedAt;
      if (!/^\d+\.jpg$/.test(frame.file) || !finite(frame.timestamp) || end < frame.timestamp) throw new Error('Invalid frame manifest.');
      lines.push(`file ${quote(resolve(dir, frame.file))}`, `duration ${Math.max(1 / 1000, end - frame.timestamp).toFixed(6)}`);
    }
    lines.push(`file ${quote(resolve(dir, frames.at(-1).file))}`);
    const manifest = resolve(dir, 'frames.ffconcat');
    await writeFile(manifest, lines.join('\n') + '\n');
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-safe', '0', '-f', 'concat', '-i', manifest, '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', ...encodeArgs, output]);
    console.log(JSON.stringify({ output, frames: frames.length, duration: meta.stoppedAt - frames[0].timestamp }));
    return;
  }
  if (command === 'media' && args[0] === 'inspect' && args.length === 2) {
    await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate:format=duration,size', '-of', 'json', resolve(args[1])]);
    return;
  }
  if (command === 'media' && args[0] === 'assemble' && args.length === 2) {
    const planPath = resolve(args[1]);
    const base = dirname(planPath);
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    if (!Array.isArray(plan.clips) || !plan.clips.length || typeof plan.output !== 'string') throw new Error('Plan requires output and clips.');
    const width = plan.width ?? 1440, height = plan.height ?? 900;
    if (![width, height].every(n => Number.isInteger(n) && n >= 2 && n <= 4096 && n % 2 === 0)) throw new Error('Dimensions must be positive even integers, <=4096.');
    const output = resolve(base, plan.output);
    await absent(output);
    const temp = await mkdtemp(resolve(tmpdir(), 'openvid-assemble-'));
    const timeline = [];
    let time = 0;
    try {
      for (const [index, clip] of plan.clips.entries()) {
        const speed = clip.speed ?? 1;
        const hold = clip.hold ?? 0;
        if (typeof clip.file !== 'string' || ![clip.start, clip.end, speed, hold].every(finite) || clip.start < 0 || clip.end <= clip.start || speed < 0.1 || speed > 16 || hold < 0 || hold > 60) throw new Error(`Invalid clip ${index}`);
        const part = resolve(temp, `${index}.mp4`);
        await run('ffmpeg', ['-hide_banner','-loglevel','error','-n','-ss',String(clip.start),'-t',String(clip.end-clip.start),'-i',resolve(base,clip.file),'-vf',`setpts=(PTS-STARTPTS)/${speed},fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop_duration=${hold}`, ...encodeArgs, part]);
        const duration = (clip.end - clip.start) / speed + hold;
        timeline.push({ ...clip, speed, outputStart: time, outputEnd: time + duration });
        time += duration;
      }
      const list = resolve(temp, 'list.txt');
      await writeFile(list, plan.clips.map((_,i) => `file ${quote(resolve(temp,`${i}.mp4`))}`).join('\n'));
      await run('ffmpeg',['-hide_banner','-loglevel','error','-n','-safe','0','-f','concat','-i',list,'-c','copy','-movflags','+faststart',output]);
      await writeFile(`${output}.timeline.json`, JSON.stringify({ output, estimatedDuration: time, timeline }, null, 2));
      console.log(JSON.stringify({ output, estimatedDuration: time }));
    } finally { await rm(temp, { recursive: true, force: true }); }
    return;
  }
  throw new Error('Usage: record encode <take-dir> <output.mp4> | media assemble <plan.json> | media inspect <file>');
}
