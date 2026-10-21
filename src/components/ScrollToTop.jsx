import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures every new page starts scrolled to the top instantly.
 * - Only triggers on pathname changes (ignores search query or state changes).
 * - Temporarily overrides html scrollBehavior to 'auto' for instant jump.
 * - If a hash is provided and the target element exists, scrolls to that element.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    document.documentElement.style.scrollBehavior = prevScrollBehavior;
  }, [pathname]);

  return null;
}

export default ScrollToTop;
