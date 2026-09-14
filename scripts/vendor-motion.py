"""Vendor a pinned NMF v2 anatomy and derive a separate, tethered motion bench.
No source geometry, recording or annotation is overwritten by a fit.
Run from the repo root after acquiring the sources documented in docs/motion.md.
"""
from pathlib import Path
import hashlib, json, shutil, subprocess, xml.etree.ElementTree as ET

UP = Path('work/flygym-paper')
COMMIT = 'cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b'
assert subprocess.check_output(['git', '-C', str(UP), 'rev-parse', 'HEAD'], text=True).strip() == COMMIT
OUT = Path('public/motion')
(OUT/'source').mkdir(parents=True, exist_ok=True)
(OUT/'meshes').mkdir(exist_ok=True)
src = UP/'flygym/data/mjcf/neuromechfly_seqik_kinorder_ypr.xml'
for source, dest in [(src, 'source/neuromechfly.xml'),
                     (UP/'LICENSE', 'source/Apache-2.0.txt'),
                     (UP/'flygym/data/behavior/single_steps_untethered.pkl', 'source/single_steps_untethered.pkl'),
                     (Path('work/annotated_3d_walking_kinematics.csv'), 'source/annotations.csv'),
                     (Path('work/recorded_steps.mp4'), 'source/recorded_steps.mp4')]:
    if source.is_relative_to(UP):
        # Git blobs avoid Windows checkout newline conversion of source XML.
        (OUT/dest).write_bytes(subprocess.check_output(['git','-C',str(UP),'show',COMMIT+':'+source.relative_to(UP).as_posix()]))
    else:
        shutil.copyfile(source, OUT/dest)
tree = ET.parse(src); root = tree.getroot(); root.set('model', 'nmf2-motion-bench-v1')
compiler = root.find('compiler')
compiler.attrib.pop('convexhull', None)
compiler.set('fusestatic', 'false')
root.find('option').attrib.clear()
root.find('option').attrib.update(timestep='0.0001', gravity='0 0 -9810', integrator='implicitfast', iterations='50')
for tag in ['actuator', 'sensor', 'contact', 'equality', 'keyframe', 'tendon', 'size']:
    for el in root.findall(tag): root.remove(el)
files = []
def entry(target, origin):
    data = (OUT/target).read_bytes()
    return dict(target=target, source=origin, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
for mesh in root.findall('asset/mesh'):
    old = mesh.get('file'); name = Path(old).name
    target = 'meshes/'+name
    if not any(f['target'] == target for f in files):
        shutil.copyfile(UP/'flygym/data/mesh'/name, OUT/target)
        files.append(entry(target, 'flygym/data/mesh/'+name))
    mesh.set('file', target)
legs = ['LF','LM','LH','RF','RM','RH']
kinds = ['Coxa_yaw','Coxa','Coxa_roll','Femur','Femur_roll','Tibia','Tarsus1']
active = ['joint_'+leg+kind for leg in legs for kind in kinds]
for parent in root.iter():
    for el in list(parent):
        if el.tag in ['joint','freejoint'] and el.get('name') not in active: parent.remove(el)
    if parent.tag == 'geom':
        parent.set('contype', '0'); parent.set('conaffinity', '0')
thorax = root.find(".//body[@name='Thorax']")
thorax.set('pos', '0 0 1.5')
act = ET.SubElement(root, 'actuator'); tend = ET.SubElement(root, 'tendon')
muscles = []; joints = []; landmarks = []
for leg in legs:
    for kind in kinds:
        name = 'joint_'+leg+kind
        j = root.find(".//joint[@name='"+name+"']")
        j.attrib.update(damping='.02', armature='.000002', limited='false')
        joints.append(dict(name=name, leg=leg, kind=kind, axis=j.get('axis')))
        for sign in [1,-1]:
            ident = name+('_positive' if sign>0 else '_negative')
            t = ET.SubElement(tend,'fixed',name=ident+'_excursion')
            ET.SubElement(t,'joint',joint=name,coef=str(-sign*.05))
            ET.SubElement(act,'muscle',name=ident,tendon=ident+'_excursion',ctrlrange='0 1',force='180',
                lengthrange='-.32 .32',range='.5 1.5',timeconst='.008 .025',lmin='.3',lmax='1.7',vmax='10',fpmax='.0001')
            muscles.append(dict(index=len(muscles),id=ident,joint=name,sign=sign,sites=[]))
    for body, label, pos in [('Coxa','ThC','0 0 0'),('Femur','CTr','0 0 0'),('Tibia','FTi','0 0 0'),
                              ('Tarsus1','TiTa','0 0 0'),('Tarsus5','Claw','0 0 -.09')]:
        name = leg+'-'+label
        ET.SubElement(root.find(".//body[@name='"+leg+body+"']"),'site',name=name,pos=pos,size='.025')
        landmarks.append(name)
ET.indent(tree, space='  ')
(OUT/'motion.xml').write_bytes(ET.tostring(root, encoding='utf-8', xml_declaration=True))
files.append(entry('motion.xml','scripts/vendor-motion.py'))
metadata = json.loads(Path('work/nmf2-dataverse.json').read_text(encoding='utf-8'))['data']['latestVersion']
shutil.copyfile('work/nmf2-dataverse.json', OUT/'source/dataverse-metadata.json')
manifest = dict(version=1, source='https://github.com/NeLy-EPFL/flygym',commit=COMMIT,
    modelPath='motion.xml',runtimeModel='motion.xml',license='Apache-2.0',files=files,muscles=muscles,joints=joints,landmarks=landmarks,
    dataset=dict(doi='10.7910/DVN/3MCEYR',version=f"{metadata['versionNumber']}.{metadata['versionMinorNumber']}",license='CC0-1.0'),
    sourceFiles=[entry('source/'+f, origin) for f,origin in [
        ('annotations.csv','https://dataverse.harvard.edu/api/access/datafile/10407643'),
        ('recorded_steps.mp4','https://dataverse.harvard.edu/api/access/datafile/10407644'),
        ('single_steps_untethered.pkl','flygym/data/behavior/single_steps_untethered.pkl'),
        ('neuromechfly.xml','flygym/data/mjcf/neuromechfly_seqik_kinorder_ypr.xml'),
        ('dataverse-metadata.json','https://dataverse.harvard.edu/api/datasets/:persistentId?persistentId=doi:10.7910/DVN/3MCEYR')]],
    modifications=['Fixed thorax for an isolated motion/force bench; no locomotion claim',
        'Source seven active joint DOFs per leg retained; distal tarsi and other appendages fixed',
        'Source geometry and joint axes retained, no calibrated muscle attachment reconstruction',
        '84 experimental antagonistic Hill actuators: 180 uN, 0.05 mm constant moment arm, 8/25 ms activation/deactivation',
        'No contact or adhesion; gravity acts on the tethered leg chains',
        'Claw marker 0.09 mm distal to Tarsus5 origin is an explicit registration assumption'],
    physics=dict(timestep=.0001,forceUnit='microNewton',scope='tethered trajectory-tracking assay'))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Vendored',len(files),'model files;',len(joints),'DOFs;',len(muscles),'experimental muscles')
