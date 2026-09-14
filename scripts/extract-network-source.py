import pandas as pd, numpy as np, json, hashlib
from pathlib import Path
p=Path('work/Pugliese_cpg_2025/data/manc full vnc data')
t=p/'wTable_20260522_allSynapses.feather'; w=p/'W_20260522_allSynapses.npz'
df=pd.read_feather(t)
core=df.type.isin(['DNg100','IN17A001','INXXX466','IN16B036'])
mn=(df['class']=='motor neuron') & df.subclass.isin(['fl','ml','hl'])
print('classes',df[df['class'].str.contains('motor',na=False)].subclass.value_counts().to_dict(),flush=True)
W=np.load(w)['arr_0']
# Bounded two-hop premotor expansion, selected anatomically, not by walking reward.
# For each leg retain the 20 intrinsic cells with greatest |core->cell|*|cell->leg MN|.
bridge=set()
for side in ['LHS','RHS']:
 for sub in ['fl','ml','hl']:
  motor=np.flatnonzero(mn & (df.somaSide==side) & (df.subclass==sub))
  cin=np.abs(W[np.flatnonzero(core),:]).sum(axis=0)
  cout=np.abs(W[:,motor]).sum(axis=1)
  score=cin*cout
  score[(df['class']!='intrinsic neuron').to_numpy() | core.to_numpy()]=0
  bridge.update(int(i) for i in np.argsort(score)[-20:] if score[i]>0)
selected=core|mn
selected.iloc[list(bridge)]=True
idx=np.flatnonzero(selected)
ix=[int(df.index[df.bodyId==n][0]) for n in [10093,10707,11751,13905]]
print('matrix',W[np.ix_(ix,ix)].tolist(), 'dtype',str(W.dtype),flush=True)
sub=W[np.ix_(idx,idx)].copy(); del W
np.savez_compressed('work/network-subset.npz',W=sub,idx=idx)
df.iloc[idx].to_json('work/network-nodes.json',orient='records')
print('subset',sub.shape,'min',sub.min(),'max',sub.max(),'nonzero',np.count_nonzero(sub),'median',df['size'].median(),flush=True)
print(df.loc[mn,['bodyId','type','subclass','somaSide','motor module','step contribution']].head(25).to_string(),flush=True)
out={'source':'https://github.com/smpuglie/Pugliese_cpg_2025','commit':'faee4b06869855ae0164cbf217fb6ec28ef3521b','files':[],'referenceMedianSize':float(df['size'].median())}
for f in [t,w]:
 h=hashlib.sha256()
 with f.open('rb') as stream:
  for chunk in iter(lambda:stream.read(4*1024*1024),b''):h.update(chunk)
 out['files'].append({'path':str(f.relative_to(Path('work/Pugliese_cpg_2025'))).replace('\\','/'),'sha256':h.hexdigest()})
Path('work/network-source.json').write_text(json.dumps(out,indent=2))
