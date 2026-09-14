"""Generate a separately labelled reduced muscle-group model. Never edits FlyMimic source.
Python standard library only. Constant moment arms are hypotheses, not digitized attachments.
"""
import xml.etree.ElementTree as E, math, json, hashlib
from pathlib import Path
p=Path('public/model'); tree=E.parse(p/'fly.xml'); root=tree.getroot()
root.set('model','dmelanogaster-experimental-walker-v1')
for tag in ['default','tendon','actuator','equality','keyframe','sensor','contact','size']:
 for el in root.findall(tag): root.remove(el)
root.find('option').attrib.update(timestep='0.0002',gravity='0 0 -9801',integrator='implicitfast',iterations='60')
for parent in root.iter():
 for el in list(parent):
  if el.tag in ['joint','freejoint','site'] or (el.tag=='geom' and el.get('type')!='mesh'):parent.remove(el)
  if 'class' in el.attrib:del el.attrib['class']
default=E.SubElement(root,'default')
E.SubElement(default,'joint',limited='true',armature='0.000002',damping='0.02',stiffness='0',solreflimit='.001 1')
E.SubElement(default,'geom',contype='0',conaffinity='0',density='0',rgba='.65 .49 .29 1')
E.SubElement(default,'site',size='.02')
world=root.find('worldbody'); thorax=world.find("body[@name='Thorax']")
thorax.set('pos','0 0 1.6');thorax.set('quat','1 0 0 0');E.SubElement(thorax,'freejoint',name='root')
E.SubElement(world,'geom',name='ground',type='plane',size='25 25 .1',contype='1',conaffinity='1',friction='1 .01 .001',solref='.001 1',rgba='.70 .76 .62 1')
E.SubElement(thorax,'geom',name='thorax_collision',type='ellipsoid',pos='-.5 0 -.1',size='.55 .3 .25',contype='1',conaffinity='1')
# Retain relative segment mass/inertia, normalize to an assumed 1 mg whole animal.
mass=sum(float(el.get('mass')) for el in root.iter('inertial')); factor=.001/mass
for el in root.iter('inertial'):
 el.set('mass',str(float(el.get('mass'))*factor))
 el.set('diaginertia',' '.join(str(float(v)*factor) for v in el.get('diaginertia').split()))
