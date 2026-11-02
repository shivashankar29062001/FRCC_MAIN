import { useEffect, useRef, useState } from 'react';

/**
 * Reusable TypeWriter component
 * Props:
 * - text: string (typed out once or looped)
 * - phrases: array of strings (cycles through phrases in a typing loop)
 * - speed: typing speed in ms per character (default 55)
 * - deleteSpeed: backspacing speed in ms per character (default 30)
 * - holdTime: pause in ms after completing a phrase before deleting (default 1600)
 * - startDelay: initial delay in ms before typing starts (default 0)
 * - loop: boolean (whether to loop)
 * - showCursor: boolean (whether to render cursor bar, default false)
 * - caretFadeDelay: delay in ms before single-text cursor fades out when showCursor is true (default 1500)
 * - onComplete: callback called when full text or phrase finishes typing
 * - className: optional CSS class string
 */
export function TypeWriter({
  text = '',
  phrases = null,
  speed = 55,
  deleteSpeed = 30,
  holdTime = 1600,
  startDelay = 0,
  loop = false,
  showCursor = false,
  caret,
  caretFadeDelay = 1500,
  onComplete,
  className = '',
}) {
  const hasCursor = typeof showCursor === 'boolean' ? (showCursor || Boolean(caret)) : Boolean(caret);
  const phraseList = Array.isArray(phrases) && phrases.length > 0 ? phrases : [text];
  const fullText = Array.isArray(phrases) && phrases.length > 0 ? phrases.join(' ') : text;
  const isLooping = loop || (Array.isArray(phrases) && phrases.length > 1);

  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(() => (reducedMotion ? (phraseList[0] || '') : ''));
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(() => !reducedMotion && hasCursor);
  const [cursorFading, setCursorFading] = useState(false);

  const timeoutRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e) => setReducedMotion(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedText(phraseList[0] || '');
      setCursorVisible(false);
      onCompleteRef.current?.();
      return undefined;
    }

    const currentPhrase = phraseList[phraseIndex] || '';

    if (!isDeleting) {
      if (displayedText.length < currentPhrase.length) {
        const isFirstChar = displayedText === '' && phraseIndex === 0;
        const delay = isFirstChar && startDelay > 0 ? startDelay : speed;
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, delay);
      } else {
        onCompleteRef.current?.();

        if (isLooping) {
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true);
          }, holdTime);
        } else if (hasCursor && caretFadeDelay > 0) {
          timeoutRef.current = setTimeout(() => {
            setCursorFading(true);
            timeoutRef.current = setTimeout(() => {
              setCursorVisible(false);
            }, 400);
          }, caretFadeDelay);
        }
      }
    } else {
      if (displayedText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
        }, deleteSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phraseList.length);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayedText, isDeleting, phraseIndex, reducedMotion, isLooping, speed, deleteSpeed, holdTime, startDelay, hasCursor, caretFadeDelay]);

  return (
    <span className={`inline-block min-h-[1.2em] ${className}`.trim()}>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden="true">
        {displayedText || <span className="invisible select-none">&nbsp;</span>}
        {hasCursor && cursorVisible && (
          <span
            className={`inline-block ml-0.5 font-light select-none text-current ${
              cursorFading ? 'opacity-0 transition-opacity duration-400 ease-out' : ''
            }`}
            aria-hidden="true"
          >
            |
          </span>
        )}
      </span>
    </span>
  );
}

export default TypeWriter;
