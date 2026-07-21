import { BrowserRouter, Routes, Route } from "react-router-dom";

import { About, Contact, Experience, Feedbacks, Hero, Navbar, Tech, Works, Footer } from "./components";
import Shapes from "./components/Shapes";
import StudyPage from "./pages/study/StudyPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/'
          element={
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
          }
        />
        <Route path='/study' element={<StudyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
