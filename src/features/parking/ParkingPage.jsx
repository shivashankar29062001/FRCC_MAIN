// ---------------------------------------------------------------------------
// /src/features/parking/ParkingPage.jsx — Parking Landing Page
// ---------------------------------------------------------------------------

import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

export function ParkingPage() {
  return <ServiceLanding service="parking" hero={<ServiceHero service="parking" />} />;
}

export default ParkingPage;