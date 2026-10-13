import { RedirectIntro } from '../../components/RedirectIntro.jsx';
import { IMAGES } from '../../config/images.js';

export function HallPage() {
  return (
    <RedirectIntro
      redirectKey="hall"
      bannerImage={IMAGES.bannerHall}
    />
  );
}

export default HallPage;