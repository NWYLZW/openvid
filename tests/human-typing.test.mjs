import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {typeHumanly} from '../recipes/chrome-google-search/scripts/type-humanly.mjs';
test('successful typing records actual sequential events and refuses to overwrite a take',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'openvid-typing-'));const path=join(dir,'take.json');const typed=[];
 try{const result=await typeHumanly({pressSequentially:async c=>typed.push(c)},'ab',Date.now(),path);assert.deepEqual(typed,['a','b']);assert.equal(result.status,'complete');assert.equal(JSON.parse(await readFile(path)).events.length,2);await assert.rejects(typeHumanly({pressSequentially:async()=>{}},'x',Date.now(),path),/EEXIST/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('interrupted typing preserves completed characters instead of claiming success',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'openvid-typing-'));const path=join(dir,'take.json');
 try{await assert.rejects(typeHumanly({pressSequentially:async c=>{if(c==='b')throw new Error('input interrupted');}},'abc',Date.now(),path),/interrupted/);const log=JSON.parse(await readFile(path));assert.equal(log.status,'failed');assert.deepEqual(log.events.map(e=>e.character),['a']);assert.equal(log.completed,null);}finally{await rm(dir,{recursive:true,force:true});}
});
