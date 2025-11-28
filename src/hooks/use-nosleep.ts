import { useState, useEffect, useCallback, useRef } from 'react';
import NoSleep from 'nosleep.js';

interface NoSleepState {
  isActive: boolean;
  enable: () => Promise<void>;
  disable: () => void;
}

export function useNoSleep(): NoSleepState {
  const [isActive, setIsActive] = useState(false);
  const noSleepRef = useRef<NoSleep | null>(null);

  useEffect(() => {
    noSleepRef.current = new NoSleep();
    
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  const enable = useCallback(async (): Promise<void> => {
    if (noSleepRef.current) {
      try {
        await noSleepRef.current.enable();
        setIsActive(true);
      } catch (err) {
        console.warn('NoSleep enable failed:', err);
      }
    }
  }, []);

  const disable = useCallback((): void => {
    if (noSleepRef.current) {
      noSleepRef.current.disable();
      setIsActive(false);
    }
  }, []);

  return { isActive, enable, disable };
}
