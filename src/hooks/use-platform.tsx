
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const [platform, setPlatform] = useState({
    isNative: false,
    isAndroid: false,
    isIOS: false,
    isMobile: false
  });

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = Capacitor.getPlatform() === 'android';
    const isIOS = Capacitor.getPlatform() === 'ios';
    const isMobile = isAndroid || isIOS || window.innerWidth < 768;

    setPlatform({
      isNative,
      isAndroid,
      isIOS,
      isMobile
    });
  }, []);

  return platform;
};
