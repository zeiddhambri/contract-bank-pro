
import React from 'react';
import { FileText, Shield } from 'lucide-react';

const Logo = () => {
  return (
    <div className="relative">
      {/* Main logo container with gradient background */}
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 rounded-xl" />
        
        {/* Main document icon */}
        <div className="relative z-10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        
        {/* Small shield icon overlay for security/legal aspect */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
          <Shield className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-xl shadow-inner" />
      </div>
      
      {/* Optional: Add a subtle pulse animation for emphasis */}
      <div className="absolute inset-0 rounded-xl bg-blue-600/20 animate-pulse opacity-0 hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

export default Logo;
