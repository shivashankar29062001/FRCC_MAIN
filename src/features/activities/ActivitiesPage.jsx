// ---------------------------------------------------------------------------
// /src/features/activities/ActivitiesPage.jsx — Activities Landing Page
// ---------------------------------------------------------------------------

import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

export function ActivitiesPage() {
  return <ServiceLanding service="activities" hero={<ServiceHero service="activities" />} />;
}

export default ActivitiesPage;