import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NotFound from "./pages/notFound/NotFound";

const Home = lazy(() => import("./pages/home/Home"));
const StudyPage = lazy(() => import("./pages/study/StudyPage"));

const PageFallback = () => (
  <div className='min-h-screen flex items-center justify-center bg-primary'>
    <span className='canvas-loader' />
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/prep' element={<StudyPage />} />
          <Route path='/prep/:category' element={<StudyPage />} />
          <Route path='/prep/:category/:fileId' element={<StudyPage />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
