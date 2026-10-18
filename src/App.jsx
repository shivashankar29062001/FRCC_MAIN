import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './app/store/AppContext.jsx';
import { LocationProvider } from './app/context/LocationContext.jsx';
import { LocationModalProvider } from './app/context/LocationModalContext.jsx';
import { AppLayout } from './components/layout/chrome.jsx';
import { ProtectedRoute } from './app/routes/ProtectedRoute.jsx';
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
            <ErrorBoundary>
              <AppLayout>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/signin" element={<SigninPage />} />
              <Route path="/home" element={<ProtectedRoute><HomeHubPage /></ProtectedRoute>} />
              <Route path="/book/hotel" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
              <Route path="/book/stay" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
              <Route path="/stay/book" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
              <Route path="/stay" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
              <Route path="/dining" element={<DiningLandingPage />} />
              <Route path="/dining/:venueId" element={<VenueMenuPage />} />
              <Route path="/dining/book" element={<TableBookingPage />} />
              <Route path="/book/dining" element={<Navigate to="/dining/book" replace />} />
              <Route path="/halls" element={<ProtectedRoute><HallPage /></ProtectedRoute>} />
              <Route path="/hall" element={<ProtectedRoute><HallPage /></ProtectedRoute>} />
              <Route path="/halls/book" element={<ProtectedRoute><HallBookingPage /></ProtectedRoute>} />
              <Route path="/parking" element={<ProtectedRoute><ParkingPage /></ProtectedRoute>} />
              <Route path="/parking/book" element={<ProtectedRoute><ParkingBookingPage /></ProtectedRoute>} />
              <Route path="/book/activities" element={<ProtectedRoute><ActivitiesProcessPage /></ProtectedRoute>} />
              <Route path="/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
              <Route path="/book/activities/process" element={<ProtectedRoute><ActivitiesProcessPage /></ProtectedRoute>} />
              <Route path="/membership" element={<MembershipLandingPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/admin/events" element={<AdminEventsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/leadership" element={<LeadershipPage />} />
              <Route path="/book/membership" element={<Navigate to="/membership" replace />} />
              <Route path="/membership/join" element={<ProtectedRoute><MembershipJoinPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/bookings" element={<ProtectedRoute><ProfilePage initialTab="bookings" /></ProtectedRoute>} />
              <Route path="/membership/dashboard" element={<ProtectedRoute><MembershipDashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
              <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
              <Route path="/logout" element={<LogoutPage />} />
              <Route path="/book" element={<BookPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppLayout>
        </ErrorBoundary>
      </BrowserRouter>
        </LocationModalProvider>
      </LocationProvider>
    </AppProvider>
  );
}