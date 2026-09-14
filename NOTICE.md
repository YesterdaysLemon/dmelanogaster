# Attribution

The v0.2 `walking.xml` is a separately identified, substantially modified derivation of FlyMimic geometry. It introduces reduced joints, assumed inertial scaling, experimental muscle groups and collision proxies. It is not the original anatomical muscle reconstruction. The original `fly.xml` remains unchanged.

`public/data/manc-walking.json` contains an attributed factual subset of the CC-BY MANC dataset, produced by HHMI Janelia FlyEM, Cambridge Connectomics and Google Research, with motor annotations from the relevant research teams. The extraction source is the data accompanying Pugliese et al., pinned at `faee4b06869855ae0164cbf217fb6ec28ef3521b`; hashes and source URLs are retained in the JSON. Cite Pugliese et al. (doi:10.1101/2025.09.12.675944), Takemura et al., Marin et al., and Cheong et al. (eLife 96084) when using these records. The source matrix's predicted transmitter signs are distinguished from observed counts. Selection and modelling changes are described in `docs/wiring.md`. No upstream simulation software is copied. See the [provider's data-license statement](https://www.janelia.org/project-team/flyem/manc-connectome).

The unchanged XML and STL meshes in `public/model` come from [FlyMimic](https://github.com/gizemozd/FlyMimic), commit `9ea1131626cd76f7203b74076ef8f0e9cab30bef`, distributed under Apache-2.0. Its license is included at `public/model/LICENSE-FlyMimic.txt`. The source XML retains its copyright notice. The machine-readable manifest records every original path and SHA-256 hash.

Please cite Özdil and colleagues, _Musculoskeletal Simulation of Drosophila Limb Biomechanics_, ICLR 2026, when using this model in research. [Author project page](https://gizemozd.github.io/fly_mimic/).

This project uses the muscle model and anatomical assets, not FlyMimic's learned imitation policies. Recolouring, translucent cuticle, tendon overlays, camera choices, grid and tether line are display choices in our renderer; the physical source XML is unchanged.

Runtime dependencies include [MuJoCo](https://github.com/google-deepmind/mujoco) (Apache-2.0) and [Three.js](https://github.com/mrdoob/three.js) (MIT). Their package license files are retained in the dependency distribution; production license copies are provided in `/licenses/`. The Google Fonts stylesheet serves DM Sans and Libre Caslon Display under their font licenses.

## NeuroMechFly v2 motion lab

`public/motion/meshes` and `source/neuromechfly.xml` retain the NMF / FlyGym authors' original assets from commit `cedd204e0c3bc70bab8ccdf1d0520f2b77b2619b`. `source/single_steps_untethered.pkl` is retained only as a processed-template reference. They are Apache-2.0, with the license at `public/motion/source/Apache-2.0.txt`. `motion.xml` is a modified, fixed-thorax derivation with hypothetical antagonistic actuators and no ground contact. The manifest identifies modifications and hashes. Cite Wang-Chen et al., *NeuroMechFly v2: simulating embodied sensorimotor control in adult Drosophila*, Nature Methods (2024), doi:10.1038/s41592-024-02497-y.

`source/annotations.csv` and `source/recorded_steps.mp4` are unchanged original files from Harvard Dataverse doi:10.7910/DVN/3MCEYR, release 3.1, CC0 1.0. The retrieved metadata and datafile URLs accompany the manifest. The derived `recording.json` adds registration, IK fits and residuals; it must not be mistaken for raw measurements.

The offline fitting pipeline uses SeqIKPy 1.1.0, commit `f7f1dc9b09ce89c4f54b2005722d62f887623a7b`, Apache-2.0; its locomotion notebook supplies initial IK seeds. License: `public/licenses/SeqIKPy.txt`. Cite Özdil et al., *SeqIKPy: a Python package for inverse kinematics in insects*, JOSS 11(117), 8557 (2026), doi:10.21105/joss.08557. Our additional XML-offset refinement, comparisons, UI and experimental tracking controller are separate project work. No upstream learned behavioural controller is included.
