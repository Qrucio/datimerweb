export const examsData = [
  {
    id: "jee_mains",
    name: "JEE Mains",
    subjects: [
      {
        id: "physics",
        name: "Physics",
        color: "from-blue-500/20 to-cyan-500/10", 
        border: "border-blue-500/30",
        text: "text-blue-400",
        chapters: [
          {
            id: "kinematics",
            name: "Kinematics",
            topics: [
              "Frame of reference",
              "Motion in a straight line",
              "Position-time graph",
              "Speed and velocity"
            ]
          },
          {
            id: "laws_of_motion",
            name: "Laws of Motion",
            topics: [
              "Force and inertia",
              "Newton's First Law",
              "Newton's Second Law",
              "Newton's Third Law",
              "Conservation of linear momentum"
            ]
          }
        ]
      },
      {
        id: "chemistry",
        name: "Chemistry",
        color: "from-indigo-500/20 to-purple-500/10",
        border: "border-indigo-500/30",
        text: "text-indigo-400",
        chapters: [
          {
            id: "some_basic_concepts",
            name: "Some Basic Concepts",
            topics: [
              "Matter and its nature",
              "Dalton's atomic theory",
              "Concept of atom and molecule",
              "Laws of chemical combination"
            ]
          },
          {
            id: "atomic_structure",
            name: "Atomic Structure",
            topics: [
              "Thomson and Rutherford models",
              "Bohr's model and its limitations",
              "Dual nature of matter",
              "Quantum mechanical model"
            ]
          }
        ]
      },
      {
        id: "mathematics",
        name: "Mathematics",
        color: "from-violet-500/20 to-fuchsia-500/10",
        border: "border-violet-500/30",
        text: "text-violet-400",
        chapters: [
          {
            id: "sets_relations_functions",
            name: "Sets, Relations and Functions",
            topics: [
              "Sets and their representation",
              "Union and intersection of sets",
              "Types of relations",
              "Types of functions"
            ]
          },
          {
            id: "complex_numbers",
            name: "Complex Numbers",
            topics: [
              "Algebra of complex numbers",
              "Argand plane",
              "Quadratic equations"
            ]
          }
        ]
      }
    ]
  },
  {
    id: "neet",
    name: "NEET",
    subjects: [
      {
        id: "physics",
        name: "Physics",
        color: "from-blue-500/20 to-cyan-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        chapters: [
          {
            id: "physical_world_measurement",
            name: "Physical World & Measurement",
            topics: [
              "Physics: Scope and excitement",
              "Nature of physical laws",
              "Need for measurement"
            ]
          }
        ]
      },
      {
        id: "chemistry",
        name: "Chemistry",
        color: "from-indigo-500/20 to-purple-500/10",
        border: "border-indigo-500/30",
        text: "text-indigo-400",
        chapters: [
          {
            id: "structure_of_atom",
            name: "Structure of Atom",
            topics: [
              "Bohr's model and its limitations",
              "Concept of shells and subshells",
              "Dual nature of matter and light"
            ]
          }
        ]
      },
      {
        id: "biology",
        name: "Biology",
        color: "from-emerald-500/20 to-teal-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        chapters: [
          {
            id: "diversity_living_world",
            name: "Diversity in Living World",
            topics: [
              "What is living?",
              "Biodiversity",
              "Need for classification",
              "Taxonomy and systematics"
            ]
          },
          {
            id: "structural_organisation",
            name: "Structural Organisation in Animals and Plants",
            topics: [
              "Morphology of flowering plants",
              "Anatomy of flowering plants",
              "Animal tissues"
            ]
          }
        ]
      }
    ]
  }
];
