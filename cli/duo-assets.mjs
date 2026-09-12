import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function prepareDuoAssets(args){
  if(args.length&&!(args.length===2&&args[0]==='--python'))throw new Error('Usage: openvid duo prepare-assets [--python /path/to/python]');
  const python=args[1]??'python3';
  const check=spawnSync(python,['-c','from pxr import Usd'],{encoding:'utf8'});
  if(check.status!==0)throw new Error('Python usd-core is required. Create a virtual environment, install usd-core==26.8, and pass its Python with --python. See skills/openvid-docs/references/duo.md.');
  const prep=spawnSync(python,[resolve(root,'cli/duo-assets/prepare.py'),resolve(root,'public/models/duo')],{stdio:'inherit'});
  if(prep.status!==0)throw new Error('Duo USD preparation failed');
  const token=randomBytes(24).toString('hex');
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='POST'&&url.pathname==='/complete'){
        if(url.searchParams.get('token')!==token){res.writeHead(403).end('Invalid setup token');return;}
        const chunks=[];let length=0;
        for await(const chunk of req){length+=chunk.length;if(length>50_000_000)throw new Error('Model exceeds 50 MB');chunks.push(chunk);}
        const data=Buffer.concat(chunks);
        if(data.subarray(0,4).toString()!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw new Error('Invalid GLB');
        const output=resolve(root,'public/models/iphone-duo.glb');await writeFile(output+'.tmp',data);await rename(output+'.tmp',output);
        res.end('Ready');console.log(`Prepared ${output} (${data.length} bytes). Reload the editor.`);server.close();return;
      }
      if(req.method!=='GET'){res.writeHead(405).end();return;}
      let base,path;
      if(url.pathname==='/'){base=resolve(root,'cli/duo-assets');path=resolve(base,'convert.html');}
      else if(url.pathname.startsWith('/vendor/')){base=resolve(root,'cli/duo-assets/vendor');path=resolve(base,decodeURIComponent(url.pathname.slice(8)));}
      else if(url.pathname.startsWith('/three/')){base=resolve(root,'node_modules/three');path=resolve(base,decodeURIComponent(url.pathname.slice(7)));}
      else if(url.pathname.startsWith('/assets/')){base=resolve(root,'public/models/duo');path=resolve(base,decodeURIComponent(url.pathname.slice(8)));}
      else{res.writeHead(404).end();return;}
      if(!path.startsWith(base+'/')){res.writeHead(403).end();return;}
      const data=await readFile(path);const mime={'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif'}[extname(path)]??'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'}).end(data);
    }catch(error){res.writeHead(500).end(error.message);}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  console.log(`Open http://127.0.0.1:${server.address().port}/?token=${token}\nKeep this process open until the browser finishes conversion. Apple assets stay local and are not covered by the code license.`);
  await new Promise(resolve=>server.on('close',resolve));
}
