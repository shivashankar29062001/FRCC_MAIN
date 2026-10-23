// ---------------------------------------------------------------------------
// /src/config/images.js — THE ONLY FILE that defines images.
//
// Local files are loaded with Vite's import.meta.glob and matched to slots
// by name:
//
//   localFor('tennis') → first file whose lowercase name (without extension)
//                        includes 'tennis' (e.g. tennis.jpg), else null.
//
// Every image in the app gets its OWN slot id derived from the item:
//   · page heroes: hero-home, hero-stay, hero-halls, hero-activities,
//     hero-parking, hero-facilities, hero-membership
//   · each game by its id (badminton … football)
//   · each room by type (room-deluxe-lake-view …), each hall by id,
//     each zone by id, each membership plan (plan-silver …)
//   · gallery 1–8, each explore / service / facility / feature card
// No shared default photo anywhere: one slot, one photo (or null).
//
//   src = localFor(slot) || REMOTE[slot] || null
//
// REMOTE keeps every verified URL already in the file; a URL used by several
// slots is kept only where its subject fits best, the others are null (their
// SmartImage fallback shows the item's name until a local file is added).
//
// Each slot: { slot, name, src, srcSet, alt, game? }
//   - slot → unique slot id (localFor keyword + fallback label)
//   - name → item name shown by SmartImage's fallback tile
//   - src  → local file, else REMOTE fallback, else null (never another
//            slot's photo)
//   - game → true for game slots (fallback also shows a gold icon)
// ---------------------------------------------------------------------------

