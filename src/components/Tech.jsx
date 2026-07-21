import { BallCanvas } from "./canvas";
import { SectionWrapper } from "../hoc";
import { technologies, moreTech, additionalSkills } from "../constants";

const Tech = () => {
  return (
    <>
      <div className='flex flex-row flex-wrap justify-center gap-10'>
        {technologies.map((technology) => (
          <div className='w-28 h-28' key={technology.name}>
            <BallCanvas icon={technology.icon} />
          </div>
        ))}
      </div>

      <div className='mt-10 flex flex-wrap justify-center gap-4'>
        {moreTech.map((tech) => (
          <div
            key={tech.name}
            className='flex items-center gap-2 bg-tertiary border border-black-200 shadow-card rounded-full px-4 py-2'
          >
            <img src={tech.icon} alt={tech.name} className='w-6 h-6 object-contain' />
            <span className='text-white-100 text-[13px]'>{tech.name}</span>
          </div>
        ))}
      </div>

      <div className='mt-16 flex flex-col gap-6 max-w-4xl mx-auto'>
        {additionalSkills.map((group) => (
          <div key={group.category}>
            <p className='text-secondary text-[13px] uppercase tracking-wider mb-2'>
              {group.category}
            </p>
            <div className='flex flex-wrap gap-2'>
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className='bg-tertiary border border-black-200 text-white-100 text-[13px] px-3 py-1.5 rounded-full'
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "");
