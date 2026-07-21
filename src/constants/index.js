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
  aiAgentsNetwork,
  tradingTerminal,
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
  servicenow,
  python,
  mysql,
  expressjs,
  sass,
  kafka,
  nginx,
  firebaseIcon,
  jest,
  llamaAward
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
    title: "AI Engineer/FDE",
    icon: mobile,
  },
  {
    title: "Frontend Developer",
    icon: web,
  },
  {
    title: "Backend Developer",
    icon: backend,
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

// Each entry above gets its own WebGL canvas (a spinning 3D ball) — browsers
// cap the number of live WebGL contexts per page (commonly ~16), so this
// list is intentionally kept small. Anything added later renders as a flat
// icon chip in `moreTech` instead, which costs no WebGL context.
const moreTech = [
  {
    name: "Python",
    icon: python,
  },
  {
    name: "MySQL",
    icon: mysql,
  },
  {
    name: "Express.js",
    icon: expressjs,
  },
  {
    name: "SASS",
    icon: sass,
  },
  {
    name: "Kafka",
    icon: kafka,
  },
  {
    name: "Nginx",
    icon: nginx,
  },
  {
    name: "Firebase",
    icon: firebaseIcon,
  },
  {
    name: "Jest",
    icon: jest,
  },
];

// Skills with no meaningful/available logo (AI concepts, protocols, AWS
// services with no free icon source, abstract practices) — rendered as
// plain text tags instead of icon balls.
const additionalSkills = [
  {
    category: "AI Systems",
    skills: [
      "AI Agents",
      "Multi Agent Systems",
      "Enterprise AI",
      "RAG",
      "Semantic Memory",
      "AI Evaluation",
      "AI Observability",
      "Prompt Engineering",
      "MCP",
    ],
  },
  {
    category: "Database & Cloud",
    skills: ["DynamoDB", "AWS Services", "S3", "IAM"],
  },
  {
    category: "Others",
    skills: ["WCAG", "DSA", "System Design"],
  },
];

const experiences = [
  {
    title: "SDE III",
    company_name: "ServiceNow",
    icon: servicenow,
    iconBg: "#032D42",
    date: "05/2025 – Present",
    stack: "Go, Python, AI Agents, LLMs, Agentic AI, RAG, MCP, Docker, Jenkins, Git",
    award: {
      image: llamaAward,
      label: "LLAMA Award — Q1 2026",
    },
    points: [
      "Filed a patent for an autonomous AI agent framework enabling reliable automation across remote (Citrix/VDI) and local enterprise applications.",
      "Designed and delivered an end-to-end AI migration workflow that automated ServiceNow component modernization using specialized AI agents for code transformation, RLAIF-based review, and automated test generation, reducing manual migration effort by ~70% and accelerating developer productivity.",
      "Designed and built Amnilot, an autonomous AI operations platform that automated enterprise defect investigations and customer case resolution through persistent memory, autonomous workflow execution, and secure tool orchestration, reducing investigation time from hours to minutes and significantly improving engineer productivity.",
      "Partnered with enterprise customers and internal application business units to design, develop, and deploy AI agent solutions by building reusable tools, skills, and workflow capabilities tailored to domain specific business processes.",
      "Recognized with the LLAMA Award (Q1 2026) for technical innovation and contributions to enterprise AI initiatives.",
    ],
  },
  {
    title: "SDE II",
    company_name: "Flipkart",
    icon: flipkart,
    iconBg: "#383E56",
    date: "03/2025 – 05/2025",
    stack: "Go, React.js, TypeScript, Redux, REST APIs, CI/CD",
    points: [
      "Owned the architecture and delivery of the Flipkart Seller App within the Center of Excellence, driving scalability, performance optimization, and feature delivery for a high-traffic seller platform.",
    ],
  },
  {
    title: "Software Developer",
    company_name: "Amdocs",
    icon: amdocs,
    iconBg: "#383E56",
    date: "03/2022 – 02/2025",
    stack: "React.js, TypeScript, Redux, Java, Springboot",
    points: [
      "Led an enterprise proof of concept that secured client investment and resulted in promotion to UI Lead.",
      "Architected a micro frontend OSS platform, improving page load performance by 35% while enabling independent feature delivery across teams.",
      "Received the Recognition Award and Employee of the Month for technical innovation and leadership.",
    ],
  },
  {
    title: "Software Engineer",
    company_name: "AAIC (Startup)",
    icon: aaic,
    iconBg: "#fff",
    date: "06/2021 – 03/2022",
    points: [
      "Developed and scaled an e-learning platform, improving user engagement by 40% and platform performance by 30% through frontend optimization and scalable architecture.",
    ],
  },
  {
    title: "Freelancer UI Developer",
    company_name: "Freelancer",
    icon: freelancer,
    iconBg: "#fff",
    date: "2021 – 2022",
    points: [
      "Delivered production web applications for clients by implementing secure authentication, integrating real-time communication, and addressing application security vulnerabilities.",
    ],
  },
  {
    title: "Programmer Analyst",
    company_name: "Cognizant",
    icon: cts,
    iconBg: "#E6DEDD",
    date: "12/2018 – 04/2020",
    points: [
      "Optimized a high-traffic React application, reducing page load time by 15% and increasing user engagement by 20% through performance engineering and frontend optimization.",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "Worked with Aman on the same team and he's honestly one of the best engineers I've worked next to. He actually likes the hard problems, the annoying bugs, the weird edge cases, the stuff most people would rather route around. He keeps digging until he understands why something broke, not just how to make the error go away. He's also easy to work with. Explains his thinking, takes pushback without getting defensive, and follows through on what he picks up. Sounds basic, but it's rarer than you'd think. Happy to recommend him without any hesitation.",
    name: "Sahil Mahna",
    designation: "Staff Software Engineer",
    company: "ServiceNow",
  },
  {
    testimonial:
      "I had the pleasure of working with Aman at Applied AI Consulting LLP, where he consistently impressed with his front-end development skills. With expertise in React, HTML, CSS, JavaScript, etc. he has a keen eye for creating seamless, user-friendly interfaces that are both functional and visually appealing. His ability to solve complex problems and optimize web performance sets him apart. Aman is not only technically skilled but also an excellent communicator and team player. He collaborates effortlessly with design and back-end teams, always bringing a positive attitude and strong problem-solving mindset to the table. I highly recommend Aman for any front-end development role.",
    name: "Amit Ghadge",
    designation: "SDE 3 | AI Engineer | Frontend Engineer",
    company: "Applied AI Consulting LLP",
  },
  {
    testimonial:
      "I had the pleasure of working with Aman at Amdocs. He is highly professional, with a strong grasp of all the technologies. Aman is always willing to help and support other colleagues. Highly recommend!",
    name: "Matan Elmaliach",
    designation: "Fullstack/Frontend Developer",
    company: "Amdocs",
    image: matan,
  },
];

// Cortexa's image (src/assets/ai-agents-network.png) is "Networked Agents" by
// Mceoin, via Wikimedia Commons, CC BY-SA 4.0 (attribution required):
// https://commons.wikimedia.org/wiki/File:Networked_Agents.png
// Vega's image (src/assets/trading-terminal.png) is "Qtstalker candlestick
// chart" by user:yndesai, via Wikimedia Commons, CC0 (no attribution required):
// https://commons.wikimedia.org/wiki/File:Qtstalker_candlestick_chart.png
const projects = [
  {
    name: "Cortexa",
    description:
      "A personal AI-native developer platform: an agent-orchestration kernel with multi-LLM routing, semantic memory, and a built-in IDE experience for running AI coding agents end-to-end.",
    tags: [
      {
        name: "ai",
        color: "pink-text-gradient",
      },
      {
        name: "agents",
        color: "green-text-gradient",
      },
      {
        name: "llm",
        color: "blue-text-gradient",
      },
    ],
    image: aiAgentsNetwork,
  },
  {
    name: "Vega",
    description:
      "A multi-market trading terminal combining real-time broker data, technical-analysis indicators, an automated signal scanner, and a full auto-entry/auto-exit execution engine in one browser-based interface — broker-agnostic across Dhan and IndMoney.",
    tags: [
      {
        name: "vue",
        color: "green-text-gradient",
      },
      {
        name: "python",
        color: "blue-text-gradient",
      },
      {
        name: "trading",
        color: "pink-text-gradient",
      },
    ],
    image: tradingTerminal,
  },
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
  moreTech,
  additionalSkills,
  experiences,
  testimonials,
  projects,
  certifications,
};
