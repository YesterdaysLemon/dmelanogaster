import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const build=JSON.parse(await readFile(resolve(root,'build.json'),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.wasm':'application/wasm','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.stl':'model/stl'};
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':JSON.stringify({ok:true,...build}));return;}
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
    const etag=`W/"${info.size}-${Math.trunc(info.mtimeMs)}"`;
    res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');res.setHeader('ETag',etag);
    if(req.headers['if-none-match']===etag){res.writeHead(304).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size});
    if(req.method==='HEAD'){res.end();return;}createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:400).end();}
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(`dmelanogaster ${build.sha} listening`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
