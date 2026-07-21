import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className='relative w-full min-h-screen flex items-center'>
      <div className='relative z-10 max-w-7xl w-full mx-auto px-6 sm:px-16'>
        <div className='inline-block bg-tertiary/90 backdrop-blur-sm border border-black-200 shadow-card rounded-2xl px-8 py-8 max-w-xl'>
          <h1 className='font-extrabold text-[40px] xs:text-[50px] sm:text-[60px] lg:text-[64px] text-white-100'>
            Hey, I&apos;m Aman{" "}
            <motion.span
              className='inline-block origin-[70%_70%]'
              animate={{ rotate: [0, 20, -10, 20, -5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
            >
              👋
            </motion.span>
          </h1>
          <p className='mt-4 text-secondary text-[16px] sm:text-[20px] leading-[1.6]'>
            I build things for the web — frontend, backend, AI, and everything between.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
