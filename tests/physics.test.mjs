import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createEngine } from '../src/engine.ts';
const manifest=JSON.parse(await readFile(new URL('../public/model/manifest.json',import.meta.url),'utf8'));
const read=path=>readFile(new URL('../public/model/'+path,import.meta.url));
let engine;
before(async()=>{engine=await createEngine(manifest,read);});
after(()=>engine?.dispose());
test('published XML and every geometry file retain their pinned source hashes',async()=>{
  for(const file of manifest.files){const bytes=await read(file.target);assert.equal(bytes.length,file.bytes,file.target);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.target);}
  assert.equal(manifest.commit,'9ea1131626cd76f7203b74076ef8f0e9cab30bef');
});
test('all tendon attachment sites resolve and each pulse remains finite',()=>{
  for(const muscle of manifest.muscles){for(const site of muscle.sites)assert.ok(engine.mujoco.mj_name2id(engine.model,engine.mujoco.mjtObj.mjOBJ_SITE.value,site)>=0,site);
    engine.reset();engine.select(muscle.index);engine.pulse(.35);engine.step(3000);
    assert.ok([...engine.data.qpos,...engine.data.qvel,...engine.data.actuator_force].every(Number.isFinite),muscle.id);
    assert.ok(engine.data.act[muscle.index]<.001,'pulse must release');
  }
});
test('tibia antagonist pulses produce opposing deviations from a passive control',()=>{
  engine.reset();engine.step(500);const baseline=engine.data.qpos[6];
  engine.reset();engine.select(13);engine.pulse(.35);engine.step(500);const flexor=engine.data.qpos[6];assert.ok(Math.abs(engine.data.actuator_force[13])>1);
  engine.reset();engine.select(14);engine.pulse(.35);engine.step(500);const extensor=engine.data.qpos[6];assert.ok(Math.abs(engine.data.actuator_force[14])>1);
  assert.ok((flexor-baseline)*(extensor-baseline)<0,'antagonists must deviate in opposite directions');
  assert.ok(Math.abs(flexor-baseline)>.001 && Math.abs(extensor-baseline)>.001,'motion must differ materially from gravity/passive dynamics');
});
test('reset reproduces an identical pulse trial',()=>{
  function trial(){engine.reset();engine.select(13);engine.pulse(.35);engine.step(1000);return Array.from(engine.data.qpos);}
  const a=trial(),b=trial();a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<1e-12));
});
test('halving timestep preserves the short-pulse response within a declared numerical tolerance',()=>{
  const dt=engine.model.opt.timestep;
  engine.reset();engine.select(13);engine.pulse(.35);engine.step(1000);const reference=Array.from(engine.data.qpos);
  try{engine.model.opt.timestep=dt/2;engine.reset();engine.pulse(.35);engine.step(2000);reference.forEach((value,i)=>assert.ok(Math.abs(value-engine.data.qpos[i])<.005,`joint ${i} differs by more than 0.005 rad`));}
  finally{engine.model.opt.timestep=dt;engine.reset();}
});
