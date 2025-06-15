
import React from 'react';
import { FileText, Shield } from 'lucide-react';

const Logo = () => {
  return (
    <div className="relative group">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-gray-900 rounded-lg shadow-2xl flex items-center justify-center relative overflow-hidden border border-blue-500/20 transition-all duration-300 group-hover:scale-110">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-300/10 to-indigo-400/20 rounded-lg" />
        <div className="relative z-10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-white drop-shadow-lg" strokeWidth={2.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-xl border border-white/20">
          <Shield className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </div>
        <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  );
};

export default Logo;
