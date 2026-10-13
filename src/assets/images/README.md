# FRCC photography assets

Drop real property photography here (one folder per slot group defined in
`/src/config/images.js`), then point each slot's `src` at the local file:

| folder | slots |
| --- | --- |
| `hero/` | `heroMain` |
| `facilities/` | `facilityPool`, `facilityGym`, `facilityRestaurant`, `facilityGarden`, `facilitySpa`, `facilityKids` |
| `hotel/` | `bannerHotel`, `hotelBathroom`, `hotelBreakfast`, `hotelView`, `hotelReception` |
| `hall/` | `bannerHall`, `hallWedding`, `hallConference`, `hallStage`, `hallCatering` |
| `parking/` | `bannerParking`, `parkingEntry`, `parkingEV`, `parkingSecurity`, `parkingValet` |
| `activities/` | `bannerActivities`, `gameBadminton`, `gameTableTennis`, `gameBilliards`, `gameSwimming`, `gameCarrom`, `gameChess`, `gameCricketNet`, `gameSquash`, `gameTennis` |
| `membership/` | `bannerMembership`, `membershipCard`, `membershipLounge`, `membershipEvents`, `membershipFitness` |
| `gallery/` | `galleryPool`, `galleryLobby`, `galleryRoom`, `galleryHall`, `galleryRestaurant`, `galleryGarden`, `galleryGym`, `galleryEvent`, `gallerySports`, `galleryNight`, `gallerySpa`, `galleryLounge` |
| `reviews/` | avatars (initials-only by default — no stock faces) |
| `auth/` | `authSignup`, `authSignin` |
| `events/` | `eventWedding`, `eventCorporate`, `eventFestival`, `eventSports` |

Export as WebP (AVIF with WebP fallback), quality 80–85: hero ≤ ~400 KB,
cards ~150–250 KB. Never upscale; keep the ratios listed in the brief.
Until then every slot ships a verified royalty-free Pexels URL marked
`TODO: replace with real property photo`.
