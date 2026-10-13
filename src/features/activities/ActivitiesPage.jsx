import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { IMAGES } from '../../config/images.js';

export function ActivitiesPage() {
  return (
    <RedirectIntro
      redirectKey="activities"
      bannerImage={IMAGES.bannerActivities}
    />
  );
}

export default ActivitiesPage;