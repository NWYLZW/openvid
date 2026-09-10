#!/usr/bin/env node
import {mkdir,cp,readFile,writeFile,access,rm} from 'node:fs/promises';import {realpathSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';
export async function packageSkills(root,out) {
  try{await access(out);throw new Error(`Output exists: ${out}`);}catch(e){if(e.code!=='ENOENT')throw e;}
  const plugin=join(out,'plugins','openvid');
  try {
    await mkdir(join(plugin,'.codex-plugin'),{recursive:true});
    for(const rel of ['skills','.codex-plugin','LICENSE.md','cli/install-skills.mjs'])await cp(join(root,rel),join(plugin,rel),{recursive:true,dereference:true});
    await cp(join(root,'docs/SKILLS.md'),join(out,'README.md'));
    await mkdir(join(out,'.agents/plugins'),{recursive:true});
    const marketplace={name:'openvid',interface:{displayName:'Openvid'},plugins:[{name:'openvid',source:{source:'local',path:'./plugins/openvid'},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity'}]};
    await writeFile(join(out,'.agents/plugins/marketplace.json'),JSON.stringify(marketplace,null,2)+'\n');
    const manifest=JSON.parse(await readFile(join(plugin,'.codex-plugin/plugin.json'),'utf8'));
    return {root:out,plugin,version:manifest.version};
  }catch(e){await rm(out,{recursive:true,force:true});throw e;}
}
async function main(){const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out'))throw new Error('Usage: node cli/package-skills.mjs [--out DIRECTORY]');console.log(JSON.stringify(await packageSkills(fileURLToPath(new URL('../',import.meta.url)),resolve(args[1]??'dist/openvid-skills'))));}
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
