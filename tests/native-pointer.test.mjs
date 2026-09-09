import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pointerCommand } from '../cli/pointer.mjs';

test('pointer rendering refuses to overwrite an existing output', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-test-'));
  try {
    await writeFile(join(dir,'output.mp4'),'keep');
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.webm',output:'output.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'plan.json')),/Output exists/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('invalid coordinates fail before invoking the encoder', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-test-'));
  try {
    await writeFile(join(dir,'events.json'),JSON.stringify({events:[{time:1,x:101,y:50,kind:'click'}]}));
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.webm',output:'output.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'plan.json')),/Invalid pointer event/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
