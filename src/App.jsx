import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './app/store/AppContext.jsx';
import { LocationProvider } from './app/context/LocationContext.jsx';
import { LocationModalProvider } from './app/context/LocationModalContext.jsx';
import { AuthModalProvider } from './app/context/AuthModalContext.jsx';
import { AppLayout } from './components/layout/chrome.jsx';
import { ProtectedRoute, RequireAuth } from './app/routes/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { SignupPage, SigninPage } from './pages/AuthPages.jsx';
import { HomeHubPage } from './pages/HomeHubPage.jsx';
import { HotelPage } from './features/hotel/HotelPage.jsx';
import { HallPage } from './features/hall/HallPage.jsx';

// Convention Hall module — merged from the Hall team's app (FRCC CONVENTION).
// Clicking "Convention Hall" / "Halls" anywhere in the app opens these screens.
import ConventionScope from './features/hall/convention/ConventionScope.jsx';
import ConventionLanding from './features/hall/convention/pages/Landing.jsx';
import ConventionBook from './features/hall/convention/pages/ConventionBook.jsx';
import ConventionDate from './features/hall/convention/pages/ConventionDate.jsx';
import ConventionDetails from './features/hall/convention/pages/ConventionDetails.jsx';
import ConventionPayment from './features/hall/convention/pages/ConventionPayment.jsx';
import ConventionConfirmation from './features/hall/convention/pages/ConventionConfirmation.jsx';
import ConventionHallDetail from './features/hall/convention/pages/HallDetail.jsx';
import ConventionVenuePage from './features/hall/convention/pages/VenuePage.jsx';
import ConventionMyBookings from './features/hall/convention/pages/MyBookings.jsx';
import ConventionReviews from './features/hall/convention/pages/Reviews.jsx';
import ConventionNotifications from './features/hall/convention/pages/Notifications.jsx';
import ConventionContact from './features/hall/convention/pages/Contact.jsx';

import { ParkingPage, ParkingBookingPage } from './features/parking/index.js';
import { ActivitiesPage } from './features/activities/ActivitiesPage.jsx';
import { ActivitiesProcessPage } from './features/activities/ActivitiesProcessPage.jsx';
import { MembershipLandingPage } from './features/membership/MembershipPage.jsx';
import { MembershipJoinPage } from './features/membership/MembershipJoinPage.jsx';
import { BookPage } from './pages/BookPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { MembershipDashboardPage } from './pages/MembershipDashboardPage.jsx';
import { SupportPage } from './pages/SupportPage.jsx';
import { GalleryPage } from './pages/GalleryPage.jsx';
import { LeadershipPage } from './pages/LeadershipPage.jsx';
import { DiningLandingPage } from './features/dining/DiningLandingPage.jsx';
import { VenueMenuPage } from './features/dining/VenueMenuPage.jsx';
import { TableBookingPage } from './features/dining/TableBookingPage.jsx';
import { EventsPage, EventDetailPage, AdminEventsPage } from './features/events/index.js';
import { NotFoundPage, LogoutPage } from './pages/SystemPages.jsx';

export default function App() {
  return (
    <AppProvider>
      <LocationProvider>
        <LocationModalProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthModalProvider>
              <ErrorBoundary>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/signin" element={<SigninPage />} />
                    <Route path="/home" element={<RequireAuth><HomeHubPage /></RequireAuth>} />

                    {/* Stay */}
                    <Route path="/stay" element={<HotelPage />} />
                    <Route path="/book/hotel" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />
                    <Route path="/book/stay" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />
                    <Route path="/stay/book" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />

                    {/* Dining */}
                    <Route path="/dining" element={<DiningLandingPage />} />
                    <Route path="/dining/:venueId" element={<VenueMenuPage />} />
                    <Route path="/dining/book" element={<RequireAuth forceGated><TableBookingPage /></RequireAuth>} />
                    <Route path="/book/dining" element={<Navigate to="/dining/book" replace />} />

                    {/* Halls — catalog & facility showcase */}
                    <Route path="/halls" element={<HallPage />} />
                    <Route path="/hall" element={<HallPage />} />

                    {/* Convention Hall — merged booking flow and detail views */}
                    <Route element={<ConventionScope />}>
                      <Route path="/convention" element={<ConventionLanding />} />
                      <Route path="/convention/landing" element={<ConventionLanding />} />
                      <Route path="/hall/:id" element={<ConventionHallDetail />} />
                      <Route path="/venue/:id" element={<ConventionVenuePage />} />
                      <Route path="/reviews" element={<ConventionReviews />} />
                      <Route path="/contact" element={<ConventionContact />} />
                      <Route path="/notifications" element={<ConventionNotifications />} />

                      {/* Gated Convention Booking Flow */}
                      <Route path="/book/hall" element={<RequireAuth forceGated><ConventionBook /></RequireAuth>} />
                      <Route path="/book/halls" element={<RequireAuth forceGated><ConventionBook /></RequireAuth>} />
                      <Route path="/halls/book" element={<RequireAuth forceGated><ConventionBook /></RequireAuth>} />
                      <Route path="/convention/book" element={<RequireAuth forceGated><ConventionBook /></RequireAuth>} />
                      <Route path="/convention/date" element={<RequireAuth forceGated><ConventionDate /></RequireAuth>} />
                      <Route path="/convention/details" element={<RequireAuth forceGated><ConventionDetails /></RequireAuth>} />
                      <Route path="/convention/payment" element={<RequireAuth forceGated><ConventionPayment /></RequireAuth>} />
                      <Route path="/convention/confirmation" element={<RequireAuth forceGated><ConventionConfirmation /></RequireAuth>} />
                      <Route path="/my-bookings" element={<RequireAuth forceGated><ConventionMyBookings /></RequireAuth>} />
                    </Route>

                    {/* Parking */}
                    <Route path="/parking" element={<ParkingPage />} />
                    <Route path="/parking/book" element={<RequireAuth forceGated><ParkingBookingPage /></RequireAuth>} />
                    <Route path="/book/parking" element={<RequireAuth forceGated><ParkingBookingPage /></RequireAuth>} />

                    {/* Activities */}
                    <Route path="/activities" element={<ActivitiesPage />} />
                    <Route path="/book/activities" element={<RequireAuth forceGated><ActivitiesProcessPage /></RequireAuth>} />
                    <Route path="/book/activities/process" element={<RequireAuth forceGated><ActivitiesProcessPage /></RequireAuth>} />

                    {/* Membership */}
                    <Route path="/membership" element={<MembershipLandingPage />} />
                    <Route path="/book/membership" element={<Navigate to="/membership" replace />} />
                    <Route path="/membership/join" element={<RequireAuth forceGated><MembershipJoinPage /></RequireAuth>} />
                    <Route path="/membership/dashboard" element={<RequireAuth forceGated><MembershipDashboardPage /></RequireAuth>} />

                    {/* Events */}
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/events/:id" element={<EventDetailPage />} />
                    <Route path="/admin/events" element={<AdminEventsPage />} />

                    {/* Other pages */}
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/leadership" element={<LeadershipPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/profile" element={<RequireAuth forceGated><ProfilePage /></RequireAuth>} />
                    <Route path="/profile/bookings" element={<RequireAuth forceGated><ProfilePage initialTab="bookings" /></RequireAuth>} />
                    <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
                    <Route path="/logout" element={<LogoutPage />} />
                    <Route path="/book" element={<BookPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </AppLayout>
              </ErrorBoundary>
            </AuthModalProvider>
          </BrowserRouter>
        </LocationModalProvider>
      </LocationProvider>
    </AppProvider>
  );
}