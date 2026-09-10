#!/usr/bin/env node
import {cp,mkdir,access,rename,rm,mkdtemp} from 'node:fs/promises';
import {realpathSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
export const skillNames=['openvid','openvid-docs','openvid-create'];
export async function installSkills(source,dest) {
  for(const name of skillNames){await access(join(source,name,'SKILL.md'));try{await access(join(dest,name));throw new Error(`Destination exists: ${join(dest,name)}. Use a new destination; existing skills are never overwritten.`);}catch(e){if(e.code!=='ENOENT')throw e;}}
  await mkdir(dest,{recursive:true});const staging=await mkdtemp(join(dest,'.openvid-install-'));const installed=[];
  try{for(const name of skillNames)await cp(join(source,name),join(staging,name),{recursive:true,dereference:true});for(const name of skillNames){await rename(join(staging,name),join(dest,name));installed.push(join(dest,name));}}catch(e){for(const path of installed)await rm(path,{recursive:true,force:true});throw e;}finally{await rm(staging,{recursive:true,force:true});}
  return installed;
}
async function main(){const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--dest'))throw new Error('Usage: node cli/install-skills.mjs [--dest DIRECTORY]');const dest=resolve(args[1]??join(homedir(),'.agents','skills'));const source=fileURLToPath(new URL('../skills/',import.meta.url));console.log(JSON.stringify({installed:await installSkills(source,dest)}));}
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
