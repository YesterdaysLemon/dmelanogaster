# Reconstruction program

## Purpose

Build an anatomically and physiologically constrained adult fly whose actions arise through explicit sensory, neural, neuromuscular and mechanical processes. The eventual public 3D terrarium should make those processes inspectable. Muscle-group and organ-level fidelity is the minimum body target; cellular detail outside the nervous system is added only when a causal mechanism requires it.

## Current frontier

Implemented: unmodified FlyMimic foreleg XML/meshes, real browser MuJoCo dynamics, direct excitation bench, anatomical tendon overlays, trial export, a source atlas and CI checks. No simulated neuronal cells or neural connections are wired to the muscles yet.

The body is a composite modelling reference, not a single fully observed animal. Dataset and sex choices for the CNS remain open. Do not silently combine MaleCNS, FANC/BANC and different anatomical specimens as one measured individual.

## First falsifiable bridge

Target the front-leg femur–tibia system. Begin with force, timing and recruitment measurements in [Azevedo et al. 2020](https://elifesciences.org/articles/56754), and identify the corresponding peripheral and connectomic evidence. Do not retrofit the pooled FlyMimic flexor with an arbitrary list of equally weighted neurons.

Deliver an evidence table before equations: identity, innervated fibres, spike protocol, force trace, leg configuration, temperature and uncertainty. Decide which unit-specific mechanical states are required. Fit only parameters not directly measured, and reserve an independent perturbation or input condition for validation.

Then add the smallest supported proprioceptive loop, using position/movement/vibration distinctions and local connectivity from [Lee et al. 2025](https://www.nature.com/articles/s41467-025-59302-3). Joint angle from MuJoCo must pass through a sensory model; it is not itself sensory-neuron activity.

## Mechanical prerequisites

- The source geometry has millimetre-scale coordinates and gravity magnitude 9801. Upstream masses/force conventions require a dimensional audit. Expose raw source force until this is resolved.
- Source activation/deactivation constants are 0.1/0.4 ms. Preserve them for reproducibility, but do not present them as measured muscle calcium kinetics.
- Calibrate the femur–tibia generalized coordinate against the anatomical angle convention and sign. Verify moment arms over posture.
- Test co-contraction, passive stiffness, contact and force–length/velocity behaviour. Distinguish prescribed joint properties from muscle-dependent impedance.
- Track every change from the source model in a versioned derivation manifest, alongside the unchanged original.

## Expansion criteria

Multiple validated local loops precede walking. Feeding requires explicit mouthpart mechanics, sensory input and an internal-state model. Flight requires separate synchronous steering and asynchronous power-muscle treatment, stretch activation, thoracic deformation, haltere feedback and aerodynamics. A wingbeat animation is not a substitute.

Success is an independently supported intervention response whose failure is informative. It is not how convincingly a fly-shaped object performs a task.
