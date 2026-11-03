// ---------------------------------------------------------------------------
// /src/features/hall/convention/ConventionScope.jsx
// Host wrapper for the merged Convention Hall module. It does two things ONLY:
//   1. Provides the Hall team's BookingProvider (wizard state in sessionStorage)
//      so every convention screen can call useBooking().
//   2. Scopes their base styles (.convention-scope) so their Playfair-on-navy
//      headings never leak into the rest of the FRCC_MAIN app.
// ---------------------------------------------------------------------------
import { Outlet } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext.jsx';

export default function ConventionScope() {
  return (
    <BookingProvider>
      <div className="convention-scope">
        <Outlet />
      </div>
    </BookingProvider>
  );
}
