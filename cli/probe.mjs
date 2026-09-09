import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export async function probeDuration(file) {
  const { stdout } = await exec('ffprobe', ['-v','error','-show_entries','format=duration','-of','json',file], { encoding: 'utf8' });
  const duration = Number(JSON.parse(stdout).format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Cannot determine source duration: ${file}`);
  return duration;
}
