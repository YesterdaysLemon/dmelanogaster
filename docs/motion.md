# Motion lab: recorded fly → anatomical fit → muscle response

V0.3 implements an inspectable motion reconstruction bench. The public view at [Motion lab](https://fly.alirezaafshan.com/#motion) pairs source video, 30 colored 3D landmarks and a seven-coordinate-per-leg anatomical model on one frame scrubber. It also runs active and passive muscle assays in browser MuJoCo. **The terrarium's autonomous walking controller has not been upgraded by this bench.**

## Precedents actually used

[Wang-Chen et al., NeuroMechFly v2 (2024)](https://www.nature.com/articles/s41592-024-02497-y), Methods **Stepping pattern** and Extended Data Fig. 2, supplies the experimental precedent. Their prism recording was acquired at 360 Hz, downsampled to 120 Hz, manually annotated, registered by whole-leg scaling and converted to joint angles. The specimen was one wild-type PR female, 4–5 days after eclosion, raised at 25 °C and 50% humidity on a 12-hour light/dark cycle.

The [published dataset](https://doi.org/10.7910/DVN/3MCEYR), version 3.1, is CC0. We retain original bytes for `annotated_3d_walking_kinematics.csv` (datafile 10407643) and `recorded_steps.mp4` (10407644), plus the retrieved dataset metadata. There are 37 annotation rows, source indices 29–65, and 37 encoded video frames. Original non-leg landmarks remain in the CSV but are not fitted here.

The paper's reusable template is a **processed product**: retained steps were normalized to 0.135 seconds, closed by modifying their last 10%, mirrored, combined and selected for simulated displacement. We preserve `single_steps_untethered.pkl` for provenance; it never supplies this bench's targets. The main comparison uses the original episode, preserving asymmetry and endpoints without smoothing, phase locking or cycle closure.

[SeqIKPy, Özdil et al. (2026)](https://doi.org/10.21105/joss.08557) supplies the **actual implementation** of whole-leg registration and sequential inverse kinematics. We call `AlignPose`, `KinematicChainSeq` and `LegInvKinSeq`, rather than inventing another IK system. The [alignment documentation](https://nely-epfl.github.io/sequential-inverse-kinematics/methodology_alignment.html) and locomotion notebook specify the registration and seed conventions.

The [current official NMF replay tutorial](https://neuromechfly.org/tutorials/2_replaying_experimental_recordings/) separately shows estimated landmarks, fitted landmarks and position-actuator replay. Its newer Spotlight/PoseForge recording is not our data source. We adopt the inspectable comparison and residuals, while using manual annotations and our explicit muscle experiment. Newer FlyGym joint sign conventions must not be mixed with the pinned 2024 XML.

| Source | Pin | Use |
| --- | --- | --- |
| FlyGym / NMF anatomy | `cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b` (`resubmission-20240501`) | Source XML, 39 mesh files, processed template; Apache-2.0 |
| NMF v2 paper code | `1597277deff6b97faf6e021f05afd12ff39fa23e` | Inspected `step_data/stepping_illustration.ipynb`; no notebook export copied |
| SeqIKPy 1.1.0 | `f7f1dc9b09ce89c4f54b2005722d62f887623a7b` | Executed registration/IK; locomotion-example seeds; Apache-2.0 |
| MuJoCo Python | `3.3.7` | Offline forward kinematics during fitting |
| MuJoCo WASM | `3.13.0` | Browser and headless muscle dynamics |

## Coordinate and timing limits

Source coordinate units are not declared in the CSV. Its thorax is constant at `(0,0,200)`; these are body-centered coordinates. We preserve them unchanged, then register each whole leg to the model. Reported millimetres are **registered model coordinates**, not an independently calibrated measurement of the animal's absolute scale. World translation, absolute body height and actual foot slip cannot be validated from this CSV alone.

The shared scrubber uses **ordinal pairing** of the 37 released video frames and 37 rows. Displayed times use the nominal 120 Hz annotation rate reported in Methods: 0–0.300 seconds. The MP4 itself is encoded at 36 fps and has a burned-in “0.1×” caption; neither supplies original acquisition timestamps. Exact synchronization has not been independently established. Playback stops at the last sample. It does not interpolate a fabricated return step.

The release does not provide original 2D annotations, confidence scores or projection matrices. Accordingly the “mocap suit” is a separate 3D view. Its overlay on the model is a registration comparison; **there is no claimed pixel-perfect overlay on the video**. Adding a generative suit to source pixels would not supply missing measurements.

## Anatomical registration

`scripts/vendor-motion.py` preserves the original NMF XML and meshes. A separate `motion.xml` retains source geometry, offsets and seven active coordinates per leg, fixes the thorax and other appendages, and removes contacts. Source distal tarsi 2–5 are held fixed. The claw landmark is placed 0.09 mm beyond the Tarsus5 origin; this is a registration assumption, not a measured attachment.

`scripts/prepare-motion.py` extracts five points per leg (ThC, CTr, FTi, TiTa, claw). SeqIKPy scales the whole leg using the three proximal segment lengths, excluding the claw, and fixes its proximal anchor to the model. It then fits the sequential chain. Our additional least-squares refinement accounts for actual XML offsets that differ from ideal axial links. It minimizes squared Cartesian residuals of the four distal markers; proximal registration is already fixed. Seeds use SeqIKPy's locomotion example and the previous fitted frame. The lower-residual solution is selected and equivalent angles are unwrapped across frames. Broad ±π bounds, with tarsus pitch restricted to [−π,0], are computational assumptions rather than measured anatomical limits.

The three-coordinate capacity audit uses **the same geometry and registered targets**, varying ThC yaw, CTr pitch and FTi pitch while holding the other four coordinates at the first full fit. It is not a replay of the old terrarium controller. Its larger residual shows that this reduction loses explanatory capacity on this recording; it does not isolate the cause of every visual defect in the old fly.

`recording.json` retains raw, registered, full-fit and reduced-fit positions, joint angles, per-frame/per-leg errors, geometric femur–tibia included angles and provenance. No neural activity or muscle activation was measured. The largest fitted coordinate change is 71.46° in left-middle femur roll between source rows 61 and 62. Such abrupt changes can reflect annotation noise or IK ambiguity; they are not measured physiological velocities. Branch identity, annotation uncertainty and held-out accuracy remain unresolved.

## Experimental muscle bench

The pose modes set joint coordinates for geometric replay. The muscle modes instead start at the first fitted pose and integrate native MuJoCo dynamics for the episode. The browser computes these trials once and lets the scrubber inspect their sampled results. During integration, only muscle excitation is commanded: no joint coordinates or external body/joint forces are injected.

This new bench does **not** inherit FlyMimic's identified anatomical muscle paths. Each of the 42 joint coordinates receives a hypothetical opposing pair of Hill actuators, for 84 actuators total. These are mechanical placeholders, not 84 verified fly muscle identities. The original 15-unit FlyMimic foreleg bench remains available separately.

| Assumption | Value / interpretation |
| --- | --- |
| Body frame | Thorax fixed at model z = 1.5 mm; no ground contact or adhesion |
| Units | mm, g, s imply µN and µN·mm; inherited masses are model parameters |
| Gravity / timestep | −9810 mm/s²; 0.0001 s, implicitfast |
| Maximum force / moment arm | 180 µN per actuator / constant 0.05 mm; uncalibrated hypotheses |
| Activation/deactivation | 8 / 25 ms; uncalibrated hypotheses |
| Tendon / normalized muscle range | [−0.32, 0.32] mm / [0.5, 1.5] |
| Hill limits | lmin 0.3, lmax 1.7, vmax 10, fpmax 0.0001; native remaining defaults |
| Joint damping / armature | 0.02 g·mm²/s, 0.000002 g·mm²; numerical assumptions |
| Control law | `τ = 50(q_target − q) + 0.12(qdot_target − qdot)` |
| Excitation | `clip(sign × τ / 9, 0, 0.95)` per antagonist; 9 = force × moment arm |

Targets are linearly resampled from fitted angles. The law is an explicit PD tracking controller, with hand-selected gains and strength; it is not reconstructed proprioception or an inferred motor circuit. No RL, imitation policy, pose-estimator model weights or task-reward learning are executed. Passive trials have zero excitation and the identical initial pose, gravity and damping. Nonzero muscle error is expected, including lag and saturation.

## Results and acceptance

| Metric, one episode | Result |
| --- | --- |
| Full seven-coordinate registration RMS | 0.063897 mm |
| Reduced three-coordinate registration RMS | 0.192453 mm |
| Worst full-fit landmark residual | 0.202459 mm |
| Active muscle tracking RMS to fitted landmarks | 0.150712 mm |
| Passive RMS to fitted landmarks | 0.971074 mm |
| Active generalized-coordinate RMS | 7.783878° |
| Half-timestep active landmark RMS | 0.150273 mm |

RMS is the root mean squared 3D point distance over 37 × 30 samples, including the registered anchors. The fitting objective omits the fixed anchors; the headline RMS includes them. Muscle results compare against **fitted** landmarks, not raw measurements. Samples use the closest integration step (within half a timestep). These are in-sample geometry and software-mechanics results, not biological validation or a muscle-force inference. Greater strength, damping or different gains could improve tracking without improving biological fidelity.

`npm run verify` checks source/assay hashes, untouched source coordinates, coordinate mapping across offline and WASM engines, full/reduced residuals, muscle intervention, passive control and half-timestep stability. Browser acceptance covers actual video decoding and seeking, all comparison modes, per-leg plots, playback ending and mobile layout. The server supports MP4 byte ranges for seeking.

## Reproduction

Node 24 runs the committed data without Python. `node scripts/assay-motion.mjs` regenerates `public/motion/assay.json`; run it after final formatting of `src/motion.ts`.

To rebuild poses, use Python 3.13 in an isolated environment and the pinned [requirements](../scripts/motion-requirements.txt). Clone `NeLy-EPFL/flygym` into `work/flygym-paper` and check out its pin above; clone `NeLy-EPFL/sequential-inverse-kinematics` into `work/seqik` and check out its pin. Install the latter local package into the environment. Download datafiles 10407643 and 10407644 to `work/annotated_3d_walking_kinematics.csv` and `work/recorded_steps.mp4`. Copy the committed metadata snapshot to `work/nmf2-dataverse.json` to preserve dataset-version attribution. Then run `python scripts/vendor-motion.py`, `python scripts/prepare-motion.py`, and the Node assay. Scripts verify source commit pins; the manifest records hashes. Original XML is read from Git blobs to avoid Windows newline conversion.

## Next experiments

1. Add longer, independently recorded straight walks and turns, with calibrated cameras, timing, support surface and landmark uncertainty. Evaluate held-out geometry and phase relationships before generating a reusable cycle.
2. Replace the hypothetical foreleg pair with documented muscle paths and motor-unit physiology. Reproduce force/angle and perturbation responses before fitting recruitment to walking.
3. Add validated contacts, passive tarsal mechanics and adhesion, then test a free body. Compare foot contact, body motion and slip, not only pose error.
4. Make candidate sensory and motor circuits reproduce those independent observations **without the recorded target controller**. Use lesions and unexpected perturbations to distinguish causal coordination from replay.

The point is to make measured movement a constraint and a falsification tool. A convincing walk animation alone cannot identify the circuitry that produced it.
