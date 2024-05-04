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
  // {
  //   title: "React Native Developer",
  //   icon: mobile,
  // },
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

      "Designed and deployed a widely used micro-frontend architecture, renowned for adaptability and performance, across global telecom companies.",
      "Seamlessly integratedOpenAI API and AI solutions into existing products and services, optimizing functionality and enhancing user experience.",
      "Designed & developed scalable backend systems using Node & Express, leveraging Redis for caching, data retrieval speed by 40%.",
      "Implemented dynamic Redux store partitioning strategies to optimize performance and scalability in large-scale React applications.",
      "Led and mentored a team of junior professionals by actively contributing to the execution of task and resolving roadblocks faced by them.",
    ],
  },
  {
    title: "Software Engineer",
    company_name: "AAIC",
    icon: aaic,
    iconBg: "#fff",
    date: "Jun 2021 - March 2022",
    points: [
      "Independently Conceptualized,Developed, and Deployed a SkillSage project from Scratch to Deployment.",
      "Utilized HTML5, CSS3, TypeScript, React, Redux and RESTful APIs to build Frontend.",
      "Increased Lighthouse score from 50% to 80% by optimizing JS bundles. Integrated Razorpay API for seamless payment processing and leveraged Git for version control.",
      "Project garnered positive feedback from users and stakeholders, leading to a 40% increase in website traffic and a 25% rise in sales revenue.",
    ],
  },
  {
    title: "Web Developer",
    company_name: "Freelancer",
    icon: freelancer,
    iconBg: "#fff",
    date: "2021 - 2022",
    points: [
      "Handled enterprise security challenge: Cross-Site Scripting (XSS) Attack, Application Security.",
      "Incorporated role-based authentication using AWS services, and audio & video conferencing using Agora.",
    ],
  },
  {
    title: "Programmer Analyst",
    company_name: "Cognizant",
    icon: cts,
    iconBg: "#E6DEDD",
    date: "Dec 2018 - Apr 2020",
    points: [
      "Handled two projects concurrently while serving as Subject Matter Expert.",
      "Automated image optimization using Grunt, minified JS and CSS, reduced page load times; received early promotion ahead of schedule.",
      "Spearheaded redesign of the client's flagship app, resulting in a 20% increase in user engagement.",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
    name: "Sara Lee",
    designation: "CFO",
    company: "Acme Co",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    testimonial:
      "I've never met a web developer who truly cares about their clients' success like Rick does.",
    name: "Chris Brown",
    designation: "COO",
    company: "DEF Corp",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    testimonial:
      "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
    name: "Lisa Wang",
    designation: "CTO",
    company: "456 Enterprises",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
  },
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

export { services, technologies, experiences, testimonials, projects };
