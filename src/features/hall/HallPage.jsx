import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { IMAGES } from '../../config/images.js';

export function HallPage() {
  return (
    <RedirectIntro
      redirectKey="hall"
      bannerImage={IMAGES.bannerHall}
      hero={<ServiceHero service="hall" />}
    />
  );
}

export default HallPage;