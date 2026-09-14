import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { FlyEngine } from './engine';

/** Displays the compiled physics geometry. Poses always come from MuJoCo. */
export class FlyViewer {
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.PerspectiveCamera(32,1,0.02,100);
  readonly controls:OrbitControls;
  private geoms:{id:number;mesh:THREE.Mesh;wing:boolean}[]=[];
  private paths:{line:THREE.Line;sites:number[]}[]=[];
  private observer:ResizeObserver;
  private xray=false;
  constructor(private host:HTMLElement,private engine:FlyEngine){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setClearColor(0xebece2,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.3;
    this.renderer.domElement.setAttribute('aria-label','Interactive anatomical fly model. Drag to orbit; scroll to zoom.');
    this.host.append(this.renderer.domElement);
    this.camera.up.set(0,0,1);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.minDistance=.65;this.controls.maxDistance=19;
    this.controls.maxPolarAngle=Math.PI*.88;
    this.scene.add(new THREE.HemisphereLight(0xfff8df,0x5b6652,2));
    const key=new THREE.DirectionalLight(0xfff4d3,3);key.position.set(2,3,9);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xc1d6cf,1.8);fill.position.set(-5,-3,5);this.scene.add(fill);
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,.08,96),new THREE.MeshStandardMaterial({color:0xd7ddcd,roughness:.9}));
    platform.rotation.x=Math.PI/2;platform.position.z=-.06;this.scene.add(platform);
    const grid=new THREE.GridHelper(8,16,0x97a38d,0xb6beaa);grid.rotation.x=Math.PI/2;grid.position.z=.002;
    (grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.3;this.scene.add(grid);
    const ring=new THREE.Mesh(new THREE.RingGeometry(4.57,4.59,96),new THREE.MeshBasicMaterial({color:0x829277,side:THREE.DoubleSide}));ring.position.z=.005;this.scene.add(ring);
    const {model:m,data:d,mujoco:mj}=engine;
    for(let i=0;i<m.ngeom;i++){
      if(m.geom_type[i]!==7)continue;
      const id=m.geom_dataid[i],va=m.mesh_vertadr[id]*3,vn=m.mesh_vertnum[id]*3,fa=m.mesh_faceadr[id]*3,fn=m.mesh_facenum[id]*3;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(m.mesh_vert.slice(va,va+vn)),3));
      geometry.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(m.mesh_face.slice(fa,fa+fn)),1));geometry.computeVertexNormals();
      const meshName=mj.mj_id2name(m,mj.mjtObj.mjOBJ_GEOM.value,i) || '';
      const wing=/wing/i.test(meshName),eye=/eye/i.test(meshName),leg=/coxa|femur|tibia|tarsus|trochanter/i.test(meshName);
      const color=eye?0x7e3026:wing?0xb6c7b5:leg?0x9c754b:/^A[1-9]/.test(meshName)?0x886e43:0xa68a56;
      const material=new THREE.MeshStandardMaterial({color,roughness:eye?.5:.77,metalness:0,transparent:wing,opacity:wing?.2:1,side:THREE.DoubleSide,depthWrite:!wing});
      const mesh=new THREE.Mesh(geometry,material);mesh.matrixAutoUpdate=false;this.scene.add(mesh);this.geoms.push({id:i,mesh,wing});
    }
    for(const muscle of engine.manifest.muscles){
      const sites=muscle.sites.map(name=>mj.mj_name2id(m,mj.mjtObj.mjOBJ_SITE.value,name));
      if(sites.some(id=>id<0))throw new Error('Anatomical tendon site missing: '+muscle.id);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(sites.length*3),3));
      const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xba5735,transparent:true,opacity:.8,depthTest:false}));
      line.renderOrder=10;this.scene.add(line);this.paths.push({line,sites});
    }
    // A visual tether identifies the fixed thorax. It adds no simulated forces.
    const tether=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,4.2),new THREE.Vector3(0,0,6)]),new THREE.LineDashedMaterial({color:0x819079,dashSize:.04,gapSize:.07,transparent:true,opacity:.5}));
    tether.computeLineDistances();this.scene.add(tether);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
    this.focus('body');this.update();
  }
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  focus(view:'body'|'leg'){
    if(view==='body'){this.controls.target.set(-.45,0,3.5);this.camera.position.set(5,6.2,6.6);}
    else {this.controls.target.set(.05,.65,3.2);this.camera.position.set(-1.2,3.4,4.15);}
    this.controls.update();
  }
  toggleXray(){this.xray=!this.xray;for(const {mesh,wing}of this.geoms){const mat=mesh.material as THREE.MeshStandardMaterial;mat.transparent=this.xray||wing;mat.opacity=this.xray?.18:wing?.2:1;mat.depthWrite=!this.xray&&!wing;}return this.xray;}
  update(){
    const d=this.engine.data;
    for(const {id:i,mesh}of this.geoms){const p=i*3,r=i*9,a=d.geom_xmat;mesh.matrix.set(a[r],a[r+1],a[r+2],d.geom_xpos[p],a[r+3],a[r+4],a[r+5],d.geom_xpos[p+1],a[r+6],a[r+7],a[r+8],d.geom_xpos[p+2],0,0,0,1);}
    this.paths.forEach(({line,sites},i)=>{const pos=line.geometry.getAttribute('position');sites.forEach((id,j)=>pos.setXYZ(j,d.site_xpos[id*3],d.site_xpos[id*3+1],d.site_xpos[id*3+2]));pos.needsUpdate=true;line.geometry.computeBoundingSphere();const mat=line.material as THREE.LineBasicMaterial;mat.color.set(i===this.engine.selected?0xda582b:0x6d8063);mat.opacity=i===this.engine.selected?1:this.xray?.32:.12;});
    this.controls.update();this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.observer.disconnect();this.controls.dispose();this.scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});this.renderer.dispose();}
}
