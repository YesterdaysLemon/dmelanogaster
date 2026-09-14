import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { XMLParser } from 'fast-xml-parser';

const source = resolve(process.argv[2] || 'work/FlyMimic');
const commit = execFileSync('git', ['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const original = path => execFileSync('git',['-C',source,'show',`${commit}:${path}`],{maxBuffer:16*1024*1024});
const root = resolve('public/model');
await mkdir(root+'/meshes/stl',{recursive:true});
const path = 'flymimic/assets/models/best_combined_arm_damping_stiff_cvt3.xml';
const xml = original(path).toString('utf8');
const doc = new XMLParser({ignoreAttributes:false,attributeNamePrefix:''}).parse(xml).mujoco;
const assets = [{source:path,target:'fly.xml'}];
for (const m of doc.asset.mesh) assets.push({source:'flymimic/assets/models/'+m.file.replace(/^\.\//,''),target:'meshes/stl/'+basename(m.file)});
const manifest=[];
for(const asset of assets){const data=original(asset.source);await writeFile(resolve(root,asset.target),data);manifest.push({...asset,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile(resolve(root,'LICENSE-FlyMimic.txt'),original('LICENSE'));
const list=x=>Array.isArray(x)?x:[x];
const muscles=doc.actuator.general.map((a,index)=>({index,id:a.name,label:a.name.replace(/^LF(C|F|Tibia)_/,'').replaceAll('_',' ').replace('accesory','accessory').replace('flex 93434','flexor').replace('extensor 93932','extensor'),region:a.name.startsWith('LFC')?'Coxa':a.name.startsWith('LFTibia')?'Tibia':'Trochanter',tendon:a.tendon,sites:list(doc.tendon.spatial.find(t=>t.name===a.tendon).site).map(s=>s.site),ctrlrange:a.ctrlrange.split(' ').map(Number),lengthrange:a.lengthrange.split(' ').map(Number),dynprm:a.dynprm.split(' ').map(Number),gainprm:a.gainprm.split(' ').map(Number),evidence:['flymimic'],neuralMapping:'unimplemented'}));
await writeFile(root+'/manifest.json',JSON.stringify({version:1,source:'https://github.com/gizemozd/FlyMimic',commit,modelPath:path,license:'Apache-2.0',modifications:[],physics:{timestep:Number(doc.option.timestep),gravity:doc.option.gravity,scope:'Tethered left foreleg. Other legs passive or constrained. No neural controller.',forceUnit:'source model units; physical force scaling requires independent audit'},files:manifest,muscles},null,2)+'\n');
console.log(JSON.stringify({sourceCommit:commit,files:assets.length,muscles:muscles.length,bytes:manifest.reduce((a,x)=>a+x.bytes,0)}));
