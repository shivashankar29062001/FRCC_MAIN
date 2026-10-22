import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { XIcon } from '../../components/ui/icons.jsx';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const { user } = useApp();
  const [modalState, setModalState] = useState({ isOpen: false, next: '' });
  const navigate = useNavigate();

  // Signed in users never see the modal
  useEffect(() => {
    if (user && modalState.isOpen) {
      setModalState({ isOpen: false, next: '' });
    }
  }, [user, modalState.isOpen]);

  const openAuthPrompt = useCallback((nextUrl = '') => {
    if (user) return false;
    setModalState({ isOpen: true, next: nextUrl });
    return true;
  }, [user]);

  const closeAuthPrompt = useCallback(() => {
    setModalState({ isOpen: false, next: '' });
    try {
      if (typeof window !== 'undefined' && (window.history.state?.usr?.authPrompt || window.history.state?.authPrompt)) {
        const cleanUsr = { ...(window.history.state?.usr || {}) };
        delete cleanUsr.authPrompt;
        const nextHistoryState = { ...window.history.state, usr: cleanUsr };
        delete nextHistoryState.authPrompt;
        window.history.replaceState(nextHistoryState, '', window.location.pathname + window.location.search);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const goToSignIn = useCallback(() => {
    const nextUrl = modalState.next;
    closeAuthPrompt();
    if (nextUrl) {
      try {
        window.sessionStorage.setItem('frcc.postLoginRedirect.v1', nextUrl);
      } catch {
        /* ignore */
      }
      navigate(`/signin?from=${encodeURIComponent(nextUrl)}`, { state: { from: nextUrl } });
    } else {
      navigate('/signin');
    }
  }, [modalState.next, closeAuthPrompt, navigate]);

  const goToSignUp = useCallback(() => {
    const nextUrl = modalState.next;
    closeAuthPrompt();
    if (nextUrl) {
      try {
        window.sessionStorage.setItem('frcc.postLoginRedirect.v1', nextUrl);
      } catch {
        /* ignore */
      }
      navigate(`/signup?from=${encodeURIComponent(nextUrl)}`, { state: { from: nextUrl } });
    } else {
      navigate('/signup');
    }
  }, [modalState.next, closeAuthPrompt, navigate]);

  // Handle Esc key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && modalState.isOpen) {
        closeAuthPrompt();
      }
    }
    if (modalState.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalState.isOpen, closeAuthPrompt]);

  const contextValue = useMemo(() => ({
    openAuthPrompt,
    closeAuthPrompt,
    isAuthPromptOpen: modalState.isOpen,
  }), [openAuthPrompt, closeAuthPrompt, modalState.isOpen]);

  const modalMarkup = modalState.isOpen && !user ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-xs animate-fade-in"
      onClick={closeAuthPrompt}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button with large click target, high contrast, cursor-pointer */}
        <button
          type="button"
          onClick={closeAuthPrompt}
          aria-label="Close dialog"
          className="absolute right-3.5 top-3.5 p-2.5 rounded-xl text-slate-500 hover:text-navy-950 hover:bg-slate-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <XIcon className="h-5 w-5" strokeWidth={2.5} />
        </button>

        {/* Modal Title & Text */}
        <h2 id="auth-prompt-title" className="font-display text-2xl font-bold text-navy-900 pr-8">
          Sign in to book
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Create a free account or sign in to complete your booking.
        </p>

        {/* Actions: Gold Sign in and Outline Sign up */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={goToSignIn}
            className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 font-semibold px-5 py-2.5 text-sm rounded-xl w-full justify-center transition shadow-sm cursor-pointer"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={goToSignUp}
            className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 font-semibold px-5 py-2.5 text-sm rounded-xl w-full justify-center transition cursor-pointer"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <AuthModalContext.Provider value={contextValue}>
      {children}
      {typeof document !== 'undefined' && modalMarkup ? createPortal(modalMarkup, document.body) : modalMarkup}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    return {
      openAuthPrompt: () => false,
      closeAuthPrompt: () => {},
      isAuthPromptOpen: false,
    };
  }
  return ctx;
}
