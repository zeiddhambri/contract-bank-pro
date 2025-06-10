
import React from 'react';
import { FileText, Shield } from 'lucide-react';

const Logo = () => {
  return (
    <div className="relative">
      {/* Main logo container with dramatic gradient */}
      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-600 to-slate-900 rounded-lg shadow-2xl flex items-center justify-center relative overflow-hidden border border-orange-500/20">
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-orange-300/10 to-red-400/20 rounded-lg" />
        
        {/* Main document icon */}
        <div className="relative z-10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-white drop-shadow-lg" strokeWidth={2.5} />
        </div>
        
        {/* Small shield icon overlay for security/legal aspect */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-xl border border-white/20">
          <Shield className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
        
        {/* Dramatic glow effect */}
        <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(251,146,60,0.3)]" />
      </div>
      
      {/* Hover pulse animation */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-600/30 animate-pulse opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
};

export default Logo;
