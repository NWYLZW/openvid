import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,realpath,readdir,lstat,access} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';import {tmpdir} from 'node:os';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {installSkills,skillNames} from '../cli/install-skills.mjs';import {packageSkills} from '../cli/package-skills.mjs';
import {locateProject} from '../skills/openvid-docs/scripts/openvid.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(path){const out=[];for(const item of await readdir(path,{withFileTypes:true})){const p=join(path,item.name);if(item.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
test('repository links resolve to the single canonical source',async()=>{
 for(const name of skillNames){const path=join(root,'.agents/skills',name);assert.ok((await lstat(path)).isSymbolicLink());assert.equal(await realpath(path),await realpath(join(root,'skills',name)));}
});
test('isolated package and installed skills retain dependencies and can run the real project CLI',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'openvid-distribution-'));
 try{
  const bundle=await packageSkills(root,join(temp,'distribution'));const dest=join(temp,'installed');
  await installSkills(join(bundle.plugin,'skills'),dest);
  assert.deepEqual((await readdir(dest)).sort(),[...skillNames].sort());
  for(const file of await walk(dest)){
   assert.ok(!(await lstat(file)).isSymbolicLink());
   if(!file.endsWith('.md'))continue;
   const content=await readFile(file,'utf8');
   for(const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const link=match[1];if(/^(https?:|#|<)/.test(link))continue;
    const target=resolve(dirname(file),link.split('#')[0]);assert.ok(target.startsWith(dest+'/'),`${file} escapes installation: ${link}`);await access(target);
   }
  }
  const bridge=join(dest,'openvid-docs/scripts/openvid.mjs');const env={...process.env};delete env.OPENVID_PROJECT;
  const located=spawnSync(process.execPath,[bridge,'--project',root,'locate'],{cwd:temp,env,encoding:'utf8'});assert.equal(located.status,0,located.stderr);assert.equal(JSON.parse(located.stdout).projectRoot,await realpath(root));
  const help=spawnSync(process.execPath,[bridge,'--project',root,'help'],{cwd:temp,env,encoding:'utf8'});assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/Openvid local CLI/);
  const absent=spawnSync(process.execPath,[bridge,'locate'],{cwd:temp,env,encoding:'utf8'});assert.equal(absent.status,1);assert.match(absent.stderr,/project not found/);
  const before=await readFile(join(dest,'openvid/SKILL.md'),'utf8');await assert.rejects(installSkills(join(root,'skills'),dest),/Destination exists/);assert.equal(await readFile(join(dest,'openvid/SKILL.md'),'utf8'),before);
  await assert.rejects(packageSkills(root,join(temp,'distribution')),/Output exists/);
  const catalog=JSON.parse(await readFile(join(bundle.root,'.agents/plugins/marketplace.json'),'utf8'));assert.equal(await realpath(resolve(bundle.root,catalog.plugins[0].source.path)),await realpath(bundle.plugin));
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('explicit project selection fails closed and ancestor discovery remains read-only',()=>{
 assert.throws(()=>locateProject({project:'missing',env:{},cwd:root}),/Not an Openvid/);
 assert.equal(locateProject({env:{},cwd:join(root,'cli')}),root.replace(/\/$/,''));
 assert.equal(locateProject({env:{OPENVID_PROJECT:root},cwd:tmpdir()}),root.replace(/\/$/,''));
});
