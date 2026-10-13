// Demo parking zones for FRCC locations

export const PARKING_ZONES = [
  // Hyderabad parking
  {
    id: 'hyd-basement',
    locationId: 'hyd',
    name: 'Basement Parking - Hyderabad',
    description: 'Secure underground parking with EV charging',
    vehicleTypes: {
      car: { pricePerHour: 40, pricePerDay: 300, totalSlots: 120, available: 85 },
      bike: { pricePerHour: 15, pricePerDay: 100, totalSlots: 80, available: 60 },
      suv: { pricePerHour: 60, pricePerDay: 450, totalSlots: 30, available: 20 },
    },
    features: ['CCTV', 'EV Charging (12 points)', 'Well Lit', 'Valet Available', 'Wash Bay', '24/7 Security', 'App Access'],
    operatingHours: '24x7',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Cash', 'Monthly Pass'],
    monthlyPass: { car: 6000, bike: 2000, suv: 9000 },
  },
  {
    id: 'hyd-lakeside',
    locationId: 'hyd',
    name: 'Lakeside Surface Parking - Hyderabad',
    description: 'Scenic parking by the lake with walkway access',
    vehicleTypes: {
      car: { pricePerHour: 30, pricePerDay: 250, totalSlots: 80, available: 50 },
      bike: { pricePerHour: 10, pricePerDay: 80, totalSlots: 40, available: 30 },
      suv: { pricePerHour: 45, pricePerDay: 350, totalSlots: 15, available: 10 },
    },
    features: ['Lake View', 'Covered Walkway', 'CCTV', 'Evening Lighting', 'Buggy to Clubhouse', '24/7 Security'],
    operatingHours: '6 AM - 11 PM',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Cash'],
    monthlyPass: { car: 4500, bike: 1500, suv: 6500 },
  },
  {
    id: 'hyd-terrace',
    locationId: 'hyd',
    name: 'Terrace Event Parking - Hyderabad',
    description: 'Dedicated parking for hall events and functions',
    vehicleTypes: {
      car: { pricePerHour: 50, pricePerDay: 400, totalSlots: 60, available: 60 },
      bike: { pricePerHour: 20, pricePerDay: 150, totalSlots: 20, available: 20 },
      bus: { pricePerHour: 200, pricePerDay: 1500, totalSlots: 5, available: 5 },
    },
    features: ['Event Priority', 'Drop Zone', 'Valet Included', 'Shuttle to Halls', 'CCTV', 'Attendants'],
    operatingHours: 'Event-based',
    paymentMethods: ['UPI', 'Card', 'Corporate Billing', 'Event Billing'],
    monthlyPass: null,
  },

  // Vijayawada parking
  {
    id: 'vja-multi-level',
    locationId: 'vja',
    name: 'Multi-Level Parking - Vijayawada',
    description: '4-level automated parking facility',
    vehicleTypes: {
      car: { pricePerHour: 35, pricePerDay: 280, totalSlots: 200, available: 150 },
      bike: { pricePerHour: 12, pricePerDay: 90, totalSlots: 100, available: 80 },
      suv: { pricePerHour: 50, pricePerDay: 400, totalSlots: 40, available: 30 },
    },
    features: ['Automated', 'EV Charging (20 points)', 'Car Wash', 'CCTV', 'ANPR Entry', 'App Booking', 'Monthly Pass', 'Corporate Billing'],
    operatingHours: '24x7',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'FASTag', 'Monthly Pass'],
    monthlyPass: { car: 5500, bike: 1800, suv: 8000 },
  },
  {
    id: 'vja-riverfront',
    locationId: 'vja',
    name: 'Riverfront Parking - Vijayawada',
    description: 'Open parking with Krishna River views',
    vehicleTypes: {
      car: { pricePerHour: 25, pricePerDay: 200, totalSlots: 100, available: 70 },
      bike: { pricePerHour: 8, pricePerDay: 60, totalSlots: 60, available: 45 },
      suv: { pricePerHour: 40, pricePerDay: 300, totalSlots: 20, available: 15 },
    },
    features: ['River View', 'Solar Canopy (50%)', 'CCTV', 'Evening Breeze', 'Food Truck Access', 'Walking Trail'],
    operatingHours: '6 AM - 10 PM',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Cash'],
    monthlyPass: { car: 4000, bike: 1200, suv: 5500 },
  },
  {
    id: 'vja-city-center',
    locationId: 'vja',
    name: 'City Center Basement - Vijayawada',
    description: 'Convenient basement parking on MG Road',
    vehicleTypes: {
      car: { pricePerHour: 40, pricePerDay: 320, totalSlots: 80, available: 45 },
      bike: { pricePerHour: 15, pricePerDay: 120, totalSlots: 50, available: 35 },
    },
    features: ['Direct Mall Access', 'CCTV', 'EV Charging (8 points)', 'Valet', 'Car Care', '24/7 Security'],
    operatingHours: '24x7',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Monthly Pass'],
    monthlyPass: { car: 6000, bike: 2000 },
  },

  // Amaravati parking
  {
    id: 'amr-eco-park',
    locationId: 'amr',
    name: 'Eco Park Parking - Amaravati',
    description: 'Green-certified parking with solar canopy',
    vehicleTypes: {
      car: { pricePerHour: 30, pricePerDay: 240, totalSlots: 150, available: 120 },
      bike: { pricePerHour: 10, pricePerDay: 70, totalSlots: 80, available: 65 },
      suv: { pricePerHour: 45, pricePerDay: 350, totalSlots: 25, available: 20 },
      ev: { pricePerHour: 25, pricePerDay: 200, totalSlots: 30, available: 25 }, // Dedicated EV slots with charging included
    },
    features: ['100% Solar Powered', 'EV Charging Included (30 pts)', 'Rainwater Harvesting', 'Green Roof', 'CCTV', 'Bicycle Racks', 'Shuttle to Campus', 'Carbon Credits'],
    operatingHours: '24x7',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Green Wallet', 'Monthly Pass'],
    monthlyPass: { car: 4800, bike: 1500, suv: 7000, ev: 3500 },
  },
  {
    id: 'amr-secretariat',
    locationId: 'amr',
    name: 'Secretariat Zone Parking - Amaravati',
    description: 'High-security parking for government zone',
    vehicleTypes: {
      car: { pricePerHour: 40, pricePerDay: 350, totalSlots: 100, available: 60 },
      bike: { pricePerHour: 15, pricePerDay: 100, totalSlots: 40, available: 25 },
      official: { pricePerHour: 0, pricePerDay: 0, totalSlots: 30, available: 20 }, // Reserved for official vehicles
    },
    features: ['SCIF-Level Security', 'ANPR + Biometric', 'Blast-Resistant', 'CCTV + Analytics', 'VIP Drop Zone', 'Convoy Ready', '24/7 Armed Guard', 'Redundant Power'],
    operatingHours: '24x7 (Restricted Access)',
    paymentMethods: ['Government Billing', 'Corporate Billing', 'Pre-authorized Only'],
    monthlyPass: { car: 8000, bike: 2500 },
  },
  {
    id: 'amr-capital-visitors',
    locationId: 'amr',
    name: 'Capital Visitors Parking - Amaravati',
    description: 'Visitor parking for capital complex',
    vehicleTypes: {
      car: { pricePerHour: 20, pricePerDay: 150, totalSlots: 200, available: 180 },
      bike: { pricePerHour: 5, pricePerDay: 40, totalSlots: 100, available: 90 },
      bus: { pricePerHour: 100, pricePerDay: 800, totalSlots: 10, available: 10 },
    },
    features: ['Tourist Info Kiosk', 'Shuttle to Secretariat', 'CCTV', 'Drinking Water', 'Restrooms', 'Food Court Access', 'Luggage Storage', 'Wheelchair Accessible'],
    operatingHours: '6 AM - 8 PM',
    paymentMethods: ['UPI', 'Card', 'Wallet', 'Cash', 'Prepaid Card'],
    monthlyPass: { car: 3000, bike: 800 },
  },
];

export function getParkingByLocation(locationId) {
  return PARKING_ZONES.filter((z) => z.locationId === locationId);
}

export function getParkingZoneById(id) {
  return PARKING_ZONES.find((z) => z.id === id);
}