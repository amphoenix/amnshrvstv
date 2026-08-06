import { About, Contact, Experience, Feedbacks, Hero, Navbar, Tech, Works, Footer } from "../../components";
import Shapes from "../../components/Shapes";

const Home = () => (
  <div className='relative z-0 bg-primary'>
    <Shapes />
    <div className='bg-hero-pattern bg-cover bg-no-repeat bg-center'>
      <Navbar />
      <Hero />
    </div>
    <About />
    <Experience />
    <Tech />
    <Works />
    <Feedbacks />
    <Contact />
    <Footer />
  </div>
);

export default Home;
