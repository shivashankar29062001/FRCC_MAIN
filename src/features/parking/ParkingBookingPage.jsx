// Team member will replace this page with their booking flow.

import { PageHeader } from '../../components/ui/sections.jsx';
import { IMAGES } from '../../config/images.js';

export function ParkingBookingPage() {
  return (
    <div>
      <PageHeader
        title="Reserve Parking"
        description="FRCC Automated Parking & Reserved Zones"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Parking', to: '/parking' },
          { label: 'Book' },
        ]}
        image={IMAGES.serviceParking}
      />
      <div className="container-x py-16 sm:py-24 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
          <p className="font-display text-2xl font-bold text-navy-900">Booking will be available soon.</p>
          <p className="mt-2 text-sm text-slate-600">
            Please check back shortly or visit our Vijayawada campus gate.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ParkingBookingPage;
