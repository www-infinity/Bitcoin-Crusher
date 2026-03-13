/* =====================================================================
   Bitcoin Crusher — Research Article Generator
   research.js — generates scientific research articles for every spin
   Uses DuckDuckGo Instant Answer API + Archive.org for enrichment
   ===================================================================== */
/* global window */
window.RESEARCH = (() => {
  "use strict";

  /** AbortSignal.timeout polyfill for browsers that don't support it */
  function makeAbortSignal(ms) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  }

  /* ------------------------------------------------------------------
     SYMBOL → SCIENCE DOMAIN MAPPING
  ------------------------------------------------------------------ */
  const SYMBOL_DOMAINS = {
    BTC:   ["quantum_computing", "cryptography", "number_theory"],
    DIAM:  ["materials_science", "crystallography", "carbon_chemistry"],
    INF:   ["mathematics", "topology", "information_theory"],
    BLOCK: ["solid_state_physics", "polymer_chemistry", "nanotechnology"],
    STAR:  ["astrophysics", "nuclear_fusion", "stellar_evolution"],
    MARIO: ["mycology", "biochemistry", "pharmacology"],
    CROWN: ["metallurgy", "electrochemistry", "surface_science"],
    PUMP:  ["aerospace", "fluid_dynamics", "thermodynamics"],
    BAG:   ["biophysics", "molecular_biology", "proteomics"],
    FIRE:  ["combustion_chemistry", "plasma_physics", "thermodynamics"],
    GOLD:  ["noble_metal_chemistry", "catalysis", "bioelectronics"],
    MOON:  ["selenology", "tidal_mechanics", "planetary_science"],
  };

  /* ------------------------------------------------------------------
     JOURNALS
  ------------------------------------------------------------------ */
  const JOURNALS = [
    "Nature Materials",
    "Physical Review Letters",
    "Science Advances",
    "Journal of the American Chemical Society",
    "Advanced Materials",
    "ACS Nano",
    "Nature Nanotechnology",
    "Angewandte Chemie International Edition",
    "Quantum Science and Technology",
    "Computational Materials Science",
    "Journal of Applied Physics",
    "Biomacromolecules",
    "Nature Biotechnology",
    "ACS Catalysis",
    "Physical Chemistry Chemical Physics",
    "Nanoscale",
    "IEEE Transactions on Quantum Engineering",
    "Proceedings of the National Academy of Sciences",
    "Journal of Materials Chemistry A",
    "npj Computational Materials",
    "Advanced Functional Materials",
    "Carbon",
    "Acta Materialia",
  ];

  /* ------------------------------------------------------------------
     FAKE AUTHOR SETS
  ------------------------------------------------------------------ */
  const AUTHOR_SETS = [
    ["Dr. Elena V. Sokolov", "Prof. James K. Takahashi"],
    ["Dr. Amara Obi-Okwu", "Dr. Lena Müller", "Prof. Yuki Tanaka"],
    ["Prof. Satoshi Nakamura", "Dr. Priya Krishnamurthy"],
    ["Dr. Marcus Webb", "Dr. Aisha Al-Rashid", "Prof. Carlos Rivera"],
    ["Prof. Mei-Ling Zhou", "Dr. Aleksei Volkov"],
    ["Dr. Hannah Osei", "Prof. Thomas Brauer", "Dr. Jin-Woo Park"],
    ["Dr. Kwame Asante", "Prof. Ingrid Svensson", "Dr. Rafael Torres"],
    ["Prof. Olga Petrenko", "Dr. Naomi Watanabe", "Dr. Emre Yilmaz"],
  ];

  /* ------------------------------------------------------------------
     SCIENCE VOCABULARY BY DOMAIN
  ------------------------------------------------------------------ */
  const VOCAB = {
    quantum_computing: {
      nouns: ["qubit coherence time","Hamiltonian operator","superposition state",
        "entanglement fidelity","quantum circuit depth","topological qubit",
        "quantum error correction code","Bloch sphere trajectory","decoherence rate",
        "quantum gate fidelity","variational ansatz","quantum volume"],
      verbs: ["entangle","superpose","decohere","encode","disentangle","initialize","rotate"],
      adjectives: ["coherent","fault-tolerant","topologically protected",
        "adiabatic","variational","decoherence-free","error-mitigated"],
    },
    cryptography: {
      nouns: ["elliptic-curve scalar multiplication","SHA-256 hash digest",
        "Merkle tree root","zero-knowledge succinct argument","lattice basis reduction",
        "trapdoor permutation","digital signature scheme","Byzantine fault tolerance",
        "homomorphic ciphertext","commitment scheme"],
      verbs: ["encrypt","hash","authenticate","sign","prove","verify","commit"],
      adjectives: ["cryptographically secure","collision-resistant",
        "post-quantum","information-theoretically secure","semantically indistinguishable"],
    },
    number_theory: {
      nouns: ["prime factorisation","modular arithmetic","elliptic curve group",
        "discrete logarithm","Riemann zeta function","Dirichlet L-function",
        "quadratic residue","Chinese remainder theorem","p-adic norm"],
      verbs: ["factorise","reduce","congruate","map","transform","bound"],
      adjectives: ["prime","coprime","Gaussian","algebraic","analytic","arithmetic"],
    },
    materials_science: {
      nouns: ["crystalline lattice parameter","grain boundary energy","dislocation density",
        "phonon dispersion curve","elastic modulus tensor","fracture toughness",
        "martensitic phase transformation","nanocomposite matrix","superlattice period",
        "vacancy formation energy"],
      verbs: ["anneal","sinter","nucleate","crystallise","precipitate","phase-separate","deform"],
      adjectives: ["amorphous","polycrystalline","piezoelectric","ferroelectric",
        "superhydrophobic","self-healing","multifunctional","metastable"],
    },
    crystallography: {
      nouns: ["Bragg diffraction peak","unit cell volume","space group symmetry",
        "Miller index plane","electron density map","powder diffraction pattern",
        "structure factor amplitude","reciprocal lattice vector","twin boundary energy"],
      verbs: ["diffract","refine","index","reconstruct","resolve","transform"],
      adjectives: ["hexagonal close-packed","body-centred cubic","face-centred cubic",
        "orthorhombic","monoclinic","tetragonal","trigonal"],
    },
    carbon_chemistry: {
      nouns: ["graphene nanosheet","single-walled carbon nanotube","fullerene cage",
        "sp² hybridisation orbital","van der Waals heterostructure","Dirac cone",
        "armchair chirality vector","Stone–Wales defect","graphitic domain"],
      verbs: ["functionalise","exfoliate","dope","anneal","intercalate","oxidise"],
      adjectives: ["conjugated","aromatic","chiral","metallic","semiconducting","defect-engineered"],
    },
    astrophysics: {
      nouns: ["neutron star merger","accretion disc luminosity","gravitational wave strain",
        "dark matter halo density profile","r-process nucleosynthesis yield",
        "pulsar timing residual","cosmic microwave background anisotropy",
        "Schwarzschild radius","main-sequence lifetime"],
      verbs: ["accrete","redshift","nucleosynthesise","radiate","collapse","merge"],
      adjectives: ["relativistic","supermassive","degenerate","magnetised","isotropic"],
    },
    nuclear_fusion: {
      nouns: ["plasma confinement time","tokamak aspect ratio","Lawson criterion value",
        "deuterium-tritium fuel pellet","plasma beta parameter","magnetic reconnection event",
        "ELM burst energy","divertor heat flux","neoclassical tearing mode"],
      verbs: ["confine","ignite","heat","quench","sustain","stabilise"],
      adjectives: ["thermonuclear","magnetically confined","suprathermal","MHD-stable","turbulent"],
    },
    stellar_evolution: {
      nouns: ["hydrogen-burning shell","helium flash","asymptotic giant branch",
        "planetary nebula shell","white dwarf cooling track","supernova progenitor mass",
        "neutron star equation of state","stellar opacity coefficient"],
      verbs: ["fuse","expand","contract","eject","collapse","cool"],
      adjectives: ["post-main-sequence","carbon-oxygen","electron-degenerate","convective","radiative"],
    },
    mycology: {
      nouns: ["mycorrhizal network hyphal anastomosis","sporocarp morphology",
        "secondary metabolite profile","chitin cell-wall composition",
        "dikaryotic mycelium","basidiospore germination","ergot alkaloid",
        "fungal secretome","wood-decay enzyme"],
      verbs: ["sporulate","anastomose","colonise","degrade","synthesise","secrete"],
      adjectives: ["saprophytic","endophytic","ectomycorrhizal","biotrophic","necrotrophic"],
    },
    biochemistry: {
      nouns: ["adenosine triphosphate hydrolysis","enzyme kinetics constant",
        "allosteric regulatory site","metabolic flux analysis",
        "reactive oxygen species","phosphorylation cascade","NADH oxidoreductase complex",
        "substrate channelling","cofactor binding affinity"],
      verbs: ["catalyse","phosphorylate","regulate","inhibit","activate","conjugate"],
      adjectives: ["enzymatic","allosteric","redox-active","post-translational","bifunctional"],
    },
    pharmacology: {
      nouns: ["IC50 inhibition constant","bioavailability coefficient",
        "blood-brain barrier permeability","receptor binding affinity",
        "ADMET profile","pro-drug activation","therapeutic index"],
      verbs: ["inhibit","activate","metabolise","absorb","excrete","bind"],
      adjectives: ["pharmacokinetic","bioavailable","selective","potent","non-toxic","orally active"],
    },
    metallurgy: {
      nouns: ["yield strength","Hall–Petch relationship","precipitation hardening",
        "solid-solution strengthening","Charpy impact energy","creep rupture life",
        "intermetallic phase","work-hardening exponent"],
      verbs: ["forge","quench","temper","age-harden","weld","cast"],
      adjectives: ["high-entropy","refractory","light-weight","corrosion-resistant","superalloy","ductile"],
    },
    electrochemistry: {
      nouns: ["Faradaic efficiency","overpotential barrier","Butler–Volmer equation",
        "electric double-layer capacitance","electrolyte conductivity",
        "galvanic corrosion current","cyclic voltammogram","electrochemical impedance spectrum"],
      verbs: ["oxidise","reduce","passivate","deposit","corrode","intercalate"],
      adjectives: ["electroactive","redox-active","passivated","electrocatalytic","anodic","cathodic"],
    },
    surface_science: {
      nouns: ["surface adsorption energy","work function shift","monolayer coverage",
        "scanning tunnelling microscopy image","contact angle hysteresis",
        "surface reconstruction pattern","Auger electron spectrum"],
      verbs: ["adsorb","desorb","reconstruct","passivate","functionalise","nucleate"],
      adjectives: ["hydrophilic","hydrophobic","self-assembled","ultra-high-vacuum","reconstructed"],
    },
    thermodynamics: {
      nouns: ["entropy production rate","Gibbs free energy landscape","enthalpy of formation",
        "heat capacity anomaly","phase diagram boundary","Carnot efficiency limit",
        "Seebeck coefficient","thermoelectric figure of merit","exergy destruction"],
      verbs: ["transfer","convert","expand","compress","dissipate","equilibrate"],
      adjectives: ["isentropic","isothermal","non-equilibrium","irreversible","quasi-static"],
    },
    plasma_physics: {
      nouns: ["Debye shielding length","plasma oscillation frequency",
        "magnetohydrodynamic wave","Alfvén speed","ion acoustic instability",
        "electron cyclotron resonance","plasma beta value","Langmuir probe characteristic"],
      verbs: ["ionise","accelerate","confine","heat","diagnose","destabilise"],
      adjectives: ["magnetised","collisional","collisionless","turbulent","non-thermal","weakly coupled"],
    },
    combustion_chemistry: {
      nouns: ["flame temperature","equivalence ratio","laminar burning velocity",
        "ignition delay time","soot formation pathway","NOₓ emission index",
        "detonation wave speed","chemical kinetics mechanism"],
      verbs: ["ignite","combust","quench","propagate","oxidise","pyrolyse"],
      adjectives: ["stoichiometric","lean","rich","premixed","diffusion","supercritical"],
    },
    aerospace: {
      nouns: ["specific impulse","combustion instability mode","hypersonic boundary layer",
        "thermal protection ablation rate","Hohmann transfer orbit","delta-V budget",
        "ion thruster efficiency","aerospike nozzle expansion"],
      verbs: ["thrust","orbit","deorbit","aerobrake","rendezvous","manoeuvre"],
      adjectives: ["hypersonic","supersonic","cryogenic","reusable","geostationary","suborbital"],
    },
    fluid_dynamics: {
      nouns: ["Reynolds number","turbulent boundary layer thickness",
        "vortex shedding frequency","Navier–Stokes solution","Kolmogorov length scale",
        "cavitation threshold pressure","lift-to-drag ratio","wake deficit"],
      verbs: ["flow","separate","reattach","cavitate","vortex","diffuse"],
      adjectives: ["laminar","turbulent","incompressible","viscous","inviscid","subsonic"],
    },
    nanotechnology: {
      nouns: ["quantum confinement energy","surface plasmon resonance wavelength",
        "nanoparticle size distribution","self-assembly driving force",
        "quantum dot photoluminescence","nanopore translocation signal","core-shell morphology"],
      verbs: ["assemble","functionalise","characterise","fabricate","manipulate","localise"],
      adjectives: ["nanoscale","quantum-confined","monodisperse","self-assembled","surface-enhanced"],
    },
    noble_metal_chemistry: {
      nouns: ["oxidation state assignment","coordination complex geometry",
        "ligand field splitting energy","d-orbital occupation","phosphine ligand cone angle",
        "reductive elimination rate","oxidative addition barrier"],
      verbs: ["coordinate","complex","insert","eliminate","oxidise","reduce"],
      adjectives: ["coordinatively saturated","electron-deficient","π-acidic","σ-basic","noble","inert"],
    },
    catalysis: {
      nouns: ["turnover frequency","activation energy barrier","transition state geometry",
        "catalyst selectivity factor","Sabatier principle optimum","d-band centre position",
        "electrocatalytic active site density","volcano plot maximum"],
      verbs: ["catalyse","activate","deactivate","regenerate","promote","inhibit"],
      adjectives: ["heterogeneous","homogeneous","bifunctional","enantioselective",
        "photocatalytic","electrocatalytic","single-atom"],
    },
    bioelectronics: {
      nouns: ["bioelectrical impedance spectroscopy","neural signal transduction pathway",
        "patch-clamp electrophysiology","neurotransmitter diffusion coefficient",
        "action potential propagation velocity","ion channel gating kinetics"],
      verbs: ["transduce","amplify","record","stimulate","interface","implant"],
      adjectives: ["biocompatible","flexible","implantable","neuromorphic","wearable","bioresorbable"],
    },
    biophysics: {
      nouns: ["protein folding energy landscape","molecular motor efficiency",
        "membrane curvature elasticity","cytoskeletal tension","optical tweezer force",
        "fluorescence resonance energy transfer","single-molecule trajectory"],
      verbs: ["fold","unfold","translocate","diffuse","polymerise","depolymerise"],
      adjectives: ["entropic","enthalpic","viscoelastic","semiflexible","amphiphilic"],
    },
    molecular_biology: {
      nouns: ["CRISPR-Cas9 guide RNA","mRNA polyadenylation","ribosomal translocation",
        "codon usage bias","epigenetic methylation mark","chromatin remodelling complex",
        "telomere length regulation","gene regulatory network motif"],
      verbs: ["transcribe","translate","splice","edit","methylate","acetylate"],
      adjectives: ["post-translational","epigenetic","non-coding","regulatory","antisense"],
    },
    proteomics: {
      nouns: ["mass spectrometry proteome","protein–protein interaction network",
        "post-translational modification site","ubiquitin-proteasome pathway",
        "secretome composition","phosphoproteome dynamics"],
      verbs: ["identify","quantify","map","annotate","crosslink","enrich"],
      adjectives: ["quantitative","label-free","phosphorylated","ubiquitinated","glycosylated"],
    },
    solid_state_physics: {
      nouns: ["Fermi level alignment","band gap engineering","phonon scattering rate",
        "carrier mobility tensor","density of states at Fermi energy",
        "Peierls distortion","charge density wave order parameter","topological surface state"],
      verbs: ["conduct","insulate","scatter","localise","dope","gap"],
      adjectives: ["metallic","semiconducting","insulating","topological","strongly correlated"],
    },
    polymer_chemistry: {
      nouns: ["degree of polymerisation","glass transition temperature","chain entanglement",
        "radius of gyration","molar mass distribution","living polymerisation control",
        "block copolymer microphase separation"],
      verbs: ["polymerise","crosslink","blend","degrade","functionalise","segregate"],
      adjectives: ["amphiphilic","thermoresponsive","biodegradable","conjugated","hyperbranched"],
    },
    information_theory: {
      nouns: ["Shannon entropy rate","mutual information content","channel capacity bound",
        "Kolmogorov complexity estimate","Fisher information matrix",
        "rate-distortion function","minimum description length"],
      verbs: ["encode","decode","compress","transmit","reconstruct","quantise"],
      adjectives: ["lossless","capacity-achieving","turbo-coded","sparse","low-density"],
    },
    mathematics: {
      nouns: ["Riemann hypothesis zero","manifold holonomy","differential form",
        "spectral graph eigenvalue","Euler characteristic","Fourier mode",
        "Laplace–Beltrami operator","Banach fixed-point","fractal Hausdorff dimension"],
      verbs: ["converge","diverge","integrate","differentiate","map","compactify"],
      adjectives: ["analytic","holomorphic","compact","symplectic","Riemannian","ergodic"],
    },
    topology: {
      nouns: ["topological invariant","homotopy group","Betti number",
        "Morse theory critical point","knot polynomial","fibre bundle curvature"],
      verbs: ["deform","contract","embed","lift","classify","triangulate"],
      adjectives: ["simply connected","orientable","smooth","compact","fibred","exotic"],
    },
    selenology: {
      nouns: ["lunar regolith composition","mare basalt stratigraphy",
        "impact melt glass","ilmenite abundance","lunar mantle convection",
        "polar water-ice deposit","space weathering rind"],
      verbs: ["excavate","melt","solidify","volatilise","accumulate","implant"],
      adjectives: ["anorthositic","basaltic","gardened","space-weathered","polar","equatorial"],
    },
    tidal_mechanics: {
      nouns: ["tidal dissipation rate","Love number","tidal bulge lag angle",
        "orbital resonance lock","tidal locking timescale","ocean tidal loading"],
      verbs: ["dissipate","lock","resonate","decelerate","migrate","circularise"],
      adjectives: ["synchronously rotating","tidally locked","resonant","eccentric","oblique"],
    },
    planetary_science: {
      nouns: ["core differentiation","mantle convection cell","impact crater morphology",
        "volatile inventory","magnetic dynamo","atmospheric escape rate"],
      verbs: ["differentiate","outgas","crater","magnetise","erode","condense"],
      adjectives: ["differentiated","volcanic","impact-generated","primordial","volatile-rich"],
    },
  };

  /* ------------------------------------------------------------------
     HELPERS
  ------------------------------------------------------------------ */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickN = (arr, n) => {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  function getDomainsForSpin(symbolLabels) {
    const domains = new Set();
    (symbolLabels || []).forEach((label) => {
      (SYMBOL_DOMAINS[label] || ["nanotechnology"]).forEach((d) => domains.add(d));
    });
    if (!domains.size) domains.add("nanotechnology");
    return Array.from(domains);
  }

  function getVocabForDomains(domains) {
    const nouns = [], verbs = [], adjectives = [];
    domains.forEach((d) => {
      const v = VOCAB[d];
      if (v) { nouns.push(...v.nouns); verbs.push(...v.verbs); adjectives.push(...v.adjectives); }
    });
    if (!nouns.length) { nouns.push("quantum state","nanomaterial","molecular system"); }
    if (!verbs.length) { verbs.push("synthesise","characterise","analyse"); }
    if (!adjectives.length) { adjectives.push("novel","advanced","quantum-enhanced"); }
    return { nouns, verbs, adjectives };
  }

  /* ------------------------------------------------------------------
     ARTICLE SECTION GENERATORS
  ------------------------------------------------------------------ */
  function generateTitle(domains, vocab) {
    const d0 = (domains[0] || "nanotechnology").replace(/_/g, " ");
    const d1 = (domains[1] || domains[0] || "materials science").replace(/_/g, " ");
    const templates = [
      () => `${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} via ${cap(pick(vocab.nouns))}: Implications for ${d0}`,
      () => `Quantum-Enhanced ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${d0} Systems`,
      () => `Mechanisms of ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${d1} Networks`,
      () => `${cap(pick(vocab.adjectives))} Control of ${cap(pick(vocab.nouns))} for Advanced ${d0} Applications`,
      () => `Synergistic ${cap(pick(vocab.nouns))} and ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} Matrices`,
      () => `High-Performance ${cap(pick(vocab.adjectives))} ${d0}: ${cap(pick(vocab.nouns))} Synthesis and Characterisation`,
      () => `${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} Coupling in ${cap(pick(vocab.adjectives))} ${d0} Architectures`,
      () => `Role of ${cap(pick(vocab.nouns))} in Governing ${cap(pick(vocab.adjectives))} Behaviour in ${d1}`,
    ];
    return pick(templates)();
  }

  function generateKeywords(vocab, domains) {
    return [...pickN(vocab.nouns, 4), ...pickN(domains, 3).map((d) => d.replace(/_/g, " "))];
  }

  function generateAbstract(vocab, domains) {
    const d0 = (domains[0] || "nanotechnology").replace(/_/g, " ");
    const pct = (Math.random() * 200 + 50).toFixed(1);
    const sentences = [
      `We report ${pick(vocab.adjectives)} properties of ${pick(vocab.nouns)} in ${d0}.`,
      `Using ${pick(vocab.adjectives)} ${pick(vocab.nouns)} techniques, we demonstrate that ${pick(vocab.adjectives)} systems exhibit remarkable ${pick(vocab.adjectives)} behaviour under controlled conditions.`,
      `Our results reveal a previously uncharacterised correlation between ${pick(vocab.nouns)} and ${pick(vocab.nouns)}, with broad implications for fundamental science and next-generation technology.`,
      `The ${pick(vocab.adjectives)} nature of the observed ${pick(vocab.nouns)} was confirmed through high-resolution ${pick(vocab.nouns)} analysis and first-principles calculations.`,
      `Specifically, we find that ${pick(vocab.adjectives)} ${pick(vocab.nouns)} enhances performance by up to ${pct}% relative to conventional approaches.`,
      `These findings open new avenues for the rational design of ${pick(vocab.adjectives)} ${pick(vocab.nouns)}-based architectures.`,
    ];
    return pickN(sentences, 5).join(" ");
  }

  function generateIntroduction(vocab, domains) {
    const d0 = (domains[0] || "nanotechnology").replace(/_/g, " ");
    return [
      `The field of ${d0} has witnessed remarkable advances, driven by demand for ${pick(vocab.adjectives)} systems with unprecedented ${pick(vocab.nouns)} capabilities [1,2].`,
      `Central to these developments is the ability to precisely control ${pick(vocab.nouns)} at the ${pick(vocab.adjectives)} level—a challenge that has spurred extensive theoretical and experimental investigations [3–5].`,
      `In particular, the interplay between ${pick(vocab.nouns)} and ${pick(vocab.nouns)} has emerged as a critical factor governing macroscopic ${pick(vocab.adjectives)} behaviour [6].`,
      `Despite significant progress, the mechanistic origin of ${pick(vocab.adjectives)} ${pick(vocab.nouns)} phenomena remains poorly understood, limiting rational device engineering [7,8].`,
      `Here we address this gap through a comprehensive study combining ${pick(vocab.nouns)} spectroscopy, computational modelling, and ${pick(vocab.adjectives)} characterisation.`,
    ].join(" ");
  }

  function generateMethods(vocab) {
    const res = (Math.random() * 0.5 + 0.05).toFixed(2);
    const cutoff = Math.floor(Math.random() * 300 + 400);
    const n = Math.floor(Math.random() * 900 + 100);
    return [
      `All samples were prepared using a ${pick(vocab.adjectives)} ${pick(vocab.nouns)} synthesis protocol under inert atmosphere conditions (< 1 ppm O₂, < 0.5 ppm H₂O).`,
      `Structural characterisation employed ${pick(vocab.nouns)} analysis with a spatial resolution of ${res} nm.`,
      `${cap(pick(vocab.adjectives))} measurements were conducted between 4 K and 873 K using a custom-built ${pick(vocab.nouns)} apparatus calibrated against NIST standards.`,
      `Computational simulations used density functional theory (DFT) within the PBE exchange-correlation functional; plane-wave cutoff energy: ${cutoff} eV.`,
      `Statistical analysis applied a bootstrapping methodology (n = ${n} iterations) at significance threshold p < 0.05.`,
    ].join(" ");
  }

  function generateResults(vocab) {
    const R2 = (Math.random() * 0.1 + 0.88).toFixed(3);
    const fold = (Math.random() * 40 + 10).toFixed(1);
    return [
      `The ${pick(vocab.adjectives)} ${pick(vocab.nouns)} exhibited a well-defined ${pick(vocab.adjectives)} signature consistent with theoretical predictions.`,
      `Quantitative analysis revealed a ${pick(vocab.adjectives)} dependence with R² = ${R2}.`,
      `The ${pick(vocab.adjectives)} regime showed a ${fold}-fold enhancement in ${pick(vocab.nouns)} performance relative to the control.`,
      `Cross-validation using independent ${pick(vocab.nouns)} measurements confirmed reproducibility across five independent preparations (coefficient of variation < 3.2%).`,
      `Emergence of ${pick(vocab.adjectives)} ${pick(vocab.nouns)} at the critical threshold was accompanied by a characteristic ${pick(vocab.nouns)} shift, providing direct spectroscopic evidence for the proposed mechanism.`,
    ].join(" ");
  }

  function generateDiscussion(vocab, domains) {
    const d0 = (domains[0] || "nanotechnology").replace(/_/g, " ");
    const pct = (Math.random() * 200 + 50).toFixed(1);
    return [
      `The observed ${pick(vocab.adjectives)} behaviour can be rationalised within a framework accounting for ${pick(vocab.nouns)}-mediated coupling between ${pick(vocab.adjectives)} domains.`,
      `Our findings align with recent reports on analogous ${d0} systems while extending understanding to the previously unexplored ${pick(vocab.adjectives)} regime [9,10].`,
      `The ${pct}% enhancement in ${pick(vocab.nouns)} substantially exceeds state-of-the-art benchmarks, suggesting ${pick(vocab.adjectives)} ${pick(vocab.nouns)} as a genuinely superior platform.`,
      `From a practical standpoint, our ${pick(vocab.adjectives)} fabrication route is scalable and compatible with existing ${pick(vocab.nouns)}-based manufacturing infrastructure.`,
      `Future work should investigate long-term stability under operational conditions and extension to multi-component ${pick(vocab.adjectives)} systems.`,
    ].join(" ");
  }

  function generateConclusion(vocab) {
    return [
      `We demonstrated ${pick(vocab.adjectives)} ${pick(vocab.nouns)} in a novel material system through combined experimental and computational approaches.`,
      `Mechanistic insights provide a foundation for rational design of next-generation ${pick(vocab.adjectives)} ${pick(vocab.nouns)}-based technologies.`,
      `The ${pick(vocab.adjectives)} framework introduced here is expected to stimulate further investigations at the intersection of ${pick(vocab.nouns)} and ${pick(vocab.nouns)} research.`,
    ].join(" ");
  }

  function generateReferences(domains) {
    const refAuthors = [
      "Zhang, Y. et al.","Kim, J. H. et al.","Müller, R. & Nakamura, T.",
      "Patel, A. et al.","Chen, X. et al.","Williams, B. & Singh, P.",
      "Osei, H. et al.","Volkov, A. K. et al.","Tanaka, Y. & Park, J.",
      "Al-Rashid, A. et al.",
    ];
    return Array.from({ length: 10 }, (_, i) => {
      const year = 2019 + Math.floor(Math.random() * 7);
      const vol = Math.floor(Math.random() * 400 + 100);
      const page = Math.floor(Math.random() * 9000 + 1000);
      const pad = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
      return `[${i + 1}] ${pick(refAuthors)} ${pick(JOURNALS)} ${vol}, ${page} (${year}). doi:10.xxxx/ref.${year}.${pad}`;
    });
  }

  function generateDOI(year) {
    const codes = ["natmat","prl","advmat","acsnano","jacs","sciadv","acs"];
    const pad = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
    return `10.1038/${pick(codes)}.${year}.${pad}`;
  }

  /* ------------------------------------------------------------------
     MAIN: generateResearchArticle
  ------------------------------------------------------------------ */
  function generateResearchArticle(spinData) {
    const labels = spinData.symbolLabels || [];
    const domains = getDomainsForSpin(labels);
    const vocab = getVocabForDomains(domains);
    const year = new Date().getFullYear();

    const tierImpact = {
      jackpot: 62.4, "win-big": 47.1, "win-medium": 31.8, "win-small": 18.5, lose: 9.2,
    };

    return {
      title: generateTitle(domains, vocab),
      authors: pick(AUTHOR_SETS),
      journal: pick(JOURNALS),
      year,
      doi: generateDOI(year),
      impactFactor: tierImpact[spinData.tier] || 12.0,
      keywords: generateKeywords(vocab, domains),
      abstract: generateAbstract(vocab, domains),
      introduction: generateIntroduction(vocab, domains),
      methods: generateMethods(vocab),
      results: generateResults(vocab),
      discussion: generateDiscussion(vocab, domains),
      conclusion: generateConclusion(vocab),
      references: generateReferences(domains),
      domains,
      tokenValue: spinData.score || 0,
      spinNumber: spinData.spinNumber || 0,
      generatedAt: new Date().toISOString(),
      searchEnriched: false,
    };
  }

  /* ------------------------------------------------------------------
     EXTERNAL SEARCH ENRICHMENT
     DuckDuckGo Instant Answer API + Archive.org
  ------------------------------------------------------------------ */
  async function searchDDG(query) {
    try {
      const url =
        "https://api.duckduckgo.com/?q=" +
        encodeURIComponent(query) +
        "&format=json&no_html=1&skip_disambig=1";
      const res = await fetch(url, { signal: makeAbortSignal(6000) });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        abstract: data.AbstractText || "",
        source: data.AbstractSource || "",
        url: data.AbstractURL || "",
        relatedTopics: (data.RelatedTopics || [])
          .slice(0, 4)
          .map((t) => t.Text || "")
          .filter(Boolean),
      };
    } catch (_) {
      return null;
    }
  }

  async function searchArchive(query) {
    try {
      const url =
        "https://archive.org/advancedsearch.php?q=" +
        encodeURIComponent(query) +
        "&fl[]=identifier&fl[]=title&fl[]=description&rows=4&output=json";
      const res = await fetch(url, { signal: makeAbortSignal(6000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.response && data.response.docs ? data.response.docs : []).map((d) => ({
        id: d.identifier || "",
        title: d.title || "",
        description: (d.description || "").slice(0, 250),
        url: "https://archive.org/details/" + (d.identifier || ""),
      }));
    } catch (_) {
      return [];
    }
  }

  /** Enrich article asynchronously with DDG + archive results */
  async function enrichWithSearch(article) {
    const query = (article.keywords || []).slice(0, 3).join(" ") + " research science";
    const [ddgResult, archiveResult] = await Promise.allSettled([
      searchDDG(query),
      searchArchive(query),
    ]);
    const enriched = Object.assign({}, article, { searchEnriched: true });
    if (ddgResult.status === "fulfilled" && ddgResult.value && ddgResult.value.abstract) {
      enriched.externalContext = {
        source: "DuckDuckGo Instant Answer · " + (ddgResult.value.source || ""),
        abstract: ddgResult.value.abstract,
        url: ddgResult.value.url,
        relatedTopics: ddgResult.value.relatedTopics,
      };
    }
    if (archiveResult.status === "fulfilled" && archiveResult.value.length > 0) {
      enriched.archiveSources = archiveResult.value;
    }
    return enriched;
  }

  /* ------------------------------------------------------------------
     EXPORT: HTML REPORT of all spins
  ------------------------------------------------------------------ */
  function buildExportHTML(allSpinRecords) {
    const now = new Date().toLocaleString();
    const totalScore = allSpinRecords.reduce((s, r) => s + (r.spinData.score || 0), 0);
    const wins = allSpinRecords.filter((r) => r.spinData.tier !== "lose").length;

    const spinCards = allSpinRecords
      .slice()
      .reverse()
      .map((record) => {
        const { spinData, commitInfo, article } = record;
        const artHtml = article
          ? `
          <div class="art">
            <h3>📄 ${escH(article.title)}</h3>
            <p class="art-meta"><strong>Authors:</strong> ${escH((article.authors || []).join(", "))} &nbsp;|&nbsp;
            <strong>Journal:</strong> ${escH(article.journal)} (${article.year}) &nbsp;|&nbsp;
            <strong>IF:</strong> ${article.impactFactor} &nbsp;|&nbsp;
            <strong>DOI:</strong> ${escH(article.doi)}</p>
            <p class="art-meta"><strong>Keywords:</strong> ${escH((article.keywords || []).join(" · "))}</p>
            <p><strong>Abstract:</strong> ${escH(article.abstract)}</p>
            ${article.externalContext ? `<p class="ext"><strong>🦆 DDG Context (${escH(article.externalContext.source)}):</strong> ${escH(article.externalContext.abstract)}</p>` : ""}
            ${article.archiveSources && article.archiveSources.length ? `<p class="ext"><strong>🗄️ Archive Sources:</strong> ${article.archiveSources.map(a => `<a href="${escH(a.url)}">${escH(a.title)}</a>`).join(" · ")}</p>` : ""}
          </div>`
          : "";
        const commitLine = commitInfo
          ? (commitInfo.sha
              ? `<span class="commit">📝 ${escH(commitInfo.filename)}</span>`
              : `<span class="commit">📡 queued — ${escH(commitInfo.filename)}</span>`)
          : `<span class="commit muted">⚡ local only</span>`;
        return `<div class="spin-card ${escH(spinData.tier || "")}">
          <div class="spin-header">
            <span class="syms">${(spinData.symbols || []).join(" ")}</span>
            <span class="result">${escH(spinData.result || "")}</span>
            <span class="score">+${spinData.score || 0} pts</span>
          </div>
          <div class="spin-meta">
            Spin #${spinData.spinNumber} · ${new Date(spinData.timestamp).toLocaleString()}
            · Device: ${escH(spinData.deviceId || "")}
            ${commitLine}
          </div>
          ${artHtml}
        </div>`;
      })
      .join("\n");

    const esc = escH;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bitcoin Crusher — Full Spin Export ${esc(now)}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#050810;color:#eee;margin:0;padding:20px;}
  h1{color:#f5c542;} h2{color:#00d4ff;margin-top:32px;}
  .summary{background:rgba(255,255,255,.06);border-radius:12px;padding:16px;margin:16px 0;display:flex;gap:24px;flex-wrap:wrap;}
  .stat{text-align:center;} .stat-val{font-size:32px;font-weight:900;color:#f5c542;}
  .stat-label{font-size:12px;color:#888;text-transform:uppercase;}
  .spin-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;margin:10px 0;}
  .spin-card.jackpot{border-color:#f5c542;} .spin-card.win-big{border-color:#00d4ff;}
  .spin-card.win-medium{border-color:#4ade80;} .spin-card.win-small{border-color:#a78bfa;}
  .spin-header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
  .syms{font-size:28px;letter-spacing:4px;} .result{font-weight:700;flex:1;}
  .score{color:#f5c542;font-weight:900;} .spin-meta{font-size:11px;color:#666;margin-top:6px;}
  .commit{font-family:monospace;font-size:10px;color:#00d4ff;} .muted{color:#555;}
  .art{margin-top:12px;padding:12px;background:rgba(0,0,0,.3);border-radius:8px;border-left:3px solid #00d4ff;}
  .art h3{color:#00d4ff;font-size:14px;margin:0 0 6px;}
  .art-meta{font-size:11px;color:#888;margin:4px 0;}
  .ext{font-size:12px;color:#a78bfa;margin-top:8px;}
  a{color:#00d4ff;}
  footer{margin-top:40px;color:#555;font-size:12px;text-align:center;}
</style>
</head>
<body>
<h1>🎰 Bitcoin Crusher — Full Spin Export</h1>
<p style="color:#888">Generated: ${esc(now)} · Total spins: ${allSpinRecords.length}</p>
<div class="summary">
  <div class="stat"><div class="stat-val">${allSpinRecords.length}</div><div class="stat-label">Total Spins</div></div>
  <div class="stat"><div class="stat-val">${wins}</div><div class="stat-label">Wins</div></div>
  <div class="stat"><div class="stat-val">${allSpinRecords.length - wins}</div><div class="stat-label">Losses</div></div>
  <div class="stat"><div class="stat-val">${totalScore.toLocaleString()}</div><div class="stat-label">Total Score</div></div>
  <div class="stat"><div class="stat-val">${allSpinRecords.length ? (wins / allSpinRecords.length * 100).toFixed(1) : 0}%</div><div class="stat-label">Win Rate</div></div>
</div>
<h2>📜 Spin Records with Research Tokens</h2>
${spinCards}
<footer>∞ Bitcoin Crusher — Infinity System · Every spin is a record. Every record is forever.</footer>
</body>
</html>`;
  }

  function escH(s) {
    return String(s || "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
    );
  }

  function downloadExport(allSpinRecords) {
    const html = buildExportHTML(allSpinRecords);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitcoin-crusher-export-${ts}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }

  return {
    generateResearchArticle,
    enrichWithSearch,
    searchDDG,
    searchArchive,
    downloadExport,
  };
})();
