
import React from 'react';
import { Briefcase } from 'lucide-react';

const AppLogo = () => {
  return (
    <div className="relative flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent"></div>
      <Briefcase className="h-5 w-5 text-primary-foreground relative z-10" />
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary/40 to-transparent blur opacity-25"></div>
    </div>
  );
};

export default AppLogo;
