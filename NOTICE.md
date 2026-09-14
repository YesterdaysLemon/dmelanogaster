# Attribution

The unchanged XML and STL meshes in `public/model` come from [FlyMimic](https://github.com/gizemozd/FlyMimic), commit `9ea1131626cd76f7203b74076ef8f0e9cab30bef`, distributed under Apache-2.0. Its license is included at `public/model/LICENSE-FlyMimic.txt`. The source XML retains its copyright notice. The machine-readable manifest records every original path and SHA-256 hash.

Please cite Özdil and colleagues, *Musculoskeletal Simulation of Drosophila Limb Biomechanics*, ICLR 2026, when using this model in research. [Author project page](https://gizemozd.github.io/fly_mimic/).

This project uses the muscle model and anatomical assets, not FlyMimic's learned imitation policies. Recolouring, translucent cuticle, tendon overlays, camera choices, grid and tether line are display choices in our renderer; the physical source XML is unchanged.

Runtime dependencies include [MuJoCo](https://github.com/google-deepmind/mujoco) (Apache-2.0) and [Three.js](https://github.com/mrdoob/three.js) (MIT). Their package license files are retained in the dependency distribution; production license copies are provided in `/licenses/`. The Google Fonts stylesheet serves DM Sans and Libre Caslon Display under their font licenses.
