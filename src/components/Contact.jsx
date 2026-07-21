import { motion } from "framer-motion";
import { styles } from "../styles";
import { EarthCanvas, StarsCanvas } from "./canvas";
import { SectionWrapper } from "../hoc";
import { slideIn } from "../utils/motion";

const Contact = () => {
  return (
    <div className='xl:mt-12 flex xl:flex-row flex-col-reverse gap-10 overflow-hidden'>
      <motion.div
        variants={slideIn("left", "tween", 0.2, 1)}
        className='flex-[0.75] bg-tertiary border border-black-200 shadow-card p-8 rounded-2xl'
      >
        <p className={styles.sectionSubText}>Get in touch</p>
        <button
          className={styles.sectionHeadText}
          onClick={() => window.open("https://topmate.io/amnshrvstv", "_blank", "noopener,noreferrer")}
        >
          Let&apos;s Talk?? Click me!
        </button>
      </motion.div>

      <motion.div
        variants={slideIn("right", "tween", 0.2, 1)}
        className='xl:flex-1 xl:h-auto md:h-[550px] h-[350px] relative rounded-2xl overflow-hidden bg-[#0b0f1a]'
      >
        <StarsCanvas />
        <EarthCanvas />
      </motion.div>
    </div>
  );
};

export default SectionWrapper(Contact, "contact");
