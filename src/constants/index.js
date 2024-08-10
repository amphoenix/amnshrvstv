import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  html,
  css,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  git,
  figma,
  docker,
  cts,
  amdocs,
  aaic,
  freelancer,
  amnExchange,
  marxeed,
  docuphase,
  threejs,
  ai900,
  az900,
  matan
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
    title: "Web Developer",
    icon: web,
  },
  {
    title: "AI/ML Engineer",
    icon: mobile,
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
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
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
    name: "Redux Toolkit",
    icon: redux,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "git",
    icon: git,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "docker",
    icon: docker,
  },
];

const experiences = [
  {
    title: "Software Developer",
    company_name: "Amdocs",
    icon: amdocs,
    iconBg: "#383E56",
    date: "March 2022 - Present",
    points: [

      "Architected and deployed a micro - frontend system, leading to a 35 % reduction in page load times and improved scalability for global telecom clients.",
      "Integrated AI-driven features with the OpenAI API, enhancing product functionality and user engagement by 25%.",
      "Developed and optimized payment service using Node.js and Express.js, with Redis caching, resulting in a 40% improvement in data retrieval speeds.",
      "Implemented dynamic Redux store partitioning strategies to optimize performance and scalability in large-scale React applications.",
      "Led and mentored a team of junior professionals by actively contributing to the execution of task and resolving roadblocks faced by them.",
      "Achievements: Received Recognition Award and Employee of the Month for innovative solutions and leadership."
    ],
  },
  {
    title: "Software Engineer",
    company_name: "AAIC",
    icon: aaic,
    iconBg: "#fff",
    date: "Jun 2021 - March 2022",
    points: [
      "Spearheaded the full-cycle development of the SkillSage platform, an e-learning application that increased user engagement by 40% and improved conversion rates by 30%.",
      "Enhanced site performance by optimizing JavaScript bundles, resulting in a 30% increase in Lighthouse score.",
      "Integrated secure payment gateways using the Razorpay API, contributing to a 25% increase in sales revenue."
    ],
  },
  {
    title: "Web Developer",
    company_name: "Freelancer",
    icon: freelancer,
    iconBg: "#fff",
    date: "2021 - 2022",
    points: [
      "Developed and implemented role-based authentication systems using AWS services, enhancing security and user management.",
      "Managed enterprise security challenges, successfully mitigating Cross-Site Scripting (XSS) vulnerabilities.",
    ],
  },
  {
    title: "Programmer Analyst",
    company_name: "Cognizant",
    icon: cts,
    iconBg: "#E6DEDD",
    date: "Dec 2018 - Apr 2020",
    points: [
      "Automated image optimization processes, leading to a 15% reduction in page load times and an improved user experience..",
      "Led the redesign of a high-traffic application, incorporating React.js, which resulted in a 20% increase in user engagement and a 10% boost in customer satisfaction.",
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
    url: "https://learn.microsoft.com/en-us/users/kumaraman-6661/transcript/v0gm1f3exo8z94r?wt.mc_id=certnurture_eml14_email_wwl"
  },
  {
    title: "Microsoft Certified: Azure Fundamentals",
    icon: az900,
    url: "https://learn.microsoft.com/en-us/users/amnshrvstv/transcript/vn0o8trkp1k442z?ref=https%3A%2F%2Fwww.linkedin.com%2F"
  },
];

export { services, technologies, experiences, testimonials, projects, certifications };
