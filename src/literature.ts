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
    id: "walking-cpg",
    year: "2025–2026",
    type: "Modelling",
    title:
      "Connectome simulations identify a central pattern generator circuit for fly walking",
    authors: "Pugliese et al. · bioRxiv preprint",
    url: "https://doi.org/10.1101/2025.09.12.675944",
    claim:
      "A candidate MANC rhythm circuit contains IN17A001, INXXX466 and IN16B036. Figure 3 supplies the minimal motif; supplementary analyses identify homologous motifs across legs.",
    use: "Pinned source tables supply 532 selected cells and 10,279 synapse-count edges. We independently implement the published half-tanh rate equation. LF E2 activity times the experimental bridge.",
    limit:
      "CPG identity is a model-supported hypothesis, not a complete physiological reconstruction. Transmitter signs, cellular parameters, size scaling and network selection remain assumptions. Our subset is not a reproduction of the full-paper network.",
    next: "Replace shared timing with identified inter-leg pathways; validate candidate cells against electrophysiology and biological interventions.",
    status: "Implemented · graph slice and rate dynamics; preprint",
  },
  {
    id: "manc-pathways",
    year: "2026",
    type: "Connectomics",
    title:
      "Organization of circuits linking descending input to motor output in the Drosophila Male Adult Nerve Cord connectome",
    authors: "Cheong, Eichler, Stürner et al. · eLife",
    url: "https://elifesciences.org/articles/96084",
    claim:
      "MANC descending and motor neurons were curated and matched to light microscopy and FANC. Figure 1 explains motor-target matching, including serial homology between leg segments.",
    use: "The node inspector preserves body IDs and published motor-module annotations. MANC data are attributed to the Janelia, Cambridge and Google collaboration under CC-BY.",
    limit:
      "Homology-based muscle targets are not direct NMJ tracing for every cell. Module labels do not identify the fibres or attachment paths of our derived muscle groups.",
    next: "Audit each motor-neuron match through the supplementary target tables before replacing pooled recruitment.",
    status: "Implemented · identity and annotation provenance",
  },
  {
    id: "premotor-modules",
    year: "2024",
    type: "Connectomics",
    title:
      "Synaptic architecture of leg and wing premotor control networks in Drosophila",
    authors: "Lesser, Azevedo et al. · Nature",
    url: "https://www.nature.com/articles/s41586-024-07600-z",
    claim:
      "Leg and wing premotor networks have distinct organization; motor groups and relative input structure constrain possible control mechanisms.",
    use: "Guides motor-module interpretation and the decision to preserve raw synapse counts rather than equalize inputs across motor neurons.",
    limit:
      "FANC and MANC are separate specimens. We do not merge them into a single observed graph or infer that leg dynamics apply to flight muscles.",
    next: "Use the target-specific architecture to test alternatives to mean pooling.",
    status: "Read · module-level constraints",
  },
  {
    id: "hair-plates",
    year: "2026",
    type: "Physiology",
    title:
      "Proprioceptive limit detectors contribute to sensorimotor control of the Drosophila leg",
    authors: "Pratt et al. · Nature Communications",
    url: "https://www.nature.com/articles/s41467-026-69333-z",
    claim:
      "CxHP8 detects anterior movement limits; anatomical pathways and optogenetic interventions support a posterior postural reflex. Silencing alters the swing-to-stance transition.",
    use: "The best next target for replacing the ideal joint-feedback hypothesis with an identified sensory-to-motor reflex. FANC materialization 840 is explicitly identified by the authors.",
    limit:
      "No CxHP8 cells or measured transfer functions are implemented yet. Current ideal feedback must not be called a reconstructed hair-plate circuit.",
    next: "Extract Dryad kinematics and the v1.0.0 connectivity release; reproduce activation and silencing assays on the preserved foreleg bench.",
    status: "Read · next reconstruction target",
  },
  {
    id: "walking-feedback",
    year: "2026",
    type: "Physiology",
    title:
      "Central versus peripheral neural control of a coordinated walking pattern in Drosophila",
    authors: "Sapkal et al. · bioRxiv preprint",
    url: "https://doi.org/10.64898/2026.04.29.721658",
    claim:
      "Sensory-deprivation experiments distinguish leg-local rhythms from descending, proprioceptive and load contributions to coordination.",
    use: "Motivates separate tests for central rhythm generation and coordinated physical walking; a periodic neural trace alone is not locomotion validation.",
    limit:
      "Our shared timing gate is a designed hypothesis and is not the inter-leg circuit identified by these experiments.",
    next: "Extract the intervention-specific coordination statistics and candidate coupling motifs.",
    status: "Read · abstract and source discovery; preprint",
  },
  {
    id: "banana",
    year: "2014",
    type: "Physiology",
    title:
      "The banana code—natural blend processing in the olfactory circuitry of Drosophila melanogaster",
    authors: "Schubert et al. · Frontiers in Physiology",
    url: "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2014.00059/full",
    claim:
      "Banana headspace is a multi-component odor blend with distributed olfactory responses, not a single food channel.",
    use: "The banana is labelled scenery. The separate yeast source supplies an explicitly simplified food field, not a reconstructed banana receptor code.",
    limit:
      "No measured concentration, receptor occupancy, plume dynamics or blend interactions are implemented.",
    next: "Extract Table 1 compounds and receptor-response measurements before adding a calibrated blend.",
    status: "Read · environment boundary",
  },
  {
    id: "geosmin",
    year: "2012",
    type: "Physiology",
    title:
      "A conserved dedicated olfactory circuit for detecting harmful microbes in Drosophila",
    authors: "Stensmyr et al. · Cell",
    url: "https://doi.org/10.1016/j.cell.2012.09.046",
    claim:
      "Geosmin activates an aversion-associated olfactory pathway involving Or56a and the DA2 glomerulus.",
    use: "Names a literature-grounded repellent in the terrarium. The field and steering response remain experimental proxies.",
    limit:
      "Our repellent does not instantiate Or56a, DA2, receptor kinetics or an observed DA2-to-walking pathway.",
    next: "Resolve identified downstream neurons and dose-dependent responses.",
    status: "Read · stimulus choice; pathway unimplemented",
  },
  {
    id: "odor-walking",
    year: "2023",
    type: "Physiology",
    title:
      "Sensorimotor transformation underlying odor-modulated locomotion in walking Drosophila",
    authors: "Tao, Wechsler and Bhandawat · Nature Communications",
    url: "https://www.nature.com/articles/s41467-023-42613-8",
    claim:
      "Walking odor responses depend on sensorimotor transformations, providing behavioral constraints for embodied olfactory models.",
    use: "A target for replacing the current scalar left/right odor comparison and fixed stride-asymmetry gain.",
    limit:
      "The current controller is not a replication of this paper or a validated chemotaxis circuit.",
    next: "Extract onset, offset and bilateral response assays before fitting sensory dynamics.",
    status: "Read · behavioral validation target",
  },
  {
    id: "navigation-hdelta",
    year: "2026",
    type: "Modelling",
    title: "What the wiring diagrams say about fly navigation",
    authors:
      "Peter Wang and Nico Christie · exploratory analysis supplied by the user",
    url: "https://pwang724.github.io/fly-circuit-exploration/findings/index.html",
    claim:
      "The authors propose hΔA/H/I/G populations as candidate synaptic stores for a home vector and report several other navigation circuit hypotheses from MaleCNS and hemibrain.",
    use: "Tracked from the supplied September 14 thread, with links to the authors’ findings and public repository. This is a future navigation lane.",
    limit:
      "Connectivity and a successful designed simulation do not establish plasticity timescales, learning rules or physiological memory storage. This analysis is not treated as peer-reviewed confirmation.",
    next: "Audit the proposed dopamine/octopamine gating, compare activity-storage alternatives, and design reset/lesion predictions before implementing any plastic synapse.",
    status: "Tracked · exploratory hypothesis; not implemented",
  },
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
