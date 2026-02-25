import { useState, useEffect } from 'react';

export const useIsTablet = () => {
    const mediaQueryString = '(min-width: 700px) and (min-height: 600px)';
    
    const [isTablet, setIsTablet] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(mediaQueryString).matches : false
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(mediaQueryString);

        const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsTablet(e.matches);
        };

        // Initial check
        handleResize(mediaQuery);

        // Listen for changes
        mediaQuery.addEventListener('change', handleResize);

        return () => {
            mediaQuery.removeEventListener('change', handleResize);
        };
    }, []);

    return isTablet;
};
