import React from 'react';
import Tilt from 'react-tilt';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { certifications, services } from '../constants';
import { SectionWrapper } from '../hoc';
import { fadeIn, textVariant } from '../utils/motion';

const ServiceCard = ({ index, title, icon }) => (
  <Tilt className='xs:w-[250px] w-full'>
    <motion.div
      variants={fadeIn('right', 'spring', index * 0.5, 0.75)}
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

const CertificationCard = ({ index, title, icon, url }) => (
  <Tilt className='xs:w-[250px] w-full'>
    <a href={url} target='_blank' rel='noopener noreferrer'>
      <motion.div
        variants={fadeIn('up', 'easeOutCubic', index * 0.4, 0.5)}
        className='w-full purple-gradient p-[2px] rounded-[25px] shadow-md'
      >
        <div
          options={{
            max: 35,
            scale: 1.02,
            speed: 400,
          }}
          className='bg-dark rounded-[25px] py-6 px-10 min-h-[300px] flex justify-evenly items-center flex-col'
        >
          <img
            src={icon}
            alt={title}
            style={{ height: '150px' }}
            className='w-18 h-18 object-contain'
          />
        </div>
      </motion.div>
    </a>
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
};

const About = () => {
  const experience = calculateExperience(2018, 12, 28, 1); // replace with your start year, month, day, and gap years

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>Introduction</p>
        <h2 className={styles.sectionHeadText}>Overview.</h2>
      </motion.div>

      <motion.p
        variants={fadeIn('', '', 0.1, 1)}
        className='mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]'
      >
        AI Systems &amp; Full Stack Engineer with{' '}
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {experience} years
        </span>{' '}
        of experience building scalable, high-performance applications and
        intelligent platforms. Specialized in LLM-powered systems, RAG,
        Multimodal architectures, and parallel processing using Go. Strong
        expertise in React.js, TypeScript, PostgreSQL, and cloud-native
        deployments. Proven track record of modernizing legacy systems,
        optimizing performance, and designing low-hallucination AI workflows.
        Recognized for technical leadership and delivering production-grade
        AI-driven solutions.
      </motion.p>

      <div className='flex flex-wrap gap-10'>
        {certifications.map((certification, index) => (
          <CertificationCard
            key={certification.title}
            index={index}
            {...certification}
          />
        ))}
      </div>

      <div className='mt-20 flex flex-wrap gap-10'>
        {services.map((service, index) => (
          <ServiceCard key={service.title} index={index} {...service} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(About, 'about');
