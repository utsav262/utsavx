import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** New pages open at the top; back/forward keeps the browser's own scroll restore; #hash links still jump. */
export default function ScrollToTop() {
    const { pathname, hash } = useLocation();
    const navType = useNavigationType();
    useEffect(() => {
        if (hash || navType === 'POP') return;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname, hash, navType]);
    return null;
}
