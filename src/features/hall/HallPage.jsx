// ---------------------------------------------------------------------------
// /src/features/hall/HallPage.jsx — Halls Landing Page
// ---------------------------------------------------------------------------

import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

export function HallPage() {
  return <ServiceLanding service="halls" hero={<ServiceHero service="hall" />} />;
}

export default HallPage;