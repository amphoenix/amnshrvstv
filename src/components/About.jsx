import React from "react";
import Tilt from "react-tilt";
import { motion } from "framer-motion";

import { styles } from "../styles";
import { services } from "../constants";
import { SectionWrapper } from "../hoc";
import { fadeIn, textVariant } from "../utils/motion";

const ServiceCard = ({ index, title, icon }) => (
  <Tilt className='xs:w-[250px] w-full'>
    <motion.div
      variants={fadeIn("right", "spring", index * 0.5, 0.75)}
      className='w-full green-pink-gradient p-[1px] rounded-[20px] shadow-card'
    >
      <div
        options={{
          max: 45,
          scale: 1,
          speed: 450,
        }}
        className='bg-tertiary rounded-[20px] py-5 px-12 min-h-[280px] flex justify-evenly items-center flex-col'
      >
        <img
          src={icon}
          alt='web-development'
          className='w-16 h-16 object-contain'
        />

        <h3 className='text-white text-[20px] font-bold text-center'>
          {title}
        </h3>
      </div>
    </motion.div>
  </Tilt>
);

const calculateExperience = (startYear, startMonth, startDay, gapYears = 0) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() is zero-based
  const currentDay = currentDate.getDate();

  let years = currentYear - startYear;
  let months = currentMonth - startMonth;
  let days = currentDay - startDay;

  if (days < 0) {
    months--;
    days += new Date(currentYear, currentMonth - 1, 0).getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  years -= gapYears; // subtract the gap years

  const experience = years + months / 100; // divide by 100 instead of 12
  return experience.toFixed(2);
}

const About = () => {
  const experience = calculateExperience(2018, 12, 28, 1); // replace with your start year, month, day, and gap years

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>Introduction</p>
        <h2 className={styles.sectionHeadText}>Overview.</h2>
      </motion.div>

      <motion.p
        variants={fadeIn("", "", 0.1, 1)}
        className='mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]'
      >
        Seasoned Full Stack Web Developer having <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{experience} years</span> of 
        experience in translating designs to code using React.js with TypeScript,
        JavaScript, Redux, HTML5, SASS, CSS3. Skilled in backend development using Node.js,
        Express.js, and database like MongoDB & PostgreSQL. Experienced in modern workflow tools,
        module bundling via Webpack and version control via Git/Perforce.<br />
        I'm a quick learner and collaborate closely with clients to
        create efficient, scalable, and user-friendly solutions that solve
        real-world problems. Let's work together to bring your ideas to life!
      </motion.p>

      <div className='mt-20 flex flex-wrap gap-10'>
        {services.map((service, index) => (
          <ServiceCard key={service.title} index={index} {...service} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(About, "about");
