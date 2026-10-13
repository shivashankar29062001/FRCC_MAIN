// Demo hotels for FRCC locations
// Each hotel has rooms with types, prices, and availability

export const HOTELS = [
  // Hyderabad hotels
  {
    id: 'hyd-grand-residency',
    locationId: 'hyd',
    name: 'FRCC Grand Residency Hyderabad',
    tagline: 'Luxury lakeside stay in the heart of the city',
    imageKey: 'facilityPool',
    images: ['facilityPool', 'hotelView', 'hotelBathroom', 'hotelBreakfast'],
    rating: 4.8,
    address: 'FRCC Campus, Hyderabad, Telangana 500001',
    amenities: ['Free WiFi', 'Pool Access', 'Fitness Center', 'Spa', 'Room Service', 'Parking', 'Restaurant', 'Laundry'],
    rooms: [
      { type: 'Deluxe Lake View', pricePerNight: 8500, maxOccupancy: 2, available: 8, description: 'Spacious room with lake view, king bed, premium amenities' },
      { type: 'Executive Suite', pricePerNight: 14500, maxOccupancy: 3, available: 4, description: 'Separate living area, lake view, premium bath amenities' },
      { type: 'Family Suite', pricePerNight: 18000, maxOccupancy: 4, available: 3, description: 'Two bedrooms, living area, kitchenette, best for families' },
      { type: 'Premium Twin', pricePerNight: 7200, maxOccupancy: 2, available: 6, description: 'Twin beds, garden view, ideal for friends or colleagues' },
    ],
  },
  {
    id: 'hyd-palace-wing',
    locationId: 'hyd',
    name: 'FRCC Palace Wing Hyderabad',
    tagline: 'Heritage charm with modern comfort',
    imageKey: 'galleryRoom',
    images: ['galleryRoom', 'galleryLobby', 'hotelBreakfast', 'hotelBathroom'],
    rating: 4.6,
    address: 'FRCC Palace Campus, Hyderabad, Telangana 500002',
    amenities: ['Free WiFi', 'Heritage Tours', 'Pool Access', 'Fitness Center', 'Room Service', 'Parking', 'Fine Dining', 'Concierge'],
    rooms: [
      { type: 'Heritage Room', pricePerNight: 9500, maxOccupancy: 2, available: 5, description: 'Restored heritage room with period furniture, modern bath' },
      { type: 'Royal Suite', pricePerNight: 22000, maxOccupancy: 3, available: 2, description: 'Palatial suite with antique furnishings, private terrace' },
      { type: 'Garden View Room', pricePerNight: 6800, maxOccupancy: 2, available: 7, description: 'Overlooking palace gardens, queen bed, modern amenities' },
    ],
  },

  // Vijayawada hotels
  {
    id: 'vja-riverfront',
    locationId: 'vja',
    name: 'FRCC Riverfront Resort Vijayawada',
    tagline: 'Serene Krishna River views',
    imageKey: 'facilityPool',
    images: ['facilityPool', 'hotelView', 'facilityGarden', 'hotelBreakfast'],
    rating: 4.7,
    address: 'FRCC Riverfront, Vijayawada, Andhra Pradesh 520001',
    amenities: ['Free WiFi', 'River View', 'Pool', 'Fitness Center', 'Ayurvedic Spa', 'Parking', 'Multi-cuisine Restaurant', 'Boating'],
    rooms: [
      { type: 'River View Deluxe', pricePerNight: 7800, maxOccupancy: 2, available: 10, description: 'Floor-to-ceiling windows facing Krishna River' },
      { type: 'Poolside Villa', pricePerNight: 15500, maxOccupancy: 3, available: 4, description: 'Private plunge pool, direct garden access' },
      { type: 'Family Riverside', pricePerNight: 16500, maxOccupancy: 4, available: 3, description: 'Two bedrooms, river view, kids play area access' },
      { type: 'Standard Garden', pricePerNight: 5500, maxOccupancy: 2, available: 8, description: 'Garden view, comfortable stay, great value' },
    ],
  },
  {
    id: 'vja-city-center',
    locationId: 'vja',
    name: 'FRCC City Center Vijayawada',
    tagline: 'Urban convenience meets club luxury',
    imageKey: 'galleryRoom',
    images: ['galleryRoom', 'galleryLobby', 'facilityGym', 'hotelBreakfast'],
    rating: 4.5,
    address: 'MG Road, Vijayawada, Andhra Pradesh 520002',
    amenities: ['Free WiFi', 'City Views', 'Rooftop Pool', 'Fitness Center', 'Business Center', 'Parking', 'Cafe & Bar', 'Meeting Rooms'],
    rooms: [
      { type: 'City View King', pricePerNight: 6800, maxOccupancy: 2, available: 12, description: 'Modern room with city skyline views' },
      { type: 'Executive Floor', pricePerNight: 11000, maxOccupancy: 2, available: 5, description: 'Executive lounge access, premium amenities' },
      { type: 'Rooftop Suite', pricePerNight: 19500, maxOccupancy: 3, available: 2, description: 'Private rooftop terrace, plunge pool, butler service' },
    ],
  },

  // Amaravati hotels
  {
    id: 'amr-capital-green',
    locationId: 'amr',
    name: 'FRCC Capital Greens Amaravati',
    tagline: 'Eco-luxury in the new capital',
    imageKey: 'facilityPool',
    images: ['facilityPool', 'facilityGarden', 'hotelView', 'hotelBreakfast'],
    rating: 4.7,
    address: 'FRCC Capital Campus, Amaravati, Andhra Pradesh 522001',
    amenities: ['Free WiFi', 'Green Certified', 'Pool', 'Organic Spa', 'Fitness Center', 'EV Parking', 'Farm-to-Table Restaurant', 'Cycling Trails'],
    rooms: [
      { type: 'Eco Deluxe', pricePerNight: 7200, maxOccupancy: 2, available: 15, description: 'Sustainable materials, garden view, organic amenities' },
      { type: 'Green Suite', pricePerNight: 13500, maxOccupancy: 3, available: 6, description: 'Living area, kitchenette, private garden access' },
      { type: 'Canopy Villa', pricePerNight: 21000, maxOccupancy: 4, available: 3, description: 'Treehouse-style villa, canopy walk, private pool' },
    ],
  },
  {
    id: 'amr-government-quarters',
    locationId: 'amr',
    name: 'FRCC Government Quarters Amaravati',
    tagline: 'Official hospitality redefined',
    imageKey: 'galleryRoom',
    images: ['galleryRoom', 'galleryLobby', 'facilityGym', 'hotelBreakfast'],
    rating: 4.4,
    address: 'Secretariat Road, Amaravati, Andhra Pradesh 522002',
    amenities: ['Free WiFi', 'Secure Campus', 'Pool', 'Fitness Center', 'Business Center', 'Secure Parking', 'Fine Dining', 'Protocol Services'],
    rooms: [
      { type: 'Officer Suite', pricePerNight: 9800, maxOccupancy: 2, available: 8, description: 'Elegant suite with work area, secure communications' },
      { type: 'VIP Pavilion', pricePerNight: 25000, maxOccupancy: 3, available: 2, description: 'Standalone pavilion, private garden, dedicated staff' },
      { type: 'Standard Official', pricePerNight: 6200, maxOccupancy: 2, available: 10, description: 'Comfortable, functional, secure stay' },
    ],
  },
];

export function getHotelsByLocation(locationId) {
  return HOTELS.filter((h) => h.locationId === locationId);
}

export function getHotelById(id) {
  return HOTELS.find((h) => h.id === id);
}