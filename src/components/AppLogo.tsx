
import React from 'react';
import { Briefcase } from 'lucide-react';

const AppLogo = () => {
  return (
    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary">
      <Briefcase className="h-5 w-5 text-primary-foreground" />
    </div>
  );
};

export default AppLogo;
