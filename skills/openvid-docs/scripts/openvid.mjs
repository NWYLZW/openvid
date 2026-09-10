#!/usr/bin/env node
import {readFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function isOpenvidRoot(path) {
  try {const pkg=JSON.parse(readFileSync(join(path,'package.json'),'utf8'));return pkg.name==='openvid'&&existsSync(join(path,'cli/openvid.mjs'))&&existsSync(join(path,'lib/local-edit.ts'));}catch{return false;}
}
export function locateProject({project,env=process.env,cwd=process.cwd()}={}) {
  const explicit=project??env.OPENVID_PROJECT;
  if(explicit) {const root=resolve(cwd,explicit);if(!isOpenvidRoot(root))throw new Error(`Not an Openvid checkout: ${root}`);return realpathSync(root);}
  let candidate=resolve(cwd);
  while(true){if(isOpenvidRoot(candidate))return realpathSync(candidate);const parent=dirname(candidate);if(parent===candidate)break;candidate=parent;}
  throw new Error('Openvid project not found. Pass --project /path/to/openvid or set OPENVID_PROJECT. Installing skills does not install the editor.');
}
export function main(args=process.argv.slice(2)) {
  let project;
  if(args[0]==='--project'){if(!args[1])throw new Error('--project needs a directory');project=args[1];args=args.slice(2);}
  const root=locateProject({project});
  if(args[0]==='locate'){if(args.length!==1)throw new Error('Usage: openvid.mjs [--project PATH] locate');console.log(JSON.stringify({projectRoot:root,cliPath:join(root,'cli/openvid.mjs')}));return 0;}
  const result=spawnSync(process.execPath,[join(root,'cli/openvid.mjs'),...(args.length?args:['help'])],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  return result.status??1;
}
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))try{process.exitCode=main();}catch(error){console.error(error.message);process.exitCode=1;}
