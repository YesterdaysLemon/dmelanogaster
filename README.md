# dmelanogaster

An open reconstruction of **Drosophila melanogaster**, from documented anatomy and physiology toward an embodied animal in a 3D terrarium.

**Public laboratory:** https://fly.alirezaafshan.com

The telos: behaviour should emerge from an inspectable chain of sensory organs, neural circuits, motor units, muscles and mechanics. There is no RL or imitation policy in the control path. Parameters may be fitted to fly measurements, with the fit, uncertainty and independent validation made explicit.

## v0.4: anatomy in the terrarium

[**Open the terrarium**](https://fly.alirezaafshan.com/#terrarium). NeuroMechFly anatomy now walks as a free body: 42 active leg axes, 84 experimental Hill antagonists, 24 compliant distal tarsal joints and six native adhesive pads. The existing neural circuit clocks the authors’ processed step shapes. No learned policy controls the animal.

Every visible body surface has environment collision. **Contact shapes** displays the actual compiled convex hulls. The visible floor and walls match physics; an original Blender banana has thick open peel flaps and 94 short collision pieces. Its source `.blend`, generation script and geometry hashes are included. Food/repellent/water substrate patches move physically with their controls.

The processed cycle includes source smoothing, mirroring and closure; tripod timing and ideal feedback remain hypotheses. Contact is numerical and compliant, with explicit exclusions at overlapping anatomical attachments. Read [methods, exact precedents and quantitative limitations](docs/contact.md), the [environment API](docs/environment.md), and the [source-hashed intervention/contact assay](public/data/walking-assay.json).

## Preserved v0.3 motion comparison

[**Open Motion lab**](https://fly.alirezaafshan.com/#motion). The original NeuroMechFly v2 walking video, its manually annotated 3D landmarks and the anatomical model share a 37-frame scrubber. SeqIKPy fits seven joint coordinates per leg. Switch to the same-body three-coordinate audit, an experimental Hill-muscle tracker or its passive control. Per-leg plots separate measured geometry, fitted poses and simulated response.

Seven coordinates fit this episode at 0.064 mm landmark RMS, versus 0.192 mm for the reduced fit. Muscles track the fitted targets at 0.151 mm RMS; zero excitation gives 0.971 mm. These are in-sample registration and tethered mechanics results. The tracker supplies recorded targets, its 84 actuators are hypothetical, and the original video/CSV pairing has incomplete timing/calibration metadata. It does not establish reconstructed neural control. V0.4 separately uses the published processed template in the terrarium. See [sources, methods, limits and reproduction](docs/motion.md).

## Neural experiment

A 532-cell, 10,279-edge MANC graph slice supplies activity. The designed bridge still closes missing coordination, proprioception and NMJ pathways. Disable the bridge to expose limited pooled-motor recruitment; silence IN17A001 or make muscles/pads passive for causal controls. The Wiring and Literature tabs separate observations, inferred signs and hypotheses. Numerical controls do not establish physiological validity.

## Preserved muscle bench

The browser loads MuJoCo 3.13.0 and the original FlyMimic tethered-left-foreleg musculoskeletal model. Fifteen muscle–tendon actuators act through the source attachment paths. Select a muscle, apply a 50 ms excitation pulse, inspect motion and activation, switch to translucent anatomy, and export the trial with its source hashes and control events.

The original bench's thorax is fixed and its source attachment paths are unchanged. Its muscle properties are inherited fits; force scaling and anatomical angle conventions need independent audit. The separate terrarium uses a separate NMF anatomical body with explicitly hypothetical muscles. Neither mode implements flight or organ physiology. Wings are visual anatomy only.

## Run and check

Use Node 24 and npm.

```sh
npm ci
npm run dev
npm run verify
```

`verify` runs type checking, headless WASM mechanical assays and the production build. `npm run build` emits `dist/` and exact Git attribution in `build.json`. `node server.mjs` serves the built site on port 8080. `npm run preview` offers a Vite preview.

Checks cover source hashes, all 15 bench pulses, antagonists, reset, timestep comparisons, neural motif lesions, physical locomotion controls and environment stimuli. Run `node scripts/assay-motion.mjs` for the recorded-motion assay and `node scripts/assay-walking.mjs` to regenerate the source-hashed terrarium assay. These establish software/mechanical checks, not biological validation.

Replay an exported browser trial with `node scripts/replay-trial.mjs /path/to/dmelanogaster-trial.json`. The replay compares final joint coordinates with the exported result; matching requires the same model, engine version and timestep.

## Research next

1. Audit units, joint axes, moment arms and the provenance of fitted muscle parameters. Reproduce source mechanical assays.
2. Extract identified front-leg motor-unit measurements and trace neuron-to-fibre identity. A pooled flexor actuator cannot stand in for fast, intermediate and slow units.
3. Reconstruct a small proprioceptive loop with an independent perturbation assay and a disconnected-loop control.
4. Expand across legs and organ systems only after subsystem validation. Build a separate thorax/flight-muscle bench before attempting free flight.

See [the research plan](docs/research-plan.md), [evidence contract](docs/evidence-contract.md), and [deployment guide](docs/deployment.md).

## Sources and licenses

Our application is MIT licensed. Anatomical model assets retain Apache-2.0 and full attribution: [NOTICE](NOTICE.md). `public/model/manifest.json` pins all original asset paths and SHA-256 hashes. Regenerate from the pinned upstream checkout with `node scripts/vendor-model.mjs /path/to/FlyMimic` and review any change before committing.

The source model was built by [FlyMimic](https://gizemozd.github.io/fly_mimic/). We do not claim authorship of its anatomy or muscle reconstruction. This project adds an inspectable, controller-free browser bench and a research program for the missing biological bridge.
