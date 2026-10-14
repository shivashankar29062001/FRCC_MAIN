import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { IMAGES } from '../../config/images.js';

export function ActivitiesPage() {
  return (
    <RedirectIntro
      redirectKey="activities"
      bannerImage={IMAGES.bannerActivities}
      hero={<ServiceHero service="activities" />}
    />
  );
}

export default ActivitiesPage;