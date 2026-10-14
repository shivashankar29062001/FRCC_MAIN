import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { IMAGES } from '../../config/images.js';

export function HotelPage() {
  return (
    <RedirectIntro
      redirectKey="hotel"
      bannerImage={IMAGES.bannerHotel}
      hero={<ServiceHero service="stay" />}
    />
  );
}

export default HotelPage;