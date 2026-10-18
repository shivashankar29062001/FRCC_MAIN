import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { XIcon } from '../components/ui/icons.jsx';

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

  function openAuthPrompt(nextUrl = '') {
    if (user) return false;
    setModalState({ isOpen: true, next: nextUrl });
    return true;
  }

  function closeAuthPrompt() {
    setModalState({ isOpen: false, next: '' });
  }

  function goToSignIn() {
    const nextUrl = modalState.next;
    closeAuthPrompt();
    if (nextUrl) {
      try {
        window.sessionStorage.setItem('frcc.postLoginRedirect.v1', nextUrl);
      } catch {
        /* ignore */
      }
      navigate('/signin', { state: { from: nextUrl } });
    } else {
      navigate('/signin');
    }
  }

  function goToSignUp() {
    const nextUrl = modalState.next;
    closeAuthPrompt();
    if (nextUrl) {
      try {
        window.sessionStorage.setItem('frcc.postLoginRedirect.v1', nextUrl);
      } catch {
        /* ignore */
      }
      navigate('/signup', { state: { from: nextUrl } });
    } else {
      navigate('/signup');
    }
  }

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
  }, [modalState.isOpen]);

  return (
    <AuthModalContext.Provider value={{ openAuthPrompt, closeAuthPrompt, isAuthPromptOpen: modalState.isOpen }}>
      {children}
      {modalState.isOpen && !user && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-prompt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70"
          onClick={closeAuthPrompt}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeAuthPrompt}
              aria-label="Close dialog"
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition"
            >
              <XIcon className="h-5 w-5" />
            </button>

            {/* Modal Title & Text */}
            <h2 id="auth-prompt-title" className="font-display text-2xl font-bold text-navy-900">
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
                className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 font-semibold px-5 py-2.5 text-sm rounded-xl w-full justify-center transition shadow-sm"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={goToSignUp}
                className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 font-semibold px-5 py-2.5 text-sm rounded-xl w-full justify-center transition"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      )}
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
