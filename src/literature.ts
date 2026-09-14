export type EvidenceState =
  "Anatomy" | "Physiology" | "Connectomics" | "Modelling";
export interface Paper {
  id: string;
  year: string;
  type: EvidenceState;
  title: string;
  authors: string;
  url: string;
  claim: string;
  use: string;
  limit: string;
  next: string;
  status: string;
}
export const papers: Paper[] = [
  {
    id: "flymimic",
    year: "2026",
    type: "Modelling",
    title: "Musculoskeletal Simulation of Drosophila Limb Biomechanics",
    authors: "Özdil et al. · ICLR",
    url: "https://gizemozd.github.io/fly_mimic/",
    claim:
      "X-ray anatomy informs attachment sites and muscle paths. The model represents 12 of 19 foreleg muscle groups with 15 muscle–tendon units.",
    use: "The v0 bench vendors the original tethered foreleg XML and its anatomy meshes. MuJoCo computes activation, tendon force and joint motion.",
    limit:
      "The Hill-model parameters were fitted to behaviour. They are not a full set of independently measured muscle properties. The paper’s imitation-learning policies are not part of this project.",
    next: "Audit force units, joint conventions, parameter fits and exact attachment-site evidence before coupling neurons.",
    status: "Implemented · mechanical substrate",
  },
  {
    id: "motor-units",
    year: "2020",
    type: "Physiology",
    title: "A size principle for recruitment of Drosophila leg motor neurons",
    authors: "Azevedo et al. · eLife 9:e56754",
    url: "https://elifesciences.org/articles/56754",
    claim:
      "Identified tibia-flexor motor neurons differ in force production, recruitment and proprioceptive feedback. Fast, intermediate and slow units are experimentally distinguishable.",
    use: "Defines the first neural-to-muscle reconstruction target: identified front-leg flexor motor units, including their distinct force responses.",
    limit:
      "One pooled flexor actuator cannot represent these distinct motor units. A recruitment rule alone does not reconstruct the circuit that produces recruitment.",
    next: "Extract spike, force, latency and joint-position measurements; split the pooled actuator only where innervation and anatomy support it.",
    status: "Planned · first bridge assay",
  },
  {
    id: "fanc",
    year: "2024",
    type: "Connectomics",
    title:
      "Connectomic reconstruction of a female Drosophila ventral nerve cord",
    authors: "Azevedo et al. · Nature",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11348827/",
    claim:
      "The female adult nerve cord reconstruction provides identified motor neurons and premotor connectivity, with peripheral target assignments for many motor neurons.",
    use: "Candidate source for tracing local front-leg circuits and motor-neuron identity to peripheral muscles.",
    limit:
      "Synapse counts do not directly supply conductance, kinetics, sign at every target or a complete peripheral nervous system.",
    next: "Record exact neuron IDs, dataset version, muscle-target evidence and uncertain identity matches in a machine-readable bridge.",
    status: "Planned · identity audit",
  },
  {
    id: "proprioception",
    year: "2025",
    type: "Physiology",
    title:
      "Divergent neural circuits for proprioceptive and exteroceptive sensing of the Drosophila leg",
    authors: "Lee et al. · Nature Communications",
    url: "https://www.nature.com/articles/s41467-025-59302-3",
    claim:
      "Femoral chordotonal organ pathways distinguish aspects of joint position, movement and vibration, with different downstream connectivity.",
    use: "Constrains how simulated leg mechanics should become sensory signals and re-enter the nerve cord.",
    limit:
      "Reading a joint angle from the physics engine is not yet a sensory-neuron model. Receptor dynamics and tuning need explicit evidence.",
    next: "Reconstruct the smallest supported proprioceptive loop and compare responses to controlled joint displacement.",
    status: "Planned · feedback",
  },
  {
    id: "malecns",
    year: "2026",
    type: "Connectomics",
    title: "Male adult Drosophila central nervous system connectome",
    authors: "Janelia · MaleCNS v1.0",
    url: "https://male-cns.janelia.org/",
    claim:
      "An integrated central brain and ventral nerve cord dataset links brain-scale pathways to local motor circuitry.",
    use: "A candidate whole-CNS backbone after a local neuromuscular loop works and dataset identity is fixed.",
    limit:
      "Central connectivity is not the full animal. Combining a male CNS with a female anatomical model requires explicit cross-specimen and sex assumptions.",
    next: "Choose the reference animal and dataset; preserve specimen identity and release-level provenance.",
    status: "Candidate · dataset choice pending",
  },
  {
    id: "banc",
    year: "2026",
    type: "Connectomics",
    title: "Distributed control circuits across a brain-and-cord connectome",
    authors: "Nature · doi:10.1038/s41586-026-10735-w",
    url: "https://pubmed.ncbi.nlm.nih.gov/42259917/",
    claim:
      "The brain-and-cord reconstruction offers an integrated route to studying control across the female central nervous system.",
    use: "A second candidate CNS backbone; compare coverage and identity compatibility with the chosen body and local motor circuit.",
    limit:
      "A new complete structural graph does not eliminate uncertainty in physiology, peripheral mapping or individual variation.",
    next: "Compare data access, motor annotations and peripheral identity evidence with FANC and MaleCNS.",
    status: "Candidate · source audit pending",
  },
  {
    id: "flybody",
    year: "2025",
    type: "Modelling",
    title: "Whole-body physics simulation of fruit fly locomotion",
    authors: "Vaxenburg et al. · Nature",
    url: "https://www.nature.com/articles/s41586-025-09029-4",
    claim:
      "An anatomically detailed body model supports simulated walking and flight, using learned control policies.",
    use: "Reference for geometry, simulation engineering and whole-body mechanics, with each reusable component audited separately.",
    limit:
      "Successful behaviour under a learned policy does not establish reconstructed motor circuitry. Such policies are outside this project’s controller scope.",
    next: "Review mechanics and aerodynamics independently of the behavioural controller.",
    status: "Reference · not a runtime dependency",
  },
  {
    id: "flight",
    year: "2023",
    type: "Physiology",
    title:
      "Gap junctions desynchronize a neural circuit to stabilize insect flight",
    authors: "Hürkey et al. · Nature",
    url: "https://www.nature.com/articles/s41586-023-06099-0",
    claim:
      "Electrical coupling and motor-neuron dynamics help organize the activation of asynchronous flight muscles.",
    use: "Constrains a later flight model, where muscle activation, stretch activation and thoracic mechanics require separate states.",
    limit:
      "A spike-to-wing-angle mapping would bypass the actual flight machinery. The visible wings in v0 have no active flight mechanism.",
    next: "Build a thorax-and-flight-muscle bench before attempting free flight.",
    status: "Planned · later organ system",
  },
];
