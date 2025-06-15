
import React from 'react';
import { FileText } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary">
      <FileText className="h-6 w-6 text-secondary-foreground" />
    </div>
  );
};

export default Logo;
