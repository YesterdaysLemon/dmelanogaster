# Attribution

The v0.2 `walking.xml` is a separately identified, substantially modified derivation of FlyMimic geometry. It introduces reduced joints, assumed inertial scaling, experimental muscle groups and collision proxies. It is not the original anatomical muscle reconstruction. The original `fly.xml` remains unchanged.

`public/data/manc-walking.json` contains an attributed factual subset of the CC-BY MANC dataset, produced by HHMI Janelia FlyEM, Cambridge Connectomics and Google Research, with motor annotations from the relevant research teams. The extraction source is the data accompanying Pugliese et al., pinned at `faee4b06869855ae0164cbf217fb6ec28ef3521b`; hashes and source URLs are retained in the JSON. Cite Pugliese et al. (doi:10.1101/2025.09.12.675944), Takemura et al., Marin et al., and Cheong et al. (eLife 96084) when using these records. The source matrix's predicted transmitter signs are distinguished from observed counts. Selection and modelling changes are described in `docs/wiring.md`. No upstream simulation software is copied. See the [provider's data-license statement](https://www.janelia.org/project-team/flyem/manc-connectome).

The unchanged XML and STL meshes in `public/model` come from [FlyMimic](https://github.com/gizemozd/FlyMimic), commit `9ea1131626cd76f7203b74076ef8f0e9cab30bef`, distributed under Apache-2.0. Its license is included at `public/model/LICENSE-FlyMimic.txt`. The source XML retains its copyright notice. The machine-readable manifest records every original path and SHA-256 hash.

Please cite Özdil and colleagues, _Musculoskeletal Simulation of Drosophila Limb Biomechanics_, ICLR 2026, when using this model in research. [Author project page](https://gizemozd.github.io/fly_mimic/).

This project uses the muscle model and anatomical assets, not FlyMimic's learned imitation policies. Recolouring, translucent cuticle, tendon overlays, camera choices, grid and tether line are display choices in our renderer; the physical source XML is unchanged.

Runtime dependencies include [MuJoCo](https://github.com/google-deepmind/mujoco) (Apache-2.0) and [Three.js](https://github.com/mrdoob/three.js) (MIT). Their package license files are retained in the dependency distribution; production license copies are provided in `/licenses/`. The Google Fonts stylesheet serves DM Sans and Libre Caslon Display under their font licenses.
