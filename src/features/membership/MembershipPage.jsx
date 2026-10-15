// ---------------------------------------------------------------------------
// /src/features/membership/MembershipPage.jsx — Membership Landing Page
// ---------------------------------------------------------------------------

import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

export function MembershipLandingPage() {
  return <ServiceLanding service="membership" hero={<ServiceHero service="membership" />} />;
}

export const MembershipPage = MembershipLandingPage;
export default MembershipLandingPage;