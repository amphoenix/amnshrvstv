import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  docker,
  cts,
  amdocs,
  aaic,
  freelancer,
  amnExchange,
  marxeed,
  docuphase,
  ai900,
  az900,
  matan,
  flipkart,
  java,
  go,
  postgresql,
  graphql,
  redis,
  kubernetes,
  servicenow
} from "../assets";

export const navLinks = [
  {
    id: "resume",
    title: "Resume",
  },
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "Frontend Developer",
    icon: web,
  },
  {
    title: "Backend Developer",
    icon: backend,
  },
  {
    title: "AI/ML Engineer",
    icon: mobile,
  },
  {
    title: "Blockchain Developer",
    icon: creator,
  },
];

const technologies = [
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "TypeScript",
    icon: typescript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "Redux",
    icon: redux,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "Go",
    icon: go,
  },
  {
    name: "Java",
    icon: java,
  },
  {
    name: "GraphQL",
    icon: graphql,
  },
  {
    name: "PostgreSQL",
    icon: postgresql,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Docker",
    icon: docker,
  },
  {
    name: "Kubernetes",
    icon: kubernetes,
  },
  {
    name: "Redis",
    icon: redis,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
];

const experiences = [
  {
    title: "SDE III",
    company_name: "ServiceNow",
    icon: servicenow,
    iconBg: "#032D42",
    date: "May 2025 - present",
    points: [
      "Improved frontend performance by 35% through batch processing, caching and architectural optimizations.",
      "Built a YAML-driven Jenkins pipeline integrated with Claude for automated PR reviews.",
      "Engineered a Go-based parallel multi-model orchestration framework for dynamic LLM/SLM routing and low-latency execution.",
      "Architected RAG pipelines and deployed self-hosted SLM infrastructure with semantic retrieval, reducing cost and improving inference performance.",
    ],
  },
  {
    title: "SDE II",
    company_name: "Flipkart",
    icon: flipkart,
    iconBg: "#383E56",
    date: "March 2025 - May 2025",
    points: [
      "End-to-end owner of the Flipkart Seller App within the COE team, driving scalable architecture and performance optimization.",
    ],
  },
  {
    title: "Software Developer",
    company_name: "Amdocs",
    icon: amdocs,
    iconBg: "#383E56",
    date: "March 2022 - Feb 2025",
    points: [
      "Led a client POC that secured enterprise investment; promoted to UI Lead for the awarded program.",
      "Architected a micro-frontend OSS platform, improving page load performance by 35%.",
      "Built scalable REST APIs using Java & Spring Boot and led a team of 7 engineers to ensure high-quality delivery.",
      "Achievements: Received Recognition Award and Employee of the Month for innovative solutions and leadership.",
    ],
  },
  {
    title: "Software Engineer",
    company_name: "AAIC",
    icon: aaic,
    iconBg: "#fff",
    date: "Jun 2021 - March 2022",
    points: [
      "Built and scaled an e-learning platform, improving engagement by 40% and performance scores by 30%.",
    ],
  },
  {
    title: "Freelancer UI Developer",
    company_name: "Freelancer",
    icon: freelancer,
    iconBg: "#fff",
    date: "2021 - 2022",
    points: [
      "Implemented AWS-based authentication and resolved XSS vulnerabilities to improve application security.",
    ],
  },
  {
    title: "Programmer Analyst",
    company_name: "Cognizant",
    icon: cts,
    iconBg: "#E6DEDD",
    date: "Dec 2018 - Apr 2020",
    points: [
      "Improved performance of a high-traffic React application, reducing load time by 15% and increasing engagement by 20%.",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "I had the pleasure of working with Aman at Amdocs. He is highly professional, with a strong grasp of all the technologies. Aman is always willing to help and support other colleagues. Highly recommend!",
    name: "Matan Elmaliach",
    designation: "Fullstack/Frontend Developer",
    company: "Amdocs",
    image: matan,
  },
  // {
  //   testimonial:
  //     "I've never met a web developer who truly cares about their clients' success like Rick does.",
  //   name: "Chris Brown",
  //   designation: "COO",
  //   company: "DEF Corp",
  //   image: "https://randomuser.me/api/portraits/men/5.jpg",
  // },
  // {
  //   testimonial:
  //     "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
  //   name: "Lisa Wang",
  //   designation: "CTO",
  //   company: "456 Enterprises",
  //   image: "https://randomuser.me/api/portraits/women/6.jpg",
  // },
];

const projects = [
  {
    name: "AMNEXCHANGE",
    description:
      "Web-based platform that allows users to send crypto across the world.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "solidity",
        color: "green-text-gradient",
      },
      {
        name: "blockchain",
        color: "pink-text-gradient",
      },
    ],
    image: amnExchange,
    source_code_link: "https://amnexchange.netlify.app/",
  },
  {
    name: "marXeed",
    description:
      "Marxeed is an A.I. content creation assistant that drafts your blogs in seconds.",
    tags: [
      {
        name: "redux",
        color: "blue-text-gradient",
      },
      {
        name: "micro-frontend",
        color: "green-text-gradient",
      },
      {
        name: "ai",
        color: "pink-text-gradient",
      },
    ],
    image: marxeed,
    source_code_link: "https://marxeed.com/",
  },
  {
    name: "DocuPhase",
    description:
      "Intelligent Automation Solutions Built for Modern Finance Teams.",
    tags: [
      {
        name: "react-js",
        color: "blue-text-gradient",
      },
      {
        name: "typescript",
        color: "green-text-gradient",
      },
      {
        name: "aws",
        color: "pink-text-gradient",
      },
    ],
    image: docuphase,
    source_code_link: "https://github.com/",
  },
];

const certifications = [
  {
    title: "Microsoft Certified: Azure AI Fundamentals",
    icon: ai900,
    url: "https://learn.microsoft.com/en-in/users/amnshrvstv/transcript/v0gm1f3exo8z94r",
  },
  {
    title: "Microsoft Certified: Azure Fundamentals",
    icon: az900,
    url: "https://learn.microsoft.com/en-us/users/amnshrvstv/transcript/vn0o8trkp1k442z?ref=https%3A%2F%2Fwww.linkedin.com%2F",
  },
];

export {
  services,
  technologies,
  experiences,
  testimonials,
  projects,
  certifications,
};
