import { useLocationModal } from '../../app/context/LocationModalContext.jsx';
import { MapPinIcon } from '../ui/icons.jsx';
import { cx } from '../../utils/helpers.js';

/**
 * Reusable clickable address or location trigger
 * Shows a map-pin icon and hover underline with cursor: pointer
 */
export function LocationTrigger({
  locationId,
  address,
  name,
  children,
  className = '',
  showIcon = true,
  iconClassName = 'mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500 group-hover:text-gold-400 transition-colors',
  as: Component = 'button',
  onClick: customOnClick,
}) {
  const { openLocation } = useLocationModal();

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (customOnClick) {
      customOnClick(e);
    }
    openLocation(locationId || { address, name });
  }

  const baseClasses =
    'group inline-flex items-start gap-1.5 cursor-pointer text-left transition-colors duration-150 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500 rounded';

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={handleClick}
      className={cx(baseClasses, className)}
      title="Click to view location and get directions"
      aria-label="View location and get directions on map"
    >
      {showIcon && <MapPinIcon className={iconClassName} aria-hidden="true" />}
      <span className="group-hover:underline">{children || address || name}</span>
    </Component>
  );
}

export default LocationTrigger;
