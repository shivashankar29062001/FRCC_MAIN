import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './app/store/AppContext.jsx';
import { LocationProvider } from './app/context/LocationContext.jsx';
import { AppLayout } from './components/layout/chrome.jsx';
import { ProtectedRoute } from './app/routes/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { SignupPage, SigninPage } from './pages/AuthPages.jsx';
import { HomeHubPage } from './pages/HomeHubPage.jsx';
import { HotelPage } from './features/hotel/HotelPage.jsx';
import { HallPage } from './features/hall/HallPage.jsx';
import { ParkingPage } from './features/parking/ParkingPage.jsx';
import { ActivitiesPage } from './features/activities/ActivitiesPage.jsx';
import { ActivitiesProcessPage } from './features/activities/ActivitiesProcessPage.jsx';
import { MembershipPage } from './features/membership/MembershipPage.jsx';
import { BookPage } from './pages/BookPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { MembershipDashboardPage } from './pages/MembershipDashboardPage.jsx';
import { SupportPage } from './pages/SupportPage.jsx';
import { NotFoundPage, LogoutPage } from './pages/SystemPages.jsx';

export default function App() {
  return (
    <AppProvider>
      <LocationProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppLayout>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/signin" element={<SigninPage />} />
              <Route path="/home" element={<ProtectedRoute><HomeHubPage /></ProtectedRoute>} />
              <Route path="/book/hotel" element={<ProtectedRoute><HotelPage /></ProtectedRoute>} />
              <Route path="/book/hall" element={<ProtectedRoute><HallPage /></ProtectedRoute>} />
              <Route path="/book/parking" element={<ProtectedRoute><ParkingPage /></ProtectedRoute>} />
              <Route path="/book/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
              <Route path="/book/activities/process" element={<ProtectedRoute><ActivitiesProcessPage /></ProtectedRoute>} />
              <Route path="/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
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
      </LocationProvider>
    </AppProvider>
  );
}