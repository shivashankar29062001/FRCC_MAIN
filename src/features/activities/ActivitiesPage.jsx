// ---------------------------------------------------------------------------
// /src/features/activities/ActivitiesPage.jsx — Activities Landing Page
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

export function ActivitiesPage() {
  // Clear any previous activities booking draft or confirmation when browsing activities
  useEffect(() => {
    try {
      window.sessionStorage.removeItem('frcc_activities_booking_draft');
      window.sessionStorage.removeItem('frcc_activities_confirmed');
    } catch (_) {}
  }, []);

  return <ServiceLanding service="activities" hero={<ServiceHero service="activities" />} />;
}

export default ActivitiesPage;