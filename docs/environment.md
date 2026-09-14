# Terrarium environment API

Version 3 changes the free-body state layout to 73 generalized positions and 72 velocities (42 active and 24 passive leg axes plus the root). `export().schema` is 3; the original muscle-bench replay format is unchanged.

The browser exposes `window.flyLab` after loading. It is a deterministic environment interface for stimulus experiments. No training loop, learned policy, reward optimizer or external model controls the fly.

```js
flyLab.reset(); // resets animal and trace, preserves selected interventions/stimuli
flyLab.setStimulus("yeast", { x: 4, y: 1.5, strength: 1 });
flyLab.setStimulus("geosmin", { enabled: false });
const observation = flyLab.step(1000); // pauses autoplay; 0.1 simulated seconds at default dt
flyLab.observe();
flyLab.export(); // state, recent trace, model and complete wiring provenance
```

`step` accepts 1–5,000 integer physics steps. Stimulus positions clamp to ±10 mm and strengths to [0,5]; non-finite values are rejected. Available sources are `yeast`, `geosmin`, `water`. Moving or enabling a patch updates its physical mocap body too. Placements that intersect the fly are rejected and rolled back. New source placement does not change anatomical graph weights. The interface is suitable as a starting point for an RL-style environment wrapper, but it is **not yet a Gymnasium implementation**, and our fly contains no trained policy.

Observations include body pose/velocity, model neural rates, muscle activation, actual tarsal solver contacts, six adhesive-pad commands, anatomical floor/wall clearance and contact penetration, physical contact count, odor and aversion at two ideal antenna locations, an energy proxy, food-zone occupancy, cumulative travel, neural cycles, current intervention flags and silenced cell IDs. `up` is the body vertical-axis alignment with world vertical.

Each enabled odor source contributes `strength * exp(-distance / 2 mm)`. Concentrations are dimensionless and uncalibrated. They are not ppm, receptor occupancy, diffusion physics, turbulent plumes or biochemical concentrations. Reward is `food occupancy - 0.1 * sum(antenna aversion)`; it is an environment readout only and never updates any neural connection. Energy changes at +0.04/s during occupancy and −0.001/s otherwise; this is not digestion or metabolism.

The experimental steering bridge compares food and repellent on the two antenna proxies, then alters left/right stride amplitude. Its gains and biological intermediates are unknown. The body and feet move through native muscle-driven physics. Every anatomical mesh has environment collision. Floor, walls, the segmented banana and low ellipsoidal substrate patches have collision geometry aligned with rendering. These patches are solid proxies, not simulated fluids. The banana is an illustrative miniature, not measured botanical anatomy. See [contact methods](contact.md).

Export captures the current state and recent trace; it does not promise replay of an arbitrary interactive session because a complete timestamped intervention log is not recorded yet. Use fixed script protocols and the assay runner for reproducible comparisons. The preserved muscle bench retains its separate replayable pulse-trial format.