const local = import.meta.glob(['../assets/images/*.{jpg,jpeg,png,webp,avif}', '../assets/images/**/*.{jpg,jpeg,png,webp,avif}'], {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * URL of the first local image whose lowercase name (without extension)
 * matches `slot`. Prefers exact names over names that merely start with or include the slot.
 * Null when nothing matches.
 * @param {string} slot
 * @returns {string | null}
 */
export function localFor(slot) {
  const k = String(slot).toLowerCase();
  for (const path in local) {
    if (path.includes('/gallery/')) continue;
    const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase().replace(/\.[^.]+$/, '');
    if (name === k) return local[path];
  }
  for (const path in local) {
    if (path.includes('/gallery/')) continue;
    const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase().replace(/\.[^.]+$/, '');
    if (name.startsWith(k)) return local[path];
  }
  return null;
}

// ---------------------------------------------------------------------------
// REMOTE — one verified images.unsplash.com URL per slot
// (each fetched: HTTP 200, content-type image/*, free "Download free" photo,
// no Unsplash+ mark). Every URL appears ONCE in the whole file.
// ---------------------------------------------------------------------------

export const OBJECT_POSITIONS = {
  'hero-home': 'center 45%',
  'hero-dining': 'center 45%',
  'hero-halls': 'center 40%',
  'hero-stay': 'center 55%',
  'hero-parking': 'center 55%',
  'hero-gallery': 'center 45%',
  'hero-hub': 'center 50%',
  'hero-contact': 'center 50%',
  'hero-profile': 'center 50%',
  'hero-book': 'center 50%',
};

export function getObjectPosition(slot) {
  return OBJECT_POSITIONS[slot] || 'center 50%';
}

export const REMOTE = {
  'hero-home': 'https://images.unsplash.com/photo-1728051104503-e1a4a19d638c?w=2400&q=80&auto=format&fit=crop',
  'hero-stay': 'https://images.unsplash.com/photo-1762245308715-b721cf3267b6?w=2400&q=80&auto=format&fit=crop',
  'hero-book': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=2400&q=80&auto=format&fit=crop',
  'hero-dining': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=2400&q=80&auto=format&fit=crop',
  'dining-restaurant': 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1600&q=80&auto=format&fit=crop',
  'dining-coffee-shop': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80&auto=format&fit=crop',
  'dining-pub': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&q=80&auto=format&fit=crop',
  'dining-lounge-bar': 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1600&q=80&auto=format&fit=crop',
  'dining-rooftop-restaurant': 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1600&q=80&auto=format&fit=crop',
  'hero-halls': 'https://images.unsplash.com/photo-1783314867628-220ab03cac99?w=2400&q=80&auto=format&fit=crop',
  'hero-activities': 'https://images.unsplash.com/photo-1775993167284-8e6a6e56ab69?w=2400&q=80&auto=format&fit=crop',
  'hero-parking': 'https://images.unsplash.com/photo-1762599107107-14b8f4608011?w=2400&q=80&auto=format&fit=crop',
  'hero-facilities': 'https://images.unsplash.com/photo-1750859464437-b66433efd869?w=2400&q=80&auto=format&fit=crop',
  'hero-membership': 'https://images.unsplash.com/photo-1742844552718-758f8658351d?w=2400&q=80&auto=format&fit=crop',
  'hero-hub': 'https://images.unsplash.com/photo-1746549858455-2d8799c01d4b?w=2400&q=80&auto=format&fit=crop',
  'hero-profile': 'https://images.unsplash.com/photo-1756069596380-ea364729737c?w=2400&q=80&auto=format&fit=crop',
  'hero-bookings': 'https://images.unsplash.com/photo-1781512579593-2dad26fbe861?w=2400&q=80&auto=format&fit=crop',
  'hero-contact': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=2400&q=80&auto=format&fit=crop',
  exploreHotel: 'https://images.unsplash.com/photo-1638973140785-3b918e290682?w=2400&q=80&auto=format&fit=crop',
  'gallery-3': 'https://images.unsplash.com/photo-1720934016001-b057ebfd293d?w=2400&q=80&auto=format&fit=crop',
  facilitySpa: 'https://images.unsplash.com/photo-1730406928950-0047174d5fe3?w=2400&q=80&auto=format&fit=crop',
  galleryNight: 'https://images.unsplash.com/photo-1766164080257-f3ff48117148?w=2400&q=80&auto=format&fit=crop',
  hallStage: 'https://images.unsplash.com/photo-1771911654088-36080143c3bd?w=2400&q=80&auto=format&fit=crop',
  staySuite: 'https://images.unsplash.com/photo-1630888728969-5e43f55a7a18?w=2400&q=80&auto=format&fit=crop',
  tennis: 'https://images.unsplash.com/photo-1567220720374-a67f33b2a6b9?w=1600&q=80&auto=format&fit=crop',
  badminton: 'https://images.unsplash.com/photo-1783266503722-973f579d9b5a?w=1600&q=80&auto=format&fit=crop',
  cricket: 'https://images.unsplash.com/photo-1663832952954-170d73947ba7?w=1600&q=80&auto=format&fit=crop',
  'table-tennis': 'https://images.unsplash.com/photo-1572452734990-62a82b486fcf?w=1600&q=80&auto=format&fit=crop',
  volleyball: 'https://images.unsplash.com/photo-1757840093026-3b53d46f3f9b?w=1600&q=80&auto=format&fit=crop',
  chess: 'https://images.unsplash.com/photo-1713514117589-b3c9cc341131?w=1600&q=80&auto=format&fit=crop',
  carom: 'https://images.unsplash.com/photo-1617300067484-314ed2cfd9a6?w=1600&q=80&auto=format&fit=crop',
  'card-room': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=1600&q=80&auto=format&fit=crop',
  golf: 'https://images.unsplash.com/photo-1634140255781-e900c47ecf1f?w=1600&q=80&auto=format&fit=crop',
  'swimming-pool': 'https://images.unsplash.com/photo-1772519275437-3029ac1d3941?w=1600&q=80&auto=format&fit=crop',
  'kids-play-area': 'https://images.unsplash.com/photo-1763753743781-313e93737d46?w=1600&q=80&auto=format&fit=crop',
  football: 'https://images.unsplash.com/photo-1654462977797-a349656aadcf?w=1600&q=80&auto=format&fit=crop',
  facilityPool: 'https://images.unsplash.com/photo-1758448756167-88dc934c58e4?w=2400&q=80&auto=format&fit=crop',
  facilityRestaurant: 'https://images.unsplash.com/photo-1777502286570-2725dff09ce5?w=2400&q=80&auto=format&fit=crop',
  facilityGym: 'https://images.unsplash.com/photo-1758957646695-ec8bce3df462?w=2400&q=80&auto=format&fit=crop',
  'room-deluxe-lake-view': 'https://images.unsplash.com/photo-1641133639375-f71c3c1220a1?w=1600&q=80&auto=format&fit=crop',
  'room-executive-suite': 'https://images.unsplash.com/photo-1785815353984-0c479e1d11fd?w=1600&q=80&auto=format&fit=crop',
  'room-family-suite': 'https://images.unsplash.com/photo-1776500587879-5f8acadf4a69?w=1600&q=80&auto=format&fit=crop',
  'room-premium-twin': 'https://images.unsplash.com/photo-1790774883982-7136ce871bc5?w=1600&q=80&auto=format&fit=crop',
  'room-heritage-room': 'https://images.unsplash.com/photo-1768666197944-599ea736a4f7?w=1600&q=80&auto=format&fit=crop',
  'room-royal-suite': 'https://images.unsplash.com/photo-1668512624222-2e375314be39?w=1600&q=80&auto=format&fit=crop',
  'room-garden-view-room': 'https://images.unsplash.com/photo-1781962479780-b910226837a3?w=1600&q=80&auto=format&fit=crop',
  'room-river-view-deluxe': 'https://images.unsplash.com/photo-1713955941995-c59fc523b0ef?w=1600&q=80&auto=format&fit=crop',
  'room-poolside-villa': 'https://images.unsplash.com/photo-1774280960001-ce8169cfc38f?w=1600&q=80&auto=format&fit=crop',
  'room-family-riverside': 'https://images.unsplash.com/photo-1740324351912-b9189685ab1a?w=1600&q=80&auto=format&fit=crop',
  'room-standard-garden': 'https://images.unsplash.com/photo-1781572725438-ac8c41476752?w=1600&q=80&auto=format&fit=crop',
  'room-city-view-king': 'https://images.unsplash.com/photo-1786526818707-d28a60d7c21f?w=1600&q=80&auto=format&fit=crop',
  'room-executive-floor': 'https://images.unsplash.com/photo-1790774867869-0c65235f61d1?w=1600&q=80&auto=format&fit=crop',
  'room-rooftop-suite': 'https://images.unsplash.com/photo-1733829994889-4a224e674c7b?w=1600&q=80&auto=format&fit=crop',
  'room-eco-deluxe': 'https://images.unsplash.com/photo-1791444057586-ee2fe9a19571?w=1600&q=80&auto=format&fit=crop',
  'room-green-suite': 'https://images.unsplash.com/photo-1765862835282-cd3d9190d246?w=1600&q=80&auto=format&fit=crop',
  'room-canopy-villa': 'https://images.unsplash.com/photo-1710612198146-77512950a4b7?w=1600&q=80&auto=format&fit=crop',
  'room-officer-suite': 'https://images.unsplash.com/photo-1776763018821-8feeaeeee0a5?w=1600&q=80&auto=format&fit=crop',
  'room-vip-pavilion': 'https://images.unsplash.com/photo-1741850419928-aa65b3d5e3a6?w=1600&q=80&auto=format&fit=crop',
  'room-standard-official': 'https://images.unsplash.com/photo-1744534637336-6110864236fc?w=1600&q=80&auto=format&fit=crop',
  'hyd-grand-convention': 'https://images.unsplash.com/photo-1762765684673-d22ece602b10?w=1600&q=80&auto=format&fit=crop',
  'hyd-executive-boardroom': 'https://images.unsplash.com/photo-1777264935754-aa53096c2d68?w=1600&q=80&auto=format&fit=crop',
  'hyd-banquet-hall': 'https://images.unsplash.com/photo-1712314947761-a8d718bd8c32?w=1600&q=80&auto=format&fit=crop',
  'vja-convention-center': 'https://images.unsplash.com/photo-1770215962799-5ac2ce5a2813?w=1600&q=80&auto=format&fit=crop',
  'vja-function-hall': 'https://images.unsplash.com/photo-1745573674360-644c2edec427?w=1600&q=80&auto=format&fit=crop',
  'vja-meeting-rooms': 'https://images.unsplash.com/photo-1774186184398-1cc2da3d029e?w=1600&q=80&auto=format&fit=crop',
  'amr-capital-convention': 'https://images.unsplash.com/photo-1719753457285-d61d11305aff?w=1600&q=80&auto=format&fit=crop',
  'amr-garden-pavilion': 'https://images.unsplash.com/photo-1786113674644-eb36ad5a46ce?w=1600&q=80&auto=format&fit=crop',
  'amr-committee-rooms': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&q=80&auto=format&fit=crop',
  'hyd-basement': 'https://images.unsplash.com/photo-1758448721161-7b3df5ec04b3?w=1600&q=80&auto=format&fit=crop',
  'hyd-lakeside': 'https://images.unsplash.com/photo-1790272611944-e12b8a2fc8a2?w=1600&q=80&auto=format&fit=crop',
  'hyd-terrace': 'https://images.unsplash.com/photo-1643142314017-126b776f066a?w=1600&q=80&auto=format&fit=crop',
  'vja-multi-level': 'https://images.unsplash.com/photo-1753925765745-9e20b0e78bd1?w=1600&q=80&auto=format&fit=crop',
  'vja-riverfront': 'https://images.unsplash.com/photo-1560107107-557ddf20ac87?w=1600&q=80&auto=format&fit=crop',
  'vja-city-center': 'https://images.unsplash.com/photo-1726402599461-ba1715ccb745?w=1600&q=80&auto=format&fit=crop',
  'amr-eco-park': 'https://images.unsplash.com/photo-1761401438999-57f0ebef195e?w=1600&q=80&auto=format&fit=crop',
  'amr-secretariat': 'https://images.unsplash.com/photo-1640613061751-bf7a0693185a?w=1600&q=80&auto=format&fit=crop',
  'amr-capital-visitors': 'https://images.unsplash.com/photo-1673362720420-0ad5aaf41978?w=1600&q=80&auto=format&fit=crop',
  'frcc-membership': 'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=1600&q=80&auto=format&fit=crop',
  'gallery-1': 'https://images.unsplash.com/photo-1771911651523-e050dc4189ea?w=1600&q=80&auto=format&fit=crop',
  'gallery-2': 'https://images.unsplash.com/photo-1671362962572-50cf4edca731?w=1600&q=80&auto=format&fit=crop',
  'gallery-4': 'https://images.unsplash.com/photo-1667388969250-1c7220bf3f37?w=1600&q=80&auto=format&fit=crop',
  'gallery-5': 'https://images.unsplash.com/photo-1760722974657-f64bce2f9cc5?w=1600&q=80&auto=format&fit=crop',
  'gallery-6': 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1600&q=80&auto=format&fit=crop',
  'gallery-7': 'https://images.unsplash.com/photo-1753966597915-0291759f8d7f?w=1600&q=80&auto=format&fit=crop',
  'gallery-8': 'https://images.unsplash.com/photo-1776262438118-18e2a5613eca?w=1600&q=80&auto=format&fit=crop',
  exploreHall: 'https://images.unsplash.com/photo-1768851142332-75f3d1b47452?w=1600&q=80&auto=format&fit=crop',
  exploreCourts: 'https://images.unsplash.com/photo-1649706473901-69f5b7830241?w=1600&q=80&auto=format&fit=crop',
  explorePool: 'https://images.unsplash.com/photo-1775152928511-a18ed5197827?w=1600&q=80&auto=format&fit=crop',
  exploreRestaurant: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1600&q=80&auto=format&fit=crop',
  serviceHotel: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&q=80&auto=format&fit=crop',
  serviceHall: 'https://images.unsplash.com/photo-1768508951405-10e83c4a2872?w=1600&q=80&auto=format&fit=crop',
  serviceParking: 'https://images.unsplash.com/photo-1758448721043-2cc4eba0e483?w=1600&q=80&auto=format&fit=crop',
  serviceActivities: 'https://images.unsplash.com/photo-1559369064-c4d65141e408?w=1600&q=80&auto=format&fit=crop',
  serviceMembership: 'https://images.unsplash.com/photo-1779144639642-5e159954120e?w=1600&q=80&auto=format&fit=crop',
  hallFunction: 'https://images.unsplash.com/photo-1780337092772-d85ad9dc562c?w=1600&q=80&auto=format&fit=crop',
  membershipWide: 'https://images.unsplash.com/photo-1759038086701-234d7c43c227?w=1600&q=80&auto=format&fit=crop',
  visitEntrance: 'https://images.unsplash.com/photo-1761295909753-93a4e9e48695?w=2400&q=80&auto=format&fit=crop',
  hotelBathroom: 'https://images.unsplash.com/photo-1771929662486-f793e08f0f16?w=1600&q=80&auto=format&fit=crop',
  hotelBreakfast: 'https://images.unsplash.com/photo-1776267074168-9bf2f21ec4fa?w=1600&q=80&auto=format&fit=crop',
  hotelView: 'https://images.unsplash.com/photo-1718046254692-543196d7cba6?w=1600&q=80&auto=format&fit=crop',
  hotelReception: 'https://images.unsplash.com/photo-1757840615064-ec12011ebe84?w=1600&q=80&auto=format&fit=crop',
  hallWedding: 'https://images.unsplash.com/photo-1769812343775-85a27e6a076c?w=1600&q=80&auto=format&fit=crop',
  hallConference: 'https://images.unsplash.com/photo-1707553962455-3601c4607f72?w=1600&q=80&auto=format&fit=crop',
  hallCatering: 'https://images.unsplash.com/photo-1766547325390-44833aa5675b?w=1600&q=80&auto=format&fit=crop',
  galleryLounge: 'https://images.unsplash.com/photo-1790611180279-fe5a0c942797?w=1600&q=80&auto=format&fit=crop',
  eventFestival: 'https://images.unsplash.com/photo-1790595379794-beb5e8374425?w=1600&q=80&auto=format&fit=crop',
  eventSports: 'https://images.unsplash.com/photo-1723074832950-9fb031b0f4ec?w=1600&q=80&auto=format&fit=crop',
  membershipLounge: 'https://images.unsplash.com/photo-1781512579593-2dad26fbe861?w=2400&q=80&auto=format&fit=crop',
  membershipCard: 'https://images.unsplash.com/photo-1768396747960-ae6ba3c855bc?w=1600&q=80&auto=format&fit=crop',
  membershipEvents: 'https://images.unsplash.com/photo-1780680493115-5a0fea585450?w=1600&q=80&auto=format&fit=crop',
  membershipFitness: 'https://images.unsplash.com/photo-1721394747060-7cfc57104f88?w=1600&q=80&auto=format&fit=crop',
  authSignup: 'https://images.unsplash.com/photo-1752874068731-ac862330e666?w=1600&q=80&auto=format&fit=crop',
  authSignin: 'https://images.unsplash.com/photo-1760276148666-1fd62b875fa6?w=1600&q=80&auto=format&fit=crop',
  memberCardBg: 'https://images.unsplash.com/photo-1771226281112-b7119ef4112e?w=1600&q=80&auto=format&fit=crop',
  galleryPool: 'https://images.unsplash.com/photo-1623718649591-311775a30c43?w=1600&q=80&auto=format&fit=crop',
  galleryLobby: 'https://images.unsplash.com/photo-1746549858455-2d8799c01d4b?w=2400&q=80&auto=format&fit=crop',
  galleryRoom: 'https://images.unsplash.com/photo-1595327023008-bce2898309c0?w=1600&q=80&auto=format&fit=crop',
  galleryHall: 'https://images.unsplash.com/photo-1687213280116-234f93b15b44?w=1600&q=80&auto=format&fit=crop',
  galleryRestaurant: 'https://images.unsplash.com/photo-1774509627260-4f97e8cd1af1?w=1600&q=80&auto=format&fit=crop',
  galleryGarden: 'https://images.unsplash.com/photo-1771814494881-d4a22b02de71?w=1600&q=80&auto=format&fit=crop',
  galleryGym: 'https://images.unsplash.com/photo-1683758507025-6e74ad3ca1e5?w=1600&q=80&auto=format&fit=crop',
  galleryEvent: 'https://images.unsplash.com/photo-1784916484663-345ff1536cfd?w=1600&q=80&auto=format&fit=crop',
  gallerySports: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1600&q=80&auto=format&fit=crop',
  gallerySpa: 'https://images.unsplash.com/photo-1675149476008-83dbfa2ee917?w=1600&q=80&auto=format&fit=crop',
  exploreMoreHotel: 'https://images.unsplash.com/photo-1778597578392-cac5ee5113ce?w=1600&q=80&auto=format&fit=crop',
  exploreMoreHall: 'https://images.unsplash.com/photo-1775918427144-51f0bf53f8c4?w=1600&q=80&auto=format&fit=crop',
  exploreMoreParking: 'https://images.unsplash.com/photo-1749269532497-6aa8c01eb880?w=1600&q=80&auto=format&fit=crop',
  exploreMoreActivities: 'https://images.unsplash.com/photo-1518620025093-fbca064bdd9a?w=1600&q=80&auto=format&fit=crop',
  exploreMoreMembership: 'https://images.unsplash.com/photo-1790152370989-a9fdabb03c0e?w=1600&q=80&auto=format&fit=crop',
  bannerMembershipSection: 'https://images.unsplash.com/photo-1772208392422-bb2f2609097a?w=2400&q=80&auto=format&fit=crop',
  'banner-membership-section': 'https://images.unsplash.com/photo-1772208392422-bb2f2609097a?w=2400&q=80&auto=format&fit=crop',
  bannerProfile: 'https://images.unsplash.com/photo-1756069596380-ea364729737c?w=2400&q=80&auto=format&fit=crop',
  'banner-profile': 'https://images.unsplash.com/photo-1756069596380-ea364729737c?w=2400&q=80&auto=format&fit=crop',
  facilityGarden: 'https://images.unsplash.com/photo-1672791222207-9765d66c7d93?w=2400&q=80&auto=format&fit=crop',
  parkingEntry: 'https://images.unsplash.com/photo-1710140985320-bd660135863c?w=1600&q=80&auto=format&fit=crop',
  parkingEV: 'https://images.unsplash.com/photo-1761401429082-cec0cb4080b9?w=1600&q=80&auto=format&fit=crop',
  parkingSecurity: 'https://images.unsplash.com/photo-1772982059839-41f2747cce20?w=1600&q=80&auto=format&fit=crop',
  parkingValet: 'https://images.unsplash.com/photo-1739239130013-f8d430e8a147?w=1600&q=80&auto=format&fit=crop',
};

export const FALLBACK = {
  'hero-dining': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=2400&q=80&auto=format&fit=crop',
  'hero-home-2': REMOTE.exploreHotel,
  'hero-home-3': REMOTE.exploreHall,
  'hero-home-4': REMOTE.exploreCourts,
  'hero-home-5': REMOTE.facilityPool,
  'hero-hub-2': REMOTE.galleryLounge,
  'hero-hub-3': REMOTE.facilityRestaurant,
  'hero-hub-4': REMOTE.hallStage,
  'hero-hub-5': REMOTE.badminton,
  // TODO-REPLACE-SQUASH-BASKETBALL-PHOTO
  squash: REMOTE.badminton,
  basketball: REMOTE.tennis,
  'hero-events': REMOTE.membershipEvents || REMOTE.galleryEvent,
  'hero-contact': REMOTE['hero-contact'],
  'hero-book': REMOTE['hero-book'],
  'event-short-film-screening-night': REMOTE.membershipEvents,
  'event-classic-cinema-weekend': REMOTE.hallStage,
  'event-filmmakers-and-artists-meetup': REMOTE.galleryLounge,
  'event-acting-workshop': REMOTE.hallStage,
  'event-script-reading-circle': REMOTE.galleryLounge,
  'event-cultural-evening-music-and-dance': REMOTE.eventFestival,
};

export function heroSrc(slot) {
  return localFor(slot) || REMOTE[slot] || FALLBACK[slot] || null;
}

/**
 * Create an image slot: local file wins, else the REMOTE fallback, else FALLBACK, else null.
 * @param {string} slot   unique slot id (localFor keyword)
 * @param {string} name   item name for the SmartImage fallback tile
 * @param {string} alt    meaningful alt text
 * @param {object} [extra] extra flags (e.g. { game: true })
 */
const S = (slot, name, alt, extra = {}) => ({
  slot,
  name,
  src: localFor(slot) || REMOTE[slot] || FALLBACK[slot] || null,
  srcSet: '',
  alt,
  ...extra,
});

const GAME = (slot, name, alt) => S(slot, name, alt, { game: true });

// ---------------------------------------------------------------------------
// LANDING PAGE: the signed-out landing page (/) builds its hero, explore
// tiles, Stay / Halls / Activities sections, eight-photo gallery (lightbox)
// and Visit Us block from the slots below. Section pages use the room /
// hall / zone / plan / "More to explore" slots. Nothing else defines an
// image URL.
// ---------------------------------------------------------------------------

export const IMAGES = {

  // =========================================================================
  // HERO (landing) + SERVICE PAGE BANNERS (PageHeader)
  // =========================================================================

  hero: S('hero-home', 'FRCC Campus', 'FRCC campus aerial view'),
  'hero-home': S('hero-home', 'FRCC Campus', 'FRCC campus aerial view'),
  'hero-hub': S('hero-hub', 'Member Home', 'FRCC campus view'),
  'hero-stay': S('hero-stay', 'Stay', 'Wide view of the FRCC hotel entrance and grand lobby'),
  'hero-dining': S('hero-dining', 'Dining', 'FRCC dining venues'),
  'dining-restaurant': S('dining-restaurant', 'Restaurant', 'FRCC Restaurant multi-cuisine dining'),
  'dining-coffee-shop': S('dining-coffee-shop', 'Coffee Shop', 'FRCC Coffee Shop artisan brews and bakes'),
  'dining-pub': S('dining-pub', 'Pub', 'FRCC Pub evening drinks and bar bites'),
  'dining-lounge-bar': S('dining-lounge-bar', 'Lounge Bar', 'FRCC Lounge Bar evening cocktails and small plates'),
  'dining-rooftop-restaurant': S('dining-rooftop-restaurant', 'Rooftop Restaurant', 'FRCC Rooftop Restaurant open-air grills'),
  'hero-halls': S('hero-halls', 'Halls', 'Wide shot of the FRCC grand convention hall dressed for an event'),
  'hero-activities': S('hero-activities', 'Activities', 'Wide action shot of a badminton match inside the FRCC sports hall'),
  'hero-parking': S('hero-parking', 'Parking', 'Wide view of the FRCC covered parking deck'),
  'hero-facilities': S('hero-facilities', 'Support', 'FRCC reception desk with the lobby behind'),
  'hero-membership': S('hero-membership', 'Membership', 'FRCC members lounge with velvet armchairs and warm, upscale lighting'),
  'hero-profile': S('hero-profile', 'Profile', 'FRCC members lounge with warm lighting and comfortable seating'),
  'hero-membership-dashboard': S('hero-membership-dashboard', 'Membership Dashboard', 'FRCC members lounge with velvet armchairs and warm, upscale lighting'),
  'hero-bookings': S('hero-bookings', 'My Bookings', 'FRCC members lounge with sofas, flowers and soft candlelight'),
  'hero-contact': S('hero-contact', 'Support', 'FRCC front desk and reception lobby with helpful concierge'),
  'hero-book': S('hero-book', 'Book', 'FRCC campus view'),
  bannerHotel: S('hero-stay', 'Stay', 'Wide view of the FRCC hotel entrance and grand lobby'),
  bannerHall: S('hero-halls', 'Halls', 'Wide shot of the FRCC grand convention hall dressed for an event'),
  bannerParking: S('hero-parking', 'Parking', 'Wide view of the FRCC covered parking deck'),
  bannerActivities: S('hero-activities', 'Activities', 'Wide action shot of a badminton match inside the FRCC sports hall'),
  bannerMembership: S('hero-membership', 'Membership', 'FRCC members lounge with velvet armchairs and warm, upscale lighting'),
  bannerMembershipSection: S('banner-membership-section', 'Membership', 'FRCC members lounge with velvet armchairs and warm, upscale lighting'),
  bannerSupport: S('hero-facilities', 'Support', 'FRCC reception desk with the lobby behind'),
  bannerProfile: S('banner-profile', 'Profile', 'FRCC members lounge with warm lighting and comfortable seating'),

  // =========================================================================
  // EXPLORE ROW — five large photo cards (landing)
  // =========================================================================

  exploreHotel: S('exploreHotel', 'Stay', 'Grand FRCC hotel foyer with marble columns and a high ceiling'),
  exploreHall: S('exploreHall', 'Halls', 'FRCC grand convention hall dressed for a celebration'),
  exploreCourts: S('exploreCourts', 'Parking', 'FRCC indoor badminton courts in full play'),
  explorePool: S('explorePool', 'Activities', 'FRCC resort swimming pool with clear water and sun loungers'),
  exploreRestaurant: S('exploreRestaurant', 'Membership', 'FRCC fine-dining restaurant with velvet chairs and candlelit tables'),

  // =========================================================================
  // BOOKING HUB — five showcase cards (BookPage)
  // =========================================================================

  serviceHotel: S('serviceHotel', 'Stay', 'Bright FRCC hotel room with a made bed and large window'),
  serviceHall: S('serviceHall', 'Halls', 'Elegant FRCC banquet hall set with round tables under warm chandeliers'),
  serviceParking: S('serviceParking', 'Parking', 'Clean, well-lit FRCC car park with premium vehicles'),
  serviceActivities: S('serviceActivities', 'Activities', 'FRCC indoor games arena with a badminton match in play'),
  serviceMembership: S('serviceMembership', 'Membership', 'FRCC members lounge with velvet couches and warm lighting'),

  // =========================================================================
  // FACILITIES — feature cards (member home)
  // =========================================================================

  facilityPool: S('facilityPool', 'Infinity Pool', 'FRCC resort infinity pool glowing in warm evening light'),
  facilityGym: S('facilityGym', 'Fitness Floor', 'FRCC modern gym with premium strength equipment'),
  facilityRestaurant: S('facilityRestaurant', 'Restaurant', 'FRCC fine-dining restaurant with velvet chairs and marble tables'),
  facilityGarden: S('facilityGarden', 'Gardens', 'FRCC landscaped garden lawn with a table and chairs in the shade'),
  facilitySpa: S('facilitySpa', 'Spa Suite', 'FRCC calm spa room with a massage table, towels and soft candlelight'),

  // =========================================================================
  // GAMES — one slot per game id (imageKey in games.config.js)
  // =========================================================================

  badminton: GAME('badminton', 'Badminton', 'FRCC indoor badminton courts in full play'),
  tennis: GAME('tennis', 'Tennis', 'FRCC outdoor tennis court at golden hour'),
  cricket: GAME('cricket', 'Cricket', 'FRCC cricketer practising a shot inside outdoor nets'),
  'table-tennis': GAME('table-tennis', 'Table Tennis', 'FRCC table tennis rally on an indoor blue table'),
  volleyball: GAME('volleyball', 'Volleyball', 'FRCC outdoor volleyball match in action on a sunny court'),
  chess: GAME('chess', 'Chess', 'FRCC chess set ready on a wooden table'),
  carom: GAME('carom', 'Carom', 'FRCC board game table with carrom board and pieces'),
  'card-room': GAME('card-room', 'Card Room', 'FRCC classic card room with tables for rummy, poker and teen patti'),
  golf: GAME('golf', 'Golf', 'FRCC golf course fairway with bunkers under a wide sky'),
  'swimming-pool': GAME('swimming-pool', 'Swimming Pool', 'FRCC resort swimming pool with clear water and sun loungers'),
  'kids-play-area': GAME('kids-play-area', 'Kids Play Area', 'FRCC bright, safe indoor children\'s play area with a slide'),
  football: GAME('football', 'Football', 'FRCC football match in play on the campus pitch'),
  squash: GAME('squash', 'Squash', 'FRCC indoor squash courts with glass back'),
  basketball: GAME('basketball', 'Basketball', 'FRCC outdoor floodlit basketball court'),

  // =========================================================================
  // ROOMS — one slot per room type (mega-menu + section pages)
  // =========================================================================

  'room-deluxe-lake-view': S('room-deluxe-lake-view', 'Deluxe Lake View', 'FRCC Deluxe Lake View room with a king bed and lake view'),
  'room-executive-suite': S('room-executive-suite', 'Executive Suite', 'FRCC Executive Suite with a separate living area'),
  'room-family-suite': S('room-family-suite', 'Family Suite', 'FRCC Family Suite with two bedrooms and a living area'),
  'room-premium-twin': S('room-premium-twin', 'Premium Twin', 'FRCC Premium Twin room with garden view'),
  'room-heritage-room': S('room-heritage-room', 'Heritage Room', 'FRCC Heritage Room with period furniture and modern bath'),
  'room-royal-suite': S('room-royal-suite', 'Royal Suite', 'FRCC Royal Suite with antique furnishings and private terrace'),
  'room-garden-view-room': S('room-garden-view-room', 'Garden View Room', 'FRCC Garden View Room overlooking the palace gardens'),
  'room-river-view-deluxe': S('room-river-view-deluxe', 'River View Deluxe', 'FRCC River View Deluxe with floor-to-ceiling river windows'),
  'room-poolside-villa': S('room-poolside-villa', 'Poolside Villa', 'FRCC Poolside Villa with a private plunge pool'),
  'room-family-riverside': S('room-family-riverside', 'Family Riverside', 'FRCC Family Riverside with two bedrooms and river view'),
  'room-standard-garden': S('room-standard-garden', 'Standard Garden', 'FRCC Standard Garden room with garden view'),
  'room-city-view-king': S('room-city-view-king', 'City View King', 'FRCC City View King with city skyline views'),
  'room-executive-floor': S('room-executive-floor', 'Executive Floor', 'FRCC Executive Floor with lounge access'),
  'room-rooftop-suite': S('room-rooftop-suite', 'Rooftop Suite', 'FRCC Rooftop Suite with a private rooftop terrace'),
  'room-eco-deluxe': S('room-eco-deluxe', 'Eco Deluxe', 'FRCC Eco Deluxe with garden view and organic amenities'),
  'room-green-suite': S('room-green-suite', 'Green Suite', 'FRCC Green Suite with private garden access'),
  'room-canopy-villa': S('room-canopy-villa', 'Canopy Villa', 'FRCC Canopy Villa with a private pool'),
  'room-officer-suite': S('room-officer-suite', 'Officer Suite', 'FRCC Officer Suite with a work area'),
  'room-vip-pavilion': S('room-vip-pavilion', 'VIP Pavilion', 'FRCC VIP Pavilion with a private garden'),
  'room-standard-official': S('room-standard-official', 'Standard Official', 'FRCC Standard Official secure stay room'),

  // =========================================================================
  // HALLS — one slot per hall id (mega-menu + section pages)
  // =========================================================================

  'hyd-grand-convention': S('hyd-grand-convention', 'Grand Convention Hall', 'FRCC Grand Convention Hall dressed for a grand event'),
  'hyd-executive-boardroom': S('hyd-executive-boardroom', 'Executive Boardroom', 'FRCC Executive Boardroom with screen and podium'),
  'hyd-banquet-hall': S('hyd-banquet-hall', 'Banquet Hall', 'FRCC Banquet Hall dressed for a wedding'),
  'vja-convention-center': S('vja-convention-center', 'Convention Center', 'FRCC Convention Center laid out for a conference'),
  'vja-function-hall': S('vja-function-hall', 'Function Hall', 'FRCC Function Hall laid out for a wedding'),
  'vja-meeting-rooms': S('vja-meeting-rooms', 'Meeting Rooms', 'FRCC Meeting Rooms arranged for a meeting'),
  'amr-capital-convention': S('amr-capital-convention', 'Capital Convention Hall', 'FRCC Capital Convention Hall laid out for a summit'),
  'amr-garden-pavilion': S('amr-garden-pavilion', 'Garden Pavilion', 'FRCC Garden Pavilion opening to landscaped gardens'),
  'amr-committee-rooms': S('amr-committee-rooms', 'Committee Rooms', 'FRCC Committee Rooms arranged for deliberations'),

  // =========================================================================
  // PARKING ZONES — one slot per zone id (mega-menu + section pages)
  // =========================================================================

  'hyd-basement': S('hyd-basement', 'Basement Parking', 'FRCC secure underground parking with EV charging'),
  'hyd-lakeside': S('hyd-lakeside', 'Lakeside Parking', 'FRCC scenic lakeside surface parking'),
  'hyd-terrace': S('hyd-terrace', 'Terrace Parking', 'FRCC terrace event parking with valet'),
  'vja-multi-level': S('vja-multi-level', 'Multi-Level Parking', 'FRCC automated multi-level parking facility'),
  'vja-riverfront': S('vja-riverfront', 'Riverfront Parking', 'FRCC open riverfront parking with river views'),
  'vja-city-center': S('vja-city-center', 'City Center Parking', 'FRCC basement parking on MG Road'),
  'amr-eco-park': S('amr-eco-park', 'Eco Park Parking', 'FRCC solar-canopy eco parking with EV charging'),
  'amr-secretariat': S('amr-secretariat', 'Secretariat Parking', 'FRCC high-security secretariat zone parking'),
  'amr-capital-visitors': S('amr-capital-visitors', 'Visitors Parking', 'FRCC visitor parking for the capital complex'),

  // =========================================================================
  // PARKING PAGE — zone feature cards (ParkingPage)
  // =========================================================================

  parkingEntry: S('parkingEntry', 'Lakeside Premium', 'FRCC entrance lane into the covered car park'),
  parkingEV: S('parkingEV', 'Terrace Zone', 'Electric car charging at a station in the FRCC underground garage'),
  parkingSecurity: S('parkingSecurity', 'Basement Secure', 'FRCC attended, well-lit parking bay with vehicles under CCTV cover'),
  parkingValet: S('parkingValet', 'Valet Drop', 'Premium car waiting in the FRCC stylish indoor garage for valet handover'),

  // =========================================================================
  // MEMBERSHIP PLAN — FRCC Membership
  // =========================================================================

  'frcc-membership': S('frcc-membership', 'FRCC Membership', 'Film Recreation & Cultural Centre official membership plan'),

  // =========================================================================
  // 8-PHOTO GALLERY MOSAIC — gallery 1 to 8 (landing page lightbox)
  // =========================================================================

  'gallery-1': S('gallery-1', 'Entrance', 'FRCC hotel exterior glowing at dusk, seen from the main entrance'),
  'gallery-2': S('gallery-2', 'Pool at night', 'FRCC resort pool lit up at night from above'),
  'gallery-3': S('gallery-3', 'Gardens', 'FRCC landscaped garden lawns with a table and chairs in the shade'),
  'gallery-4': S('gallery-4', 'Restaurant', 'FRCC warmly lit restaurant with laid tables and glassware'),
  'gallery-5': S('gallery-5', 'Spa', 'FRCC spa interior with rolled towels, plants and warm light'),
  'gallery-6': S('gallery-6', 'Gym', 'FRCC well-equipped gym floor with rings, kettlebells and balls'),
  'gallery-7': S('gallery-7', 'Event nights', 'FRCC party tables hung with garlands and warm lights'),
  'gallery-8': S('gallery-8', 'Covered parking', 'FRCC covered driveway leading into the car park'),

  // =========================================================================
  // STAY / HALLS FEATURE SECTIONS (landing)
  // =========================================================================

  staySuite: S('staySuite', 'Stay', 'FRCC hotel suite with a king bed dressed in white linen beside a window'),
  hallFunction: S('hallFunction', 'Halls and events', 'FRCC function hall laid out for a wedding reception'),

  // =========================================================================
  // MEMBERSHIP BAND + VISIT US (landing)
  // =========================================================================

  membershipWide: S('membershipWide', 'Membership', 'FRCC members lounge with velvet seating and warm upscale lighting'),
  visitEntrance: S('visitEntrance', 'Visit us', 'FRCC resort exterior glowing at dusk, seen from the entrance drive'),

  // =========================================================================
  // HOTEL PAGE FEATURES (hotel data galleries)
  // =========================================================================

  hotelBathroom: S('hotelBathroom', 'Bathroom', 'FRCC luxury hotel bathroom with marble tiles and a glass shower cabin'),
  hotelBreakfast: S('hotelBreakfast', 'Breakfast', 'FRCC hotel breakfast buffet with fresh fruit, pastries and tea'),
  hotelView: S('hotelView', 'Room view', 'FRCC hotel room window framing a view over the campus gardens'),
  hotelReception: S('hotelReception', 'Reception', 'FRCC hotel reception desk in gold and marble, lobby behind'),

  // =========================================================================
  // HALL PAGE FEATURES (hall data galleries)
  // =========================================================================

  hallWedding: S('hallWedding', 'Wedding', 'FRCC wedding reception hall dressed with candles, flowers and draped lights'),
  hallConference: S('hallConference', 'Conference', 'FRCC conference room arranged with chairs, screen and podium'),
  hallStage: S('hallStage', 'Stage', 'FRCC event stage lit with a dramatic professional lighting rig'),
  hallCatering: S('hallCatering', 'Catering', 'FRCC catering buffet with dishes laid out on a banquet table'),

  // =========================================================================
  // MEMBER HOME extras
  // =========================================================================

  galleryLounge: S('galleryLounge', 'Members Lounge', 'FRCC elegant hotel bar with ambient lighting'),
  galleryNight: S('galleryNight', 'Member Home', 'FRCC hotel exterior glowing at dusk against the skyline'),
  eventFestival: S('eventFestival', 'Lakeside Food Fest', 'FRCC banquet hall tables glowing in warm evening light for a festival dinner'),
  eventSports: S('eventSports', 'Open Badminton Night', 'FRCC two badminton players celebrating on an indoor court'),
  membershipLounge: S('membershipLounge', 'Gold Upgrade Offer', 'FRCC members\' lounge with sofas, flowers and soft candlelight'),

  // =========================================================================
  // MEMBERSHIP PAGE extras
  // =========================================================================

  membershipCard: S('membershipCard', 'Membership', 'Blank premium FRCC membership cards on a clean neutral surface'),
  membershipEvents: S('membershipEvents', 'Events', 'FRCC club social event in the evening under professional stage lighting'),
  membershipFitness: S('membershipFitness', 'Fitness', 'FRCC fitness floor with modern equipment and floor-to-ceiling windows'),

  // =========================================================================
  // LEGACY gallery keys (hotel/hall data imageKeys) — kept for compatibility
  // =========================================================================

  galleryPool: S('galleryPool', 'Pool', 'FRCC resort pool lit up at night'),
  galleryLobby: S('galleryLobby', 'Lobby', 'FRCC grand hotel lobby with marble staircase and chandelier'),
  galleryRoom: S('galleryRoom', 'Room', 'FRCC hotel bed dressed in white linen beside a window'),
  galleryHall: S('galleryHall', 'Hall', 'FRCC banquet hall dressed with chandeliers for a celebration'),
  galleryRestaurant: S('galleryRestaurant', 'Restaurant', 'FRCC warmly lit restaurant with laid tables and glassware'),
  galleryGarden: S('galleryGarden', 'Garden', 'FRCC sun loungers and a small table in a quiet garden corner'),
  galleryGym: S('galleryGym', 'Gym', 'FRCC well-equipped gym floor with rings, kettlebells and balls'),
  galleryEvent: S('galleryEvent', 'Event', 'FRCC party tables hung with garlands and warm lights'),
  gallerySports: S('gallerySports', 'Sports', 'FRCC player serving on an outdoor tennis court'),
  gallerySpa: S('gallerySpa', 'Spa', 'FRCC spa interior with rolled towels, plants and warm light'),

  // =========================================================================
  // AUTH PAGES (4:5 portrait side-panel)
  // =========================================================================

  authSignup: S('authSignup', 'Join', 'FRCC elegant hotel corridor with modern lighting and arched ceiling'),
  authSignin: S('authSignin', 'Welcome', 'FRCC quiet hotel hallway with rich wood finish and soft lamps'),

  // =========================================================================
  // DASHBOARD — subtle dark texture behind the Member ID card
  // =========================================================================

  memberCardBg: S('memberCardBg', 'Membership', 'Dark abstract texture used behind the FRCC member ID card'),

  // =========================================================================
  // MORE TO EXPLORE (cross-section cards at the bottom of each page)
  // =========================================================================

  exploreMoreHotel: S('exploreMoreHotel', 'Stay', 'FRCC grand hotel foyer with marble columns'),
  exploreMoreHall: S('exploreMoreHall', 'Halls', 'FRCC elegant banquet hall dressed for an event'),
  exploreMoreParking: S('exploreMoreParking', 'Parking', 'FRCC well-lit car park with parked vehicles'),
  exploreMoreActivities: S('exploreMoreActivities', 'Activities', 'FRCC indoor games arena with a badminton match in play'),
  exploreMoreMembership: S('exploreMoreMembership', 'Membership', 'FRCC members lounge with sofas and warm lighting'),

  // =========================================================================
  // EVENTS PAGE & SAMPLES
  // =========================================================================

  heroEvents: S('hero-events', 'Events', 'Film screenings and cultural events at FRCC'),
  'hero-events': S('hero-events', 'Events', 'Film screenings and cultural events at FRCC'),
  'event-short-film-screening-night': S('event-short-film-screening-night', 'Short Film Screening Night', 'Short film screening evening at FRCC'),
  'event-classic-cinema-weekend': S('event-classic-cinema-weekend', 'Classic Cinema Weekend', 'Classic cinema screening on the auditorium screen'),
  'event-filmmakers-and-artists-meetup': S('event-filmmakers-and-artists-meetup', 'Filmmakers and Artists Meetup', 'Filmmakers and artists meetup at FRCC'),
  'event-acting-workshop': S('event-acting-workshop', 'Acting Workshop', 'Interactive acting and performance workshop at FRCC'),
  'event-script-reading-circle': S('event-script-reading-circle', 'Script Reading Circle', 'Script reading and development circle at FRCC'),
  'event-cultural-evening-music-and-dance': S('event-cultural-evening-music-and-dance', 'Cultural Evening', 'Cultural evening with music and dance at FRCC'),
};

/**
 * Slot for a room type (mega-menu + section pages). Falls back to a null
 * slot carrying the type name when the type has no entry yet.
 */
/**
 * Room type alias map to existing verified REMOTE photos.
 * Ensures one distinct photo per room type.
 */
const ROOM_ALIASES = {
  'standard-room': 'room-standard-garden',
  'deluxe-room': 'room-deluxe-lake-view',
  'premium-room': 'room-premium-twin',
  'junior-suite': 'room-executive-floor',
  'executive-suite': 'room-executive-suite',
  'royal-suite': 'room-royal-suite',
  // Database seed / legacy prefix aliases
  'vja-standard-room': 'room-standard-garden',
  'vja-deluxe-room': 'room-deluxe-lake-view',
  'vja-premium-room': 'room-premium-twin',
  'vja-junior-suite': 'room-executive-floor',
  'vja-executive-suite': 'room-executive-suite',
  'vja-royal-suite': 'room-royal-suite',
  // Short/fallback aliases
  'standard': 'room-standard-garden',
  'deluxe': 'room-deluxe-lake-view',
  'premium': 'room-premium-twin',
};

/**
 * Normalizes any room id or name into a clean canonical slug.
 */
function normalizeRoomSlug(id) {
  return String(id || '')
    .toLowerCase()
    .replace(/^room-/, '')
    .replace(/^vja-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Human-readable room title from room id.
 */
function formatRoomName(id) {
  const slug = normalizeRoomSlug(id);
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Hotel Room';
}

/**
 * ONE resolver roomImage(id) used everywhere a room photo is shown:
 * Chain:
 * 1. Local file in src/assets/images whose name equals room id (standard-room, deluxe-room, etc.)
 * 2. REMOTE["room-" + id]
 * 3. ROOM_ALIASES mapping to verified REMOTE photo
 * 4. Navy SmartImage tile with room name (console.warn when nothing resolves)
 *
 * @param {string} id
 * @returns {object} { slot, name, src, srcSet, alt }
 */
export function roomImage(id) {
  const raw = String(id || '').trim();
  const slug = normalizeRoomSlug(raw);
  const roomName = formatRoomName(raw);

  // 1. Local file in src/assets/images
  const localSrc = localFor(slug) || (raw ? localFor(raw) : null);
  if (localSrc) {
    return {
      slot: slug,
      name: roomName,
      src: localSrc,
      srcSet: '',
      alt: roomName,
    };
  }

  // 2. REMOTE["room-" + id] or direct key in REMOTE
  const remoteDirectKey = `room-${slug}`;
  if (REMOTE[remoteDirectKey]) {
    return {
      slot: remoteDirectKey,
      name: roomName,
      src: REMOTE[remoteDirectKey],
      srcSet: '',
      alt: roomName,
    };
  }

  // 3. ROOM_ALIASES map to existing verified REMOTE photos
  const aliasTarget = ROOM_ALIASES[slug] || ROOM_ALIASES[raw];
  if (aliasTarget && REMOTE[aliasTarget]) {
    return {
      slot: aliasTarget,
      name: roomName,
      src: REMOTE[aliasTarget],
      srcSet: '',
      alt: roomName,
    };
  }

  // 4. Fallback: navy SmartImage tile with room name
  console.warn('[room image] unresolved', id);
  return {
    slot: `room-${slug || 'unknown'}`,
    name: roomName,
    src: null,
    srcSet: '',
    alt: roomName,
  };
}

/**
 * Backward-compatible roomSlot delegating to roomImage.
 */
export function roomSlot(type) {
  return roomImage(type);
}

/**
 * Resolves an image object for a game by slot / id.
 * Chain: local file, then REMOTE[slot], then FALLBACK[slot].
 * @param {string} id
 */
export function gameSlot(id) {
  const key = String(id || '').toLowerCase();
  if (IMAGES[key]) return IMAGES[key];
  // TODO-REPLACE-SQUASH-BASKETBALL-PHOTO
  return {
    slot: key,
    name: id,
    src: localFor(key) || REMOTE[key] || FALLBACK[key] || null,
    srcSet: '',
    alt: id,
    game: true,
  };
}

export default IMAGES;
