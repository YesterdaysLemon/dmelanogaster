"""Derive the v0.4 free-body NMF walker; preserve upstream anatomy and motion data.

Requires the motion Python environment (NumPy, SciPy, MuJoCo). Run from repo.
The processed step is model input, not raw observed coordination. See docs/contact.md.
"""
from pathlib import Path
import xml.etree.ElementTree as E
import json, pickle, copy, hashlib, math
import numpy as np
import mujoco
from scipy.interpolate import CubicSpline

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save(path, data): Path(path).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
legs=['LF','LM','LH','RF','RM','RH']
base=json.loads(Path('public/motion/manifest.json').read_text(encoding='utf-8'))
root=E.parse('public/motion/motion.xml').getroot()
root.set('model','dmelanogaster-nmf-terrarium-v04')
assets=root.find('asset'); files=[]
for mesh in assets.findall('mesh'):
    mesh.set('file','meshes/nmf/'+Path(mesh.get('file')).name)
for f in base['files']:
    if f['target']=='motion.xml':continue
    files.append({**f,'target':'meshes/nmf/'+Path(f['target']).name,'assetPath':'/motion/'+f['target']})
world=root.find('worldbody');body=world.find("body[@name='Thorax']")
body.set('pos','0 0 1.5');E.SubElement(body,'freejoint',name='root')
root.find('option').attrib.update(timestep='.0001',iterations='80',cone='elliptic')
contact={'friction':'1 .005 .0001','solref':'.0002 1','solimp':'.999 .9999 .001','margin':'.01'}
# Environment contact for every anatomical mesh. Other-leg contact enabled;
# same-leg and body-leg hull overlaps at attachments are explicitly excluded.
for geom in root.iter('geom'):
    leg=geom.get('name','')[:2];bit=(4<<legs.index(leg)) if leg in legs else 2
    geom.attrib.update(contact,group='0',contype=str(bit),conaffinity=str(1+(252^bit)) if leg in legs else '1')
environment={**contact,'contype':'1','conaffinity':'254','group':'3'}
E.SubElement(world,'geom',name='ground',type='plane',size='12 12 .1',**environment)
for name,pos,size in [('north','0 12 2','12 .1 2'),('south','0 -12 2','12 .1 2'),('east','12 0 2','.1 12 2'),('west','-12 0 2','.1 12 2')]:
    E.SubElement(world,'geom',name='wall_'+name,type='box',pos=pos,size=size,**environment)
banana=json.loads(Path('public/props/banana/manifest.json').read_text(encoding='utf-8'))
prop=E.SubElement(world,'body',name='banana',pos=' '.join(map(str,banana['position'])),quat=f'{math.cos(banana["rotationZ"]/2)} 0 0 {math.sin(banana["rotationZ"]/2)}')
for piece in banana['pieces']:
    name='banana_'+piece['name'];target='meshes/banana/'+Path(piece['file']).name
    E.SubElement(assets,'mesh',name=name,file=target)
    E.SubElement(prop,'geom',name='prop_'+name,type='mesh',mesh=name,**environment)
    files.append({'target':target,'assetPath':'/props/banana/'+piece['file'],'source':'scripts/build-banana.py','sha256':piece['sha256'],'bytes':piece['bytes']})
stimuli=[{'id':'yeast','kind':'food','x':4,'y':1.5,'radius':.65,'strength':1,'enabled':True},
         {'id':'geosmin','kind':'repellent','x':2,'y':-3,'radius':.65,'strength':1,'enabled':True},
         {'id':'water','kind':'water','x':-3,'y':-2,'radius':.5,'strength':1,'enabled':True}]
for s in stimuli:
    h=s['radius']*.10
    b=E.SubElement(world,'body',name='patch_'+s['id'],mocap='true',pos=f'{s["x"]} {s["y"]} {h}')
    E.SubElement(b,'geom',name='prop_'+s['id'],type='ellipsoid',size=f'{s["radius"]} {s["radius"]} {h}',**environment)
adhesion=[]
for i,leg in enumerate(legs):
    E.SubElement(root.find('actuator'),'adhesion',name=leg+'_pad',body=leg+'Tarsus5',gain='40',ctrlrange='0 1')
    adhesion.append({'id':leg+'_pad','index':84+i,'body':leg+'Tarsus5','gain':40})
source=E.parse('public/motion/source/neuromechfly.xml').getroot()
for leg in legs:
    for tarsus in [2,3,4,5]:
        j=copy.deepcopy(source.find(".//joint[@name='joint_"+leg+'Tarsus'+str(tarsus)+"']"))
        j.attrib.update(stiffness='7.5',damping='.01',armature='.00000002',limited='false')
        root.find(".//body[@name='"+leg+'Tarsus'+str(tarsus)+"']").append(j)
compile_root=copy.deepcopy(root)
for mesh in compile_root.findall('asset/mesh'):
    f=next(f for f in files if f['target']==mesh.get('file'))
    mesh.set('file',str(Path('public'+f['assetPath']).resolve()))
