import { useState, useEffect } from 'react';

export const useIsTablet = () => {
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 700px)');

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
