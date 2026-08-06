import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-primary text-center p-6'>
      <p className='text-sm uppercase tracking-widest text-teal mb-3'>Error 404</p>
      <h1 className='text-7xl sm:text-8xl font-bold text-white-100 mb-4'>404</h1>
      <p className='text-lg text-secondary mb-10 max-w-md'>
        This page took a wrong turn. Head back to the portfolio, or dive into the study notes.
      </p>
      <div className='flex flex-col sm:flex-row gap-4'>
        <Link
          to='/'
          className='px-6 py-3 rounded-full bg-teal text-primary font-medium hover:bg-teal/90 transition-colors'
        >
          Back to Portfolio
        </Link>
        <Link
          to='/prep'
          className='px-6 py-3 rounded-full border border-teal text-white-100 font-medium hover:bg-teal/10 transition-colors'
        >
          Go to Study Notes
        </Link>
      </div>
    </div>
  );
}
