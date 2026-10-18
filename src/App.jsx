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
import { HallPage, HallBookingPage } from './features/hall/index.js';
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
          <BrowserRouter>
            <AuthModalProvider>
              <ErrorBoundary>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/signin" element={<SigninPage />} />
                    <Route path="/home" element={<RequireAuth><HomeHubPage /></RequireAuth>} />

                    {/* Stay */}
                    <Route path="/stay" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
                    <Route path="/book/hotel" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />
                    <Route path="/book/stay" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />
                    <Route path="/stay/book" element={<RequireAuth forceGated><HotelPage /></RequireAuth>} />

                    {/* Dining */}
                    <Route path="/dining" element={<DiningLandingPage />} />
                    <Route path="/dining/:venueId" element={<VenueMenuPage />} />
                    <Route path="/dining/book" element={<RequireAuth forceGated><TableBookingPage /></RequireAuth>} />
                    <Route path="/book/dining" element={<Navigate to="/dining/book" replace />} />

                    {/* Halls */}
                    <Route path="/halls" element={<ProtectedRoute><HallPage /></ProtectedRoute>} />
                    <Route path="/hall" element={<ProtectedRoute><HallPage /></ProtectedRoute>} />
                    <Route path="/halls/book" element={<RequireAuth forceGated><HallBookingPage /></RequireAuth>} />

                    {/* Parking */}
                    <Route path="/parking" element={<ProtectedRoute><ParkingPage /></ProtectedRoute>} />
                    <Route path="/parking/book" element={<RequireAuth forceGated><ParkingBookingPage /></RequireAuth>} />

                    {/* Activities */}
                    <Route path="/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
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