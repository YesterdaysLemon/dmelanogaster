# dmelanogaster

An open reconstruction of **Drosophila melanogaster**, from documented anatomy and physiology toward an embodied animal in a 3D terrarium.

**Public laboratory:** https://fly.alirezaafshan.com

The telos: behaviour should emerge from an inspectable chain of sensory organs, neural circuits, motor units, muscles and mechanics. There is no RL or imitation policy in the control path. Parameters may be fitted to fly measurements, with the fit, uncertainty and independent validation made explicit.

## v0: a real muscle bench

The browser loads MuJoCo 3.13.0 and the original FlyMimic tethered-left-foreleg musculoskeletal model. Fifteen muscle–tendon actuators act through the source attachment paths. Select a muscle, apply a 50 ms excitation pulse, inspect motion and activation, switch to translucent anatomy, and export the trial with its source hashes and control events.

The **Literature** tab links eight starting sources to implementation choices and open questions. **Research** records the scope and next experiments.

This is a mechanical substrate, **not a completed fly simulation**. The thorax is fixed; other legs are passive or constrained. There is no reconstructed motor circuitry, sensory feedback, flight system or organ physiology yet. Visible wings are contextual anatomy. Muscle properties are inherited source-model fits; force scaling and anatomical angle conventions need an independent audit. The UI labels force as signed model units and activation as a normalized state.

## Run and check

Use Node 24 and npm.

```sh
npm ci
npm run dev
npm run verify
```

`verify` runs type checking, headless WASM mechanical assays and the production build. `npm run build` emits `dist/` and exact Git attribution in `build.json`. `node server.mjs` serves the built site on port 8080. `npm run preview` offers a Vite preview.

The physics checks verify source hashes, tendon-site resolution, finite responses to all 15 muscle pulses, opposing antagonist deviations from a passive control, deterministic reset, and a timestep comparison. These establish software/mechanical checks, not biological validation.

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
