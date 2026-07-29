import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-center p-6">
      <h1 className="text-6xl text-white-100 font-bold mb-4">404</h1>
      <p className="text-lg text-secondary mb-6">Sorry, the page you were looking for doesn't exist.</p>
      <Link to="/" className="text-teal-500 text-secondary underline">Return home</Link>
    </div>
  );
}