m=mujoco.MjModel.from_xml_string(E.tostring(compile_root).decode());d=mujoco.MjData(m)
path='public/motion/source/single_steps_untethered.pkl'
expected='1e5b28bb6b3f50ac95a04773ea37af28d05e26d03bd90fdba57fa1b3eacfaf8c'
assert digest(path)==expected, 'Pinned source hash differs; never unpickle unverified input'
with open(path,'rb') as stream:p=pickle.load(stream)
names=[j['name'] for j in base['joints']]
ids=[mujoco.mj_name2id(m,mujoco.mjtObj.mjOBJ_JOINT,n) for n in names]
qids=[int(m.jnt_qposadr[i]) for i in ids];vids=[int(m.jnt_dofadr[i]) for i in ids]
q=np.array([p[n] for n in names]).T
curve=CubicSpline(np.linspace(0,1,len(q)),q,axis=0,bc_type='periodic')
d.qpos[qids]=curve(.5);mujoco.mj_forward(m,d)
minimum=1e9
for g in range(m.ngeom):
    if m.geom_type[g]!=mujoco.mjtGeom.mjGEOM_MESH or m.geom_group[g]==3:continue
    mesh=m.geom_dataid[g];v=m.mesh_vert[m.mesh_vertadr[mesh]:m.mesh_vertadr[mesh]+m.mesh_vertnum[mesh]]
    minimum=min(minimum,(v@d.geom_xmat[g].reshape(3,3).T+d.geom_xpos[g])[:,2].min())
d.qpos[2]+=.02-minimum;mujoco.mj_forward(m,d)
E.indent(root);xml=E.tostring(root,encoding='utf-8',xml_declaration=True)
Path('public/model/walking.xml').write_bytes(xml)
files.append({'target':'walking.xml','source':'scripts/derive-walker.py','bytes':len(xml),'sha256':hashlib.sha256(xml).hexdigest()})
steps={'version':1,'source':base['source'],'commit':base['commit'],'sourceSha256':expected,
       'evidence':'Processed, mirrored, smoothed and closed single-step template selected upstream for simulated walking; NOT raw measured six-leg coordination.',
       'interpolation':'SciPy periodic CubicSpline, exact exported polynomial coefficients; phase normalized to [0,1].',
       'qids':qids,'vids':vids,'joints':names,'coefficients':curve.c.tolist(),'knots':curve.x.tolist(),
       'neutral':curve(.5).tolist(),'stanceStart':[p['swing_stance_time']['stance'][l]/.135 for l in legs]}
save('public/data/nmf-steps.json',steps)
muscles=copy.deepcopy(base['muscles'])
for i,muscle in enumerate(muscles):muscle['qposIndex']=qids[i//2]
manifest={**base,'version':2,'runtimeModel':'walking.xml','modelPath':'walking.xml','files':files,'initialQpos':d.qpos.tolist(),
 'muscles':muscles,'adhesion':adhesion,'joints':[{**j,'qposIndex':qids[i],'qvelIndex':vids[i]} for i,j in enumerate(base['joints'])],
 'modifications':['Free thorax; 42 active anatomical leg axes with 84 hypothetical Hill antagonists','24 source distal tarsal hinges restored with NMF stiffness 7.5 and damping .01','6 native contact-dependent adhesion actuators, NMF model gain 40','All anatomical mesh hulls collide with environment; inter-leg self-contact enabled, same-leg/body-leg excluded','Original Blender banana: 94 short convex pieces, plus matching floor/walls/substrate patches','No wing, organ or reconstructed proprioceptive circuit dynamics'],
 'physics':{'timestep':.0001,'gravity':root.find('option').get('gravity')+' mm/s^2','scope':'Experimental NMF anatomy / muscle-driven free body','forceUnit':'microNewton (g, mm, s model convention; uncalibrated strength)'},
 'environment':{'floorZ':0,'halfWidth':12,'wallHalfThickness':.1,'wallHeight':4,'banana':banana,'stimuli':stimuli},
 'contacts':{'marginMM':.01,'solref':[.0002,1],'solimp':[.999,.9999,.001],'friction':[1,.005,.0001],'meshMethod':'MuJoCo convex hull of each source anatomical mesh; conservative, not tissue compliance','exclusions':'same-leg and body-leg self-contact; rigid attachments overlap. All surfaces collide with environment.'},
 'stepData':{'path':'/data/nmf-steps.json','sha256':digest('public/data/nmf-steps.json')},
 'passiveTarsi':{'count':24,'stiffness':7.5,'damping':.01,'armature':2e-8,'evidence':'Source NMF joint axes; FlyGym model stiffness/damping; numerical armature is our assumption'}}
save('public/model/walking-manifest.json',manifest)
print(f'Derived nq={m.nq}, nv={m.nv}, nu={m.nu}; initial lowest surface .02 mm; thorax {d.qpos[2]:.6f} mm')
