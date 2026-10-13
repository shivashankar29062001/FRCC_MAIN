import { useCallback, useEffect, useState } from 'react';

/**
 * Simulates an async read so every data-driven page can render the three
 * required states: loading → (empty | content) and error (with retry).
 * TODO(Phase 2): replace `loader` with a real fetch('/api/...') call.
 *
 * @param {() => any} loader
 * @param {{ delay?: number, deps?: any[], fail?: boolean }} [options]
 */
export function useMockQuery(loader, options = {}) {
  const { delay = 350, deps = [], fail = false } = options;
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', data: null });
    const t = setTimeout(() => {
      if (!alive) return;
      if (fail) {
        // TODO(Phase 2): map real API/network errors to a friendly message.
        setState({ loading: false, error: 'We could not load this section right now.', data: null });
        return;
      }
      try {
        setState({ loading: false, error: '', data: loader() });
      } catch (e) {
        setState({ loading: false, error: e?.message || 'Unexpected error.', data: null });
      }
    }, delay);
    return () => { alive = false; clearTimeout(t); };
    // `deps` is intentionally caller-controlled, so it is spread into the list.
  }, [...deps, attempt, fail, delay]);

  return { ...state, retry };
}
