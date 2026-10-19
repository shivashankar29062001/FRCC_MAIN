import React from 'react';

/**
 * FRCC Brand Logo component
 * Features the official Film Recreation & Cultural Centre emblem and full logo.
 *
 * @param {'emblem' | 'full' | 'footer'} [variant='emblem']
 * @param {number} [size]
 * @param {string} [className]
 * @param {string} [alt]
 */
export default function Logo({
  variant = 'emblem',
  size,
  className = '',
  alt = 'Film Recreation & Cultural Centre — FRCC',
}) {
  const defaultSizeMap = {
    emblem: 44,
    full: 200,
    footer: 36,
  };
  const s = size || defaultSizeMap[variant] || 44;

  if (variant === 'full') {
    return (
      <img
        src="/images/brand/frcc-logo-transparent.png"
        alt={alt}
        style={{ width: `${s}px`, height: 'auto' }}
        className={`inline-block object-contain max-w-full select-none ${className}`}
        loading="eager"
      />
    );
  }

  // 'emblem', 'footer', or custom icon size
  return (
    <img
      src="/images/brand/frcc-emblem.png"
      alt={alt}
      style={{ width: `${s}px`, height: `${s}px` }}
      className={`inline-block object-contain rounded-full shadow-sm select-none ${className}`}
      loading="eager"
    />
  );
}