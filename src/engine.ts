import loadMujoco, { type MainModule, type MjModel, type MjData } from '@mujoco/mujoco';

export interface Muscle {index:number;id:string;label:string;region:string;tendon:string;sites:string[];ctrlrange:number[];lengthrange:number[];dynprm:number[];gainprm:number[];evidence:string[];neuralMapping:string}
export interface Manifest {version:number;source:string;commit:string;modelPath:string;license:string;modifications:string[];physics:{timestep:number;gravity:string;scope:string;forceUnit:string};files:{target:string;source:string;bytes:number;sha256:string}[];muscles:Muscle[]}
export type Sample={time:number;excitation:number;activation:number;force:number;length:number;angle:number};
export class FlyEngine {
  readonly mujoco:MainModule; readonly model:MjModel; readonly data:MjData; readonly manifest:Manifest;
  selected=13; running=false; speed=0.1; pulseEnd=-1; history:Sample[]=[];
  private remaining=0; private previousSample=-1;
  constructor(mujoco:MainModule,model:MjModel,manifest:Manifest){this.mujoco=mujoco;this.model=model;this.manifest=manifest;this.data=new mujoco.MjData(model);this.reset();}
  reset(){this.mujoco.mj_resetDataKeyframe(this.model,this.data,0);this.data.ctrl.fill(0.0001);this.pulseEnd=-1;this.remaining=0;this.history=[];this.previousSample=-1;this.mujoco.mj_forward(this.model,this.data);this.record();}
  excite(index:number,value:number){if(!Number.isInteger(index)||index<0||index>=this.model.nu||!Number.isFinite(value))throw new Error('Invalid muscle excitation');this.data.ctrl[index]=Math.max(this.manifest.muscles[index].ctrlrange[0],Math.min(1,value));}
  release(){this.data.ctrl.fill(0.0001);this.pulseEnd=-1;}
  pulse(value=0.35,duration=0.05){this.excite(this.selected,value);this.pulseEnd=this.data.time+duration;this.running=true;}
  step(count=1){for(let i=0;i<count;i++){if(this.pulseEnd>=0 && this.data.time>=this.pulseEnd)this.release();this.mujoco.mj_step(this.model,this.data);if(!Number.isFinite(this.data.qpos[0])){this.running=false;throw new Error('Non-finite physics state');}if(this.data.time-this.previousSample>=0.001-1e-9)this.record();}}
  advance(wallSeconds:number){if(!this.running)return;this.remaining+=Math.min(wallSeconds,0.05)*this.speed;const steps=Math.min(150,Math.floor(this.remaining/this.model.opt.timestep));this.step(steps);this.remaining-=steps*this.model.opt.timestep;this.remaining=Math.min(this.remaining,0.02);}
  sample():Sample {const i=this.selected;return {time:this.data.time,excitation:this.data.ctrl[i],activation:this.data.act[i],force:this.data.actuator_force[i],length:this.data.actuator_length[i],angle:this.data.qpos[6]*180/Math.PI};}
  record(){this.history.push(this.sample());if(this.history.length>4000)this.history.shift();this.previousSample=this.data.time;}
  select(index:number){this.selected=index;this.history=[];this.previousSample=-1;this.record();}
  dispose(){this.data.delete();this.model.delete();}
}
export async function createEngine(manifest:Manifest,read:(path:string)=>Promise<Uint8Array>,wasmBinary?:Uint8Array):Promise<FlyEngine>{
  const mujoco=await loadMujoco(wasmBinary?{wasmBinary}:{});
  const fs=mujoco.FS;fs.mkdir('/fly');fs.mkdir('/fly/meshes');fs.mkdir('/fly/meshes/stl');
  // Source XML and meshes are copied unchanged. No learned controller is loaded.
  await Promise.all(manifest.files.map(async f=>fs.writeFile('/fly/'+f.target,await read(f.target))));
  const model=mujoco.MjModel.from_xml_path('/fly/fly.xml');
  if(model.nu!==manifest.muscles.length)throw new Error('Actuator roster differs from anatomical manifest');
  return new FlyEngine(mujoco,model,manifest);
}
