"""Reconstruct the original 37-frame NMF v2 recording, without cycle selection.
Uses SeqIKPy alignment + sequential IK, followed by explicit MuJoCo-coordinate
registration. Optimization fits poses to measured landmarks, never a policy.
"""
from pathlib import Path
import csv, json, hashlib, subprocess
import numpy as np
import mujoco
from scipy.optimize import least_squares
from seqikpy.alignment import AlignPose
from seqikpy.kinematic_chain import KinematicChainSeq
from seqikpy.leg_inverse_kinematics import LegInvKinSeq
from seqikpy.body_config import neuromechfly_body_config
from seqikpy.utils import calculate_body_size

ROOT = Path('public/motion')
SEQIK_COMMIT = 'f7f1dc9b09ce89c4f54b2005722d62f887623a7b'
assert subprocess.check_output(['git','-C','work/seqik','rev-parse','HEAD'],text=True).strip() == SEQIK_COMMIT
manifest = json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
model = mujoco.MjModel.from_xml_path(str((ROOT/'motion.xml').resolve()))
data = mujoco.MjData(model); mujoco.mj_forward(model, data)
legs = ['LF','LM','LH','RF','RM','RH']
markers = ['ThC','CTr','FTi','TiTa','Claw']
segments = ['Coxa','Femur','Tibia','Tarsus','Claw']
kinds = ['Coxa_yaw','Coxa','Coxa_roll','Femur','Femur_roll','Tibia','Tarsus1']
angles = ['ThC_yaw','ThC_pitch','ThC_roll','CTr_pitch','CTr_roll','FTi_pitch','TiTa_pitch']
rows = list(csv.DictReader((ROOT/'source/annotations.csv').open(encoding='utf-8')))
raw = {leg+'_leg':np.array([[[float(r[leg+'-'+p+'_'+a]) for a in 'xyz'] for p in markers] for r in rows]) for leg in legs}
ids = {leg: [mujoco.mj_name2id(model,mujoco.mjtObj.mjOBJ_SITE,leg+'-'+p) for p in markers] for leg in legs}
template = {leg+'_'+seg: data.site_xpos[ids[leg][k]].copy() for leg in legs for k,seg in enumerate(segments)}
config = neuromechfly_body_config.deepcopy(); config.template = template
# Seeds from the SeqIKPy locomotion notebook (Apache-2.0). These select an IK
# branch; they are not a movement generator or fitted biological parameters.
config.initial_angles_rad = {}
for leg in legs:
    side = 1 if leg[0]=='R' else -1
    yaw=.45*side; pitch={'F':-.07,'M':.37,'H':.07}[leg[1]]; roll=-.32*side
    config.initial_angles_rad[leg] = {
        'stage_1':np.array([0,yaw,pitch,-2.14]),
        'stage_2':np.array([0,yaw,pitch,roll,-2.14,1.4]),
        'stage_3':np.array([0,yaw,pitch,roll,-2.14,-1.25*side,1.48,0]),
        'stage_4':np.array([0,yaw,pitch,roll,-2.14,-1.25*side,1.48,0,0]),
    }
# Broad angular bounds retain the source seven-axis chain. Distal tarsus pitch
# remains flexion-only per the SeqIKPy locomotion example, not a measured limit.
bounds = {leg+'_'+a: (-np.pi,np.pi) for leg in legs for a in angles}
for leg in legs: bounds[leg+'_TiTa_pitch'] = (-np.pi,0)
config.dof_bounds_rad = bounds
aligner = AlignPose(raw,legs_list=legs,include_claw=False,body_template=template,body_size=None)
aligned = aligner.align_pose()
chain = KinematicChainSeq(bounds_dof=bounds,body_size=calculate_body_size(template,legs),legs_list=legs)
solver = LegInvKinSeq(aligned_pos=aligned,kinematic_chain_class=chain,initial_angles=config.initial_angles_rad)
seq_angles, seq_fk = solver.run_ik_and_fk(hide_progress_bar=True)
q = np.zeros((len(rows),model.nq)); fitted = np.zeros((len(rows),30,3)); seq_errors=[]
reduced_q = np.zeros_like(q); reduced_fitted = np.zeros_like(fitted)
refinements=[]; scales={}
for li,leg in enumerate(legs):
    qids = [int(model.jnt_qposadr[mujoco.mj_name2id(model,mujoco.mjtObj.mjOBJ_JOINT,'joint_'+leg+k)]) for k in kinds]
    seed = np.array([seq_angles['Angle_'+leg+'_'+a] for a in angles]).T
    scales[leg] = float(aligner.find_scale_leg(leg,aligner.get_mean_length(raw[leg+'_leg'],True)))
    for f in range(len(rows)):
        target = aligned[leg+'_leg'][f]
        def residual(values):
            data.qpos[qids] = values; mujoco.mj_forward(model,data)
            return (data.site_xpos[ids[leg]][1:] - target[1:]).ravel()
        initial = seed[f].copy()
        seq_errors.append(float(np.sqrt(np.mean(residual(initial)**2))))
        # Refine against the actual XML offsets, which differ slightly from
        # SeqIKPy's ideal axial links. Use the previous fit as a second seed to
        # reduce equivalent-angle branch jumps; choose by landmark error only.
        guesses = [initial] + ([q[f-1,qids]] if f else [])
        lower=np.full(7,-np.pi); upper=np.full(7,np.pi); upper[-1]=0
        fits = [least_squares(residual,np.clip(g,lower+1e-8,upper-1e-8),bounds=(lower,upper),max_nfev=150,ftol=1e-10,xtol=1e-10,gtol=1e-10) for g in guesses]
        best = min(fits,key=lambda x:np.linalg.norm(x.fun))
        values = best.x
        if f: values += 2*np.pi*np.round((q[f-1,qids]-values)/(2*np.pi))
        q[f,qids] = values; residual(values)
        fitted[f,li*5:(li+1)*5] = data.site_xpos[ids[leg]].copy()
    # Controlled capacity audit: same anatomy/targets; only ThC yaw, CTr pitch
    # and FTi pitch vary. Four remaining DoFs are fixed at the initial full fit.
    vary=[0,3,5]
    for f in range(len(rows)):
        base=q[0,qids].copy()
        def reduced_res(values):
            base[vary]=values; data.qpos[qids]=base; mujoco.mj_forward(model,data)
            return (data.site_xpos[ids[leg]][1:]-aligned[leg+'_leg'][f,1:]).ravel()
        fit=least_squares(reduced_res,q[f,qids][vary],max_nfev=150)
        reduced_res(fit.x); reduced_q[f,qids]=base
        reduced_fitted[f,li*5:(li+1)*5]=data.site_xpos[ids[leg]].copy()
    print(leg,'registered; scale',scales[leg], flush=True)
