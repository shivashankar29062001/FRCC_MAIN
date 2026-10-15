// ---------------------------------------------------------------------------
// /src/components/RedirectIntro.jsx — Bridge to ServiceLanding
// ---------------------------------------------------------------------------

import { ServiceLanding } from './ServiceLanding.jsx';

export function RedirectIntro({ redirectKey, service, hero }) {
  const serviceKey = redirectKey || service || 'stay';
  return <ServiceLanding service={serviceKey} hero={hero} />;
}

export { ServiceLanding };
export default RedirectIntro;