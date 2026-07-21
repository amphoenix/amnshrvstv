import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import { motion } from 'framer-motion';

import 'react-vertical-timeline-component/style.min.css';

import { styles } from '../styles';
import { experiences } from '../constants';
import { SectionWrapper } from '../hoc';
import { textVariant } from '../utils/motion';

const ExperienceCard = ({ experience }) => {
  return (
    <VerticalTimelineElement
      contentStyle={{
        background: '#ffffff',
        color: '#1a1a1a',
        boxShadow: '0px 8px 30px rgba(26, 26, 26, 0.12)',
      }}
      contentArrowStyle={{ borderRight: '7px solid #ffffff' }}
      date={experience.date}
      iconStyle={{ background: experience.iconBg }}
      icon={
        <div className='flex justify-center items-center w-full h-full'>
          <img
            src={experience.icon}
            alt={experience.company_name}
            className={`${
              experience.company_name === 'Flipkart'
                ? 'w-[100%] h-[100%]'
                : 'w-[60%] h-[60%]'
            } object-contain`}
          />
        </div>
      }
    >
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h3 className='text-white-100 text-[24px] font-bold'>{experience.title}</h3>
          <p
            className='text-secondary text-[16px] font-semibold'
            style={{ margin: 0 }}
          >
            {experience.company_name}
          </p>
          {experience.stack && (
            <p className='text-secondary text-[13px] italic mt-1'>
              Tech Stack: {experience.stack}
            </p>
          )}
        </div>

        {experience.award && (
          <img
            src={experience.award.image}
            alt={experience.award.label}
            title={experience.award.label}
            className='w-14 h-14 flex-shrink-0 object-cover shadow-card hover:scale-110 transition-transform'
            style={{
              clipPath:
                "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }}
          />
        )}
      </div>

      <ul className='mt-5 list-disc ml-5 space-y-2'>
        {experience.points.map((point, index) => (
          <li
            key={`experience-point-${index}`}
            className='text-white-100 text-[14px] pl-1 tracking-wider'
          >
            {point}
          </li>
        ))}
      </ul>
    </VerticalTimelineElement>
  );
};

const Experience = () => {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={`${styles.sectionSubText} text-center`}>
          What I have done so far
        </p>
        <h2 className={`${styles.sectionHeadText} text-center`}>
          Work Experience.
        </h2>
      </motion.div>

      <div className='mt-20 flex flex-col'>
        <VerticalTimeline>
          {experiences.map((experience, index) => (
            <ExperienceCard
              key={`experience-${index}`}
              experience={experience}
            />
          ))}
        </VerticalTimeline>
      </div>
    </>
  );
};

export default SectionWrapper(Experience, 'work');