target = np.concatenate([aligned[l+'_leg'] for l in legs],axis=1)
errors = np.linalg.norm(fitted-target,axis=2)
# Geometric FTi included angle avoids conflating anatomical and Euler angles.
def included(p):
    a=p[:,1]-p[:,2]; b=p[:,3]-p[:,2]
    return np.degrees(np.arccos(np.clip(np.sum(a*b,axis=1)/np.linalg.norm(a,axis=1)/np.linalg.norm(b,axis=1),-1,1)))
joint_names = [mujoco.mj_id2name(model,mujoco.mjtObj.mjOBJ_JOINT,i) for i in range(model.njnt)]
out = dict(version=1, title='NMF v2 untethered walking recording',
    paper='https://www.nature.com/articles/s41592-024-02497-y', dataset='https://doi.org/10.7910/DVN/3MCEYR',
    specimen=dict(species='Drosophila melanogaster',sex='female',strain='wild-type PR',age='4–5 days after eclosion',
        recording='one 0.3-second straight-walking episode; not a population or speed survey'),
    acquisitionHz=360, annotationHz=120, videoFps=36, frameCount=len(rows), duration=(len(rows)-1)/120,
    sourceFrames=[int(r['frame_idx']) for r in rows],
    sync=dict(method='ordinal pairing of 37 released video frames with 37 CSV rows (29–65)',
        limitation='Original frame timestamps and camera calibration are not included. Encoded playback rate is not the annotation sampling rate.'),
    sourceCoordinateUnits='not declared in CSV; preserved unchanged',
    modelUnits='mm after per-leg registration to the NMF anatomy, not independently measured metric scale',
    legs=legs, markers=markers, jointNames=joint_names, times=[i/120 for i in range(len(rows))],
    rawCoordinates=np.concatenate([raw[l+'_leg'] for l in legs],axis=1).tolist(),
    landmarks=target.tolist(), fittedLandmarks=fitted.tolist(), qpos=q.tolist(),
    reducedQpos=reduced_q.tolist(), reducedLandmarks=reduced_fitted.tolist(),
    ftiAngles={l:included(raw[l+'_leg']).tolist() for l in legs},
    registration=dict(method='SeqIKPy whole-leg scaling (excluding claw), fixed proximal anchor, sequential IK; MuJoCo XML-offset least-squares refinement',
        seqikCommit=subprocess.check_output(['git','-C','work/seqik','rev-parse','HEAD'],text=True).strip(),
        scaleByLeg=scales, scalarCoordinateRmsBeforeRefinementMm=float(np.sqrt(np.mean(np.square(seq_errors)))),
        landmarkRmsMm=float(np.sqrt(np.mean(errors**2))), maximumLandmarkErrorMm=float(errors.max()),
        errorByFrameMm=np.sqrt(np.mean(errors**2,axis=1)).tolist(),
        errorByLegMm={l:float(np.sqrt(np.mean(errors[:,i*5:i*5+5]**2))) for i,l in enumerate(legs)},
        reducedRmsMm=float(np.sqrt(np.mean(np.sum((reduced_fitted-target)**2,axis=2)))),
        reducedAudit='Same NMF geometry with only ThC yaw, CTr pitch and FTi pitch varying; other DOFs fixed at initial full fit. This isolates DOF capacity, not a replay of the old controller.',
        validation='In-sample registration residual only; not held-out biological accuracy'),
    limitations=['No per-keypoint confidence or raw 2D camera annotations supplied',
        'Thorax-centered source data do not preserve world translation, ground height or ground-truth foot slip',
        'No smoothing, mirroring, phase locking, time normalization or loop closure applied to this recording',
        'Joint angles are fitted; muscle activity and neural activity were not measured'],
    sourceFiles=manifest['sourceFiles']+[dict(target='motion.xml',sha256=hashlib.sha256((ROOT/'motion.xml').read_bytes()).hexdigest())])
(ROOT/'recording.json').write_text(json.dumps(out,separators=(',',':'),allow_nan=False)+'\n',encoding='utf-8',newline='\n')
print('Finished:',out['registration'])
