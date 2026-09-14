# V0.4: recorded step shapes in a contacting body

The terrarium now uses the NMF anatomical model from the separate Motion lab, a free thorax, seven active axes per leg, all five tarsal segments, 84 native Hill actuators and six native adhesive pads. **This is an experimental muscle-driven walking bridge, not reconstructed neural motor control.** The 532-cell MANC graph and synapse counts are unchanged. No trained policy, imitation loss or reward-driven optimization enters the control path.

## Implemented precedents

Primary source: [NeuroMechFly v2, Nature Methods (2024)](https://www.nature.com/articles/s41592-024-02497-y), Methods: Stepping pattern, adhesion and locomotion control. Implementation is pinned to [FlyGym cedd204](https://github.com/NeLy-EPFL/flygym/tree/cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b), the source matching the released annotated recording and model. It is Apache-2.0.

| Precedent                  | Source implementation                                                                                                                                     | This project                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anatomical kinematic chain | Source `neuromechfly_seqik_kinorder_ypr.xml`                                                                                                              | Seven active joint axes per leg, mapped by names rather than array-order assumptions. The 24 distal tarsal hinges omitted from the fixed-thorax comparison bench are restored.                                                            |
| Compliant tarsi            | [`flygym/fly.py`](https://github.com/NeLy-EPFL/flygym/blob/cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b/flygym/fly.py)                                        | Source stiffness 7.5 and damping 0.01 on Tarsus2–5. Our numerical armature is 2e-8. These are model parameters, not measured tissue stiffness.                                                                                            |
| Reusable step shapes       | [`PreprogrammedSteps`, `examples/common.py`](https://github.com/NeLy-EPFL/flygym/blob/cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b/flygym/examples/common.py) | Same periodic cubic interpolation, neutral phase π, and angle-amplitude scaling. SciPy polynomial coefficients are exported exactly to browser data, with source hashes.                                                                  |
| Adhesive feet              | `_add_adhesion_actuators` in `fly.py`                                                                                                                     | Native MuJoCo adhesion on Tarsus5, source model gain 40. Commands release during swing and engage in stance. They exert force only through contact, including on obstacles. Pads are distinct from muscles in manifests and observations. |
| Closed-loop stepping       | NMF hybrid controller and paper                                                                                                                           | A precedent for contact-aware control, not a claim of replication. We retain our neural timing hypothesis and ideal angle/velocity recruitment. NMF's stumble/retraction corrections and full hybrid controller are not implemented.      |

The processed source file is `public/motion/source/single_steps_untethered.pkl`, SHA-256 `1e5b28bb6b3f50ac95a04773ea37af28d05e26d03bd90fdba57fa1b3eacfaf8c`. The generator verifies the hash before loading it. The upstream selection processed annotated steps, rejected poor closure, normalized each to 0.135 s, mirrored left/right shapes, forced endpoints to close over the last 10%, and selected combinations by simulated displacement. These operations are **not a raw recording of natural six-leg coordination**. The raw 37-frame comparison remains intact in Motion lab.

LF E2 peaks still clock a shared gait at two neural cycles per stride. LF/LH/RM alternate with RF/RH/LM. Absence of peaks stops phase advancement; a 150 ms ramp returns targets toward the neutral stance. Source stance onsets are 0.051/0.135 for front legs, 0.048/0.135 for middle legs and 0.042/0.135 for hind legs. Coordination, the ramp and the neural-to-stride ratio are hypotheses.

The muscle tracker uses proportional gain 20 and derivative gain 0.08, replacing the fixed-bench-style 50/0.12 gains that caused free-body wobble and contact transients. This was a numerical stability adjustment, **not fitting to physiological forces or task learning**. The 84 antagonist strengths remain 180 µN, signed moment arms 0.05 mm, activation/deactivation 8/25 ms, and tendon excursion range −0.32/+0.32 mm. Source anatomical axes and offsets are preserved. Individual muscle identities, NMJs, force calibration and proprioceptive circuitry remain unresolved. The unchanged anatomical foreleg bench retains real source attachment paths.

## Contact geometry and numerical limits

Every anatomical mesh—legs, thorax, abdomen, head and appendages—now collides with the environment. The old six foot spheres and small thorax ellipsoid are removed. Contact uses each mesh's convex hull; this is conservative geometry, not triangle-level concave contact or measured cuticle compliance. Inter-leg contact is enabled. Same-leg and body-leg self-contact are excluded because source rigid attachment hulls overlap, following the NMF precedent of selected leg self-collision. These exclusions do not remove any body part's environment contact.

The **Contact shapes** button displays the actual compiled hull faces stored in MuJoCo, including environmental solids. It does not draw hand-estimated boxes. Floor support is checked against hull support vertices; a separate test verifies equality with the full visible vertex set under body rotation. MuJoCo's [convex-hull record layout](https://mujoco.readthedocs.io/en/stable/APIreference/APItypes.html#convex-hulls) supplies the overlay geometry.

| Numerical setting | Value / meaning                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Units             | Grams, millimetres, seconds; force in µN. Model mass/inertias and actuator strength are not newly measured physiology.                                                                                          |
| Integration       | Implicit-fast; dt 0.0001 s; 80 iterations; elliptic friction cone. Half-step locomotion control uses 0.00005 s.                                                                                                 |
| Contact reference | `solref = [0.0002, 1]`, `solimp = [0.999, 0.9999, 0.001]`                                                                                                                                                       |
| Friction          | `[1, 0.005, 0.0001]`; assumed substrate model                                                                                                                                                                   |
| Contact margin    | 0.01 mm per geometry; paired margins give a small conservative separation. Initial lowest surface is 0.02 mm above the plane. The overlay shows the base hull, not this numerical margin.                       |
| Acceptance        | Finite upright baseline walking and intervention controls; anatomical/environment penetration less than 0.005 mm in the explicit contact protocols. This is a software tolerance, not a biological calibration. |

[MuJoCo's compliant contact model](https://mujoco.readthedocs.io/en/stable/modeling.html#contact-parameters) does not guarantee mathematically zero penetration for every state. We do not clamp body poses or inject forces to conceal errors. The current contact count and overlap are shown in the UI. All-body environment contact fixes the prior missing collision surfaces; numerical tolerances and conservative margins remain visible.

## The banana and substrate

`scripts/build-banana.py` authors seven visual meshes in Blender: ribbed flesh, unopened skin, stem, blossom tip and three thick peel flaps with pale inner surfaces, yellow outer skin and surface-bound mottling. `assets/banana.blend` is editable source. The GLB explicitly exports Z-up.

The same closed cross-sections generate 94 short convex contact pieces. A single hull around the entire banana would incorrectly fill the open peel; these short segments preserve the gaps. A ray test passes between flesh and flap to the floor, while neighbouring rays hit flesh and flap. Local convex pieces still conservatively fill small concavities. The banana is illustrative miniature scenery, not measured botanical anatomy, and is MIT licensed.

One manifest fixes banana transforms and the floor/wall dimensions for physics and rendering. The visible floor top is exactly z=0. Four walls occupy the same boxes in both systems. Colored low ellipsoids are solid food/repellent/water substrate proxies; there is no fluid simulation. Moving or disabling a patch updates its collision body; a placement intersecting the fly is rejected and rolled back. Odor, reward and energy remain uncalibrated environment readouts.

## Reproduce and inspect

1. Build the original prop: `blender --background --python scripts/build-banana.py`.
2. Derive the separate model and step data: `work/motion-env/Scripts/python.exe scripts/derive-walker.py` (NumPy/SciPy/MuJoCo environment from the motion workflow).
3. Refresh `node scripts/assay-walking.mjs`, then run `npm run verify`.
4. Inspect [the source-hashed assay](../public/data/walking-assay.json). It reports three-second baseline, E1 silencing, passive, bridge-off and half-step controls; one-second floor/side/banana drops and a wall impact are separate stress protocols. Drop penetration is sampled at every solver step; surface support at 50-step intervals. Walking support is sampled every 100 steps. These finite samples do not establish all-state safety or biological validity.

The next scientific task is an identified motor-unit and proprioceptive loop with independent force/contact recordings. Robust obstacle navigation, climbing, self-righting, flight and organ physiology remain open. Walking to a wall and contacting it is not a demonstrated navigation circuit.

## Current numerical results

The three-second baseline ends 12.43 mm from its start; E1 silencing gives 0.164 mm, passive control 0.191 mm, and bridge-off control 0.175 mm. The half-timestep run ends 13.38 mm away. Trajectories differ at wall contact; this is a qualitative locomotion/timestep control, not convergence of a biological trajectory.

The ten-second arena run remains finite and inside the walls, with positive sampled anatomical floor clearance, but **topples at the wall and cannot right itself**. This is an explicit limit of the present coordination/reflex bridge, not a collision failure or successful long-duration walking result. No hidden upright constraint corrects it. The floor-drop protocol records a worst solver overlap of 0.002316 mm (2.32 µm), within the declared 5 µm acceptance tolerance. Other reported stress protocols have zero measured penetration; inspect the artifact for sampling intervals and full values.
