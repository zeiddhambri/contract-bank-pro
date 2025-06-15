
import React from 'react';
import { FileText } from 'lucide-react';

const Logo = () => {
  return (
    <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-105">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <FileText className="h-6 w-6 text-primary-foreground relative z-10" />
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/50 to-transparent blur opacity-30"></div>
    </div>
  );
};

export default Logo;
