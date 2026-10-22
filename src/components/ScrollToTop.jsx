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
    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      const scrollToElement = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      if (!scrollToElement()) {
        const timer = setTimeout(scrollToElement, 80);
        return () => clearTimeout(timer);
      }
    } else {
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