act=E.SubElement(root,'actuator'); tend=E.SubElement(root,'tendon'); muscles=[]; joints=[]; leginfo=[]
for leg in ['LF','LM','LH','RF','RM','RH']:
 side=1 if leg[0]=='L' else -1
 coxa=root.find(".//body[@name='"+leg+"Coxa']"); femur=root.find(".//body[@name='"+leg+"Femur']"); tibia=root.find(".//body[@name='"+leg+"Tibia']")
 yaw={'F':-.75,'M':0,'H':.8}[leg[1]]*side
 # Separate yaw hinge from the fixed coxa inclination, retaining source meshes and offsets.
 wrapper=E.Element('body',name=leg+'_socket',pos=coxa.get('pos'))
 E.SubElement(wrapper,'inertial',pos='0 0 0',mass='1e-9',diaginertia='1e-10 1e-10 1e-10')
 thorax.remove(coxa);thorax.append(wrapper);wrapper.append(coxa);coxa.set('pos','0 0 0')
 coxa.set('quat',f'{math.cos(.5/2)} {side*math.sin(.5/2)} 0 0')
 # Trochanter is retained as a rigid anatomical segment where present.
 specs=[(wrapper,'coxa',f'0 0 {side}',yaw*side,[-1.5,1.5]),(femur,'femur',f'{side} 0 0',.8,[-.2,1.6]),(tibia,'tibia',f'{side} 0 0',-1.3,[-2.4,-.2])]
 for body,kind,axis,rest,limits in specs:
  name=leg+'_'+kind
  E.SubElement(body,'joint',name=name,axis=axis,range=' '.join(map(str,limits)),ref=str(rest))
  # ref=rest means qpos=rest corresponds to neutral mesh; body rotations establish that pose.
  angle=rest; v=[float(x) for x in axis.split()]
  body.set('quat',' '.join(map(str,[math.cos(angle/2)]+[x*math.sin(angle/2) for x in v])))
  joints.append({'name':name,'leg':leg,'kind':kind,'rest':rest,'range':limits})
  for sign,label,module in [(1,'positive',{'coxa':'coxa stance','femur':'femur/tr flex','tibia':'tibia extend'}[kind]),(-1,'negative',{'coxa':'coxa swing','femur':'femur/tr extend','tibia':'tibia flex'}[kind])]:
   ident=name+'_'+label; tendon=E.SubElement(tend,'fixed',name=ident+'_excursion')
   E.SubElement(tendon,'joint',joint=name,coef=str(-sign*.05))
   # Native Hill force-length/velocity and activation dynamics; signed tendon excursion proxy.
   E.SubElement(act,'muscle',name=ident,tendon=ident+'_excursion',ctrlrange='0 1',force='180',lengthrange='-.16 .16',range='.5 1.5',timeconst='.008 .025',lmin='.3',lmax='1.7',vmax='10',fpmax='.0001')
   muscles.append({'index':len(muscles),'id':ident,'label':leg+' '+kind+' '+label,'region':leg,'tendon':ident+'_excursion','sites':[],'ctrlrange':[0,1],'lengthrange':[-.16,.16],'dynprm':[.008,.025],'gainprm':[.5,1.5,180],'evidence':['experimental-muscle-groups'],'neuralMapping':'Hypothesized pooled '+module+' drive; NMJ and individual muscle fibres unresolved','module':module,'sign':sign,'joint':name})
 foot=root.find(".//body[@name='"+leg+"Tarsus5']")
 E.SubElement(foot,'geom',name=leg+'_foot',type='sphere',pos='0 0 -.10',size='.055',contype='1',conaffinity='1',friction='1.1 .01 .001',solref='.001 1')
 E.SubElement(foot,'site',name=leg+'_foot_site',pos='0 0 -.10')
 leginfo.append({'id':leg,'footSite':leg+'_foot_site','yaw':yaw*side})
# Arena walls are physical. Props use explicitly simple collision proxies.
for name,pos,size in [('north','0 12 1','12 .1 1'),('south','0 -12 1','12 .1 1'),('east','12 0 1','.1 12 1'),('west','-12 0 1','.1 12 1')]:
 E.SubElement(world,'geom',name='wall_'+name,type='box',pos=pos,size=size,contype='1',conaffinity='1')
E.indent(tree,space='  ');(p/'walking.xml').write_bytes(E.tostring(root,encoding='utf-8',xml_declaration=True))
source=json.loads((p/'manifest.json').read_text());files=[f for f in source['files'] if f['target']!='fly.xml'];blob=(p/'walking.xml').read_bytes()
files.append({'target':'walking.xml','source':'scripts/derive-walker.py','bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest()})
out={'version':1,'runtimeModel':'walking.xml','source':source['source'],'commit':source['commit'],'modelPath':'walking.xml','license':'Apache-2.0 derivation with MIT integration','modifications':['Free thorax','18 principal leg DOF','36 inferred antagonistic muscle groups with constant moment arms','Assumed 1 mg body mass; source relative inertias retained','Simplified contact geometry','No wing, haltere, gut, respiratory or reproductive dynamics'],'physics':{'timestep':.0002,'gravity':'9801 mm/s^2','scope':'experimental reduced six-leg model','forceUnit':'microNewton (g, mm, s model convention; uncalibrated strength)'},'files':files,'muscles':muscles,'joints':joints,'legs':leginfo,'massScale':factor,'sourceMassSum':mass}
out['initialQpos']=json.loads(Path('scripts/walking-stance.json').read_text())['qpos']
(p/'walking-manifest.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Derived',len(joints),'joints;',len(muscles),'muscle groups; source mass scale',factor)
