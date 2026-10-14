import { useState } from 'react';

const logoModules = import.meta.glob('../assets/frcc-logo*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function getLogoUrl(filename) {
  for (const [path, url] of Object.entries(logoModules)) {
    if (path.endsWith(filename)) {
      return url;
    }
  }
  return null;
}

export function Logo({ variant = 'emblem', size = 48, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const isLockup = variant === 'lockup';

  let src = null;
  if (isLockup) {
    src = getLogoUrl('frcc-logo-lockup.png');
  } else if (size <= 56) {
    src = getLogoUrl('frcc-logo-small.png') || getLogoUrl('frcc-logo.png');
  } else {
    src = getLogoUrl('frcc-logo.png') || getLogoUrl('frcc-logo-small.png');
  }

  if (!src || hasError) {
    return (
      <span
        aria-hidden="true"
        className={`grid place-items-center rounded-xl bg-navy-900 font-display font-bold text-gold-500 ${className}`.trim()}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${Math.max(14, Math.round(size * 0.42))}px`,
        }}
      >
        F
      </span>
    );
  }

  const width = size;
  const height = isLockup ? Math.round((size * 4) / 3) : size;

  return (
    <img
      src={src}
      alt="FRCC logo"
      width={width}
      height={height}
      onError={() => setHasError(true)}
      className={className}
      style={{
        width: `${width}px`,
        height: isLockup ? 'auto' : `${height}px`,
        objectFit: 'contain',
        display: 'inline-block',
      }}
    />
  );
}

export default Logo;
