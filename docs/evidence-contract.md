# Evidence contract

Each future biological component must have a stable ID, organism/sex/stage/specimen context, dataset release, source URL/DOI, exact figure/table/supplement reference, extraction method, units, uncertainty and implementation reference.

Use separate states: **observed**, **inferred/fitted**, **hypothesized**, **unimplemented**. Software assay results are a separate validation axis; passing one never promotes a fitted parameter to an observation. Preserve disagreement and missingness instead of replacing them with an unlabelled default.

For connections record pre/post identity, synapse type, count or area, specimen and mapping confidence. A synapse count is not automatically a conductance. Inferred neurotransmitter, receptor, kinetics and neuromodulation need their own evidence. No equalization, renormalization or recruitment heuristic may silently change observed relative inputs.

For the motor bridge record motor neuron → axon → NMJ → muscle fibres/unit → tendon/attachment → joint moment arm, with a source at every join. Preserve motor-unit distinctions before aggregating them for computational convenience. A convenient actuator identifier is not a verified neuron ID.

For muscles distinguish excitation, activation, voltage, calcium concentration, tension and shortening. Proxy variables must be named as proxies. Include activation-dependent stiffness or explicitly record its absence. Check co-contraction as well as net torque.

For fitted parameters retain the fitting data, objective, bounds, uncertainty and held-out data. No external behavioural policy supplies missing control. Validation should include interventions and competing explanations, not just a plausible trajectory.

The v0 atlas is a seed reading ledger. Figure-level extraction is not yet complete. The FlyMimic model manifest provides byte-level provenance, not proof that every source-model parameter is a direct observation.
