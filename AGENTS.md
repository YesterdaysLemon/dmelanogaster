<!-- al-stack:project:start -->

## Al-stack project

Project: dmelanogaster. Profile: research. Status: active.

Reconstruct Drosophila from anatomy and physiology; a public muscle bench and linked literature atlas.

`al-stack.toml` records this project's setup and dependencies. Work from the checkout selected for the task; other branches/worktrees are optional history. Use `al-stack register .` once when starting work here. Local registration does not change the project's lifecycle.

Project commands:

- dev: `npm run dev`
- test: `npm test`
- build: `npm run build`
- verify: `npm run verify`

Declared tools (verify availability in the intended agent):

- node (cli): `node`.
- npm (cli): `npm`.

Edit project guidance outside this managed section. Use `al-stack configure` for its fields and `al-stack check .` for setup checks. Run the actual project checks for behavioral validation.
<!-- al-stack:project:end -->

## Research purpose and boundaries

Read README.md, docs/research-plan.md and docs/evidence-contract.md before substantive work. Reconstruct Drosophila from observations with explicit hypotheses for missing physiology. No pretrained, RL, imitation or task-reward policy may control the fly. Parameter fitting to biological measurements must retain provenance, uncertainty and independent validation.

The preserved v0 bench remains tethered. V0.2 adds a partial MANC network and experimental six-leg walking bridge. Read `docs/wiring.md` and `docs/environment.md` before extending it. Most recruitment, inter-leg timing and proprioception remain designed hypotheses; walking does not establish reconstructed motor circuitry. Never describe inherited fitted muscle properties as direct measurements, or model units as calibrated force. Preserve the source XML/meshes and their hashes; derive future models in separate versioned files.

## Commands and acceptance

Node 24. `npm ci`; `npm run dev`; `npm run verify` (types, physical/provenance tests, production build). A meaningful physics change requires intervention and passive controls. Frontend changes require actual desktop/mobile browser inspection and error checks. Publication requires a successful CI deployment receipt, matching public/container SHA and live browser verification.

After changing circuit, body or bridge implementation, run `node scripts/assay-walking.mjs` after final formatting to refresh `public/data/walking-assay.json`; its source hashes must match. Keep the original bench's replay format separate from the terrarium's current-state export. Environment reward never updates neural connections.

Use frontend-quality and playwright for interface work; credentials-access for authenticated service access; vps-operations for host/deployment changes. Public hosting uses the existing Deploy Manager and Caddy. Read docs/deployment.md. Keep secrets out of files committed to Git and browser output.

## Ownership

V0.3 Motion lab uses separate NMF v2 anatomy, the original manually annotated 37-frame episode, SeqIKPy fitting and an experimental fixed-thorax muscle tracker. Read `docs/motion.md` before extending it. Do not call its 84 actuators anatomical muscle identities or its replay reconstructed control. Preserve raw data and distinguish registration errors from tracking errors. Refresh `node scripts/assay-motion.mjs` after changes to its engine/model/data. Keep source bytes and upstream licenses intact.

Our UI, integration and research notes are MIT. FlyMimic XML and meshes remain Apache-2.0 with their original notice and pinned manifest. Keep runtime dependency attribution in public/licenses. Follow exact data licenses for any future connectome download.

V0.4 promotes NMF articulation into the free terrarium: 42 active axes, 24 passive distal tarsi, 84 hypothetical Hill antagonists and six native adhesive pads. Read `docs/contact.md`. Every visible anatomical surface has environment contact; the overlay uses compiled convex hull faces. Banana source and collision pieces derive from the same Blender script. Source step processing and designed coordination must remain explicit. Source files shared through manifest `assetPath` must retain their upstream bytes. Do not cache WASM typed-array views across simulation steps: growing WASM memory can detach them.
