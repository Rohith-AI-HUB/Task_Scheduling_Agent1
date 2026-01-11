import React from 'react';
import GeometricPattern from './GeometricPattern';

/**
 * AuthLayout Component
 *
 * Split-screen layout wrapper for authentication pages.
 * Left: Geometric pattern background
 * Right: Clean white background with form content
 *
 * Props:
 * - children: Content for the right panel (typically AuthFormCard)
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Geometric Pattern Background */}
      <div className="h-48 lg:h-screen lg:w-1/2 relative overflow-hidden">
        <GeometricPattern />
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex-1 lg:w-1/2 bg-[#F9FAFB] dark:bg-slate-800 flex items-center justify-center p-8 lg:p-12">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
