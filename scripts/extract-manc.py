"""Extract factual MANC records. Requires pandas/numpy/pyarrow and the pinned upstream checkout.
No upstream simulation software is copied. W is pre-row/post-column, signed by predicted NT.
Run after scripts/extract-network-source.py has cached the bounded subset (see docs/wiring.md).
"""
import json, numpy as np
from pathlib import Path

rows=json.loads(Path('work/network-nodes.json').read_text())
W=np.load('work/network-subset.npz')['W']
source=json.loads(Path('work/network-source.json').read_text())
nodes=[]
for row in rows:
    leg=(('L' if row['somaSide']=='LHS' else 'R')+{'fl':'F','ml':'M','hl':'H'}.get(row['subclass'],{'T1':'F','T2':'M','T3':'H'}.get(row['somaNeuromere'],''))) if row['somaSide'] in ['LHS','RHS'] else None
    if leg not in ['LF','LM','LH','RF','RM','RH']: leg=None
    nodes.append(dict(id=str(row['bodyId']),name=row['type'] or str(row['bodyId']),role='motor' if row['class']=='motor neuron' else 'descending' if row['type']=='DNg100' else 'premotor',leg=leg,size=row['size'],nt=row['predictedNt'],ntProbability=row['predictedNtProb'],module=row['motor module'] or None,step=row['step contribution'] or None))
edges=[]
for pre,post in zip(*np.nonzero(W)):
    value=float(W[pre,post])
    assert abs(value)==int(abs(value))
    edges.append(dict(pre=int(pre),post=int(post),count=int(abs(value)),sign=1 if value>0 else -1,evidence='observed',signEvidence='inferred'))
out=dict(version=1,dataset='MANC',specimen='adult male VNC; distinct specimen from FlyMimic anatomy',source=source,license='CC-BY (MANC data)',licenseUrl='https://www.janelia.org/project-team/flyem/manc-connectome',paper='https://doi.org/10.1101/2025.09.12.675944',orientation='pre -> post; counts unchanged; signs are predictions',nodes=nodes,edges=edges,parameters=dict(tau=.020,gain=1,threshold=7.5,cap=200,synapticGain=.03,sizeReference=666270409,parameterEvidence='inferred',sizeReferenceNote='Median of complete 4604-neuron MANC T1 reference table, not this selected subset. Deterministic mean parameters; no sampled heterogeneity.'))
Path('public/data').mkdir(exist_ok=True)
Path('public/data/manc-walking.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
print(len(nodes),'nodes;',len(edges),'edges')
