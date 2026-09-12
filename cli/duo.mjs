import { readFile } from 'node:fs/promises';
import { defaultDuoConfig, parseDuoConfig, sampleDuoAngle } from '../lib/duo-config.ts';

/** File operations use the same schema and sampler as the editor and exporter. */
export async function duoCommand(args) {
  if(args[0]==='prepare-assets'){await (await import('./duo-assets.mjs')).prepareDuoAssets(args.slice(1));return;}
  const [action, file, time, ...extra] = args;
  if (action === 'defaults' && !file) { console.log(JSON.stringify(defaultDuoConfig(), null, 2)); return; }
  if (!['validate','sample'].includes(action) || !file || extra.length || (action === 'validate' && time !== undefined)) throw new Error('Usage: openvid duo defaults | validate <config.json> | sample <config.json> <seconds>');
  const config = parseDuoConfig(JSON.parse(await readFile(file,'utf8')));
  if (action === 'validate') { console.log(JSON.stringify({ valid:true, keyframes:config.keyframes.length, config })); return; }
  const seconds=Number(time);
  if(time===undefined||!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a non-negative time in seconds');
  console.log(JSON.stringify({time:seconds,angle:sampleDuoAngle(config,seconds)}));
}
