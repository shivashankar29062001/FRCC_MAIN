import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { IMAGES } from '../../config/images.js';

export function HotelPage() {
  return (
    <RedirectIntro
      redirectKey="hotel"
      bannerImage={IMAGES.bannerHotel}
    />
  );
}

export default HotelPage;