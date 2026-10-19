// ---------------------------------------------------------------------------
// /src/data/sampleEvents.js — Sample Events for FRCC
// Clearly marked isSample: true (SAMPLE, replace).
// Dates computed dynamically between 2 and 8 weeks ahead in evenings.
// ---------------------------------------------------------------------------

function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSampleEvents() {
  return [
    {
      id: 'short-film-screening-night',
      title: 'Short Film Screening Night',
      category: 'screening',
      event_date: getFutureDate(14), // ~2 weeks ahead
      start_time: '18:30:00',
      end_time: '20:30:00',
      venue: 'FRCC',
      description: 'A curated evening showcasing independent short film narratives followed by an open discussion on filmmaking craft.',
      image_url: null,
      imageSlot: 'event-short-film-screening-night',
      featured: true,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
    {
      id: 'classic-cinema-weekend',
      title: 'Classic Cinema Weekend',
      category: 'screening',
      event_date: getFutureDate(21), // ~3 weeks ahead
      start_time: '17:00:00',
      end_time: '20:00:00',
      venue: 'FRCC',
      description: 'Retrospective screening of milestone regional and world cinema classics on the auditorium big screen.',
      image_url: null,
      imageSlot: 'event-classic-cinema-weekend',
      featured: false,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
    {
      id: 'filmmakers-and-artists-meetup',
      title: 'Filmmakers and Artists Meetup',
      category: 'meetup',
      event_date: getFutureDate(28), // ~4 weeks ahead
      start_time: '18:00:00',
      end_time: '20:00:00',
      venue: 'FRCC',
      description: 'Informal networking mixer for cinema practitioners, writers, directors, and cultural creators to exchange ideas.',
      image_url: null,
      imageSlot: 'event-filmmakers-and-artists-meetup',
      featured: true,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
    {
      id: 'acting-workshop',
      title: 'Acting Workshop',
      category: 'workshop',
      event_date: getFutureDate(38), // ~5.5 weeks ahead
      start_time: '16:00:00',
      end_time: '19:00:00',
      venue: 'FRCC',
      description: 'Interactive performance and screen acting fundamentals workshop designed for emerging talents and enthusiasts.',
      image_url: null,
      imageSlot: 'event-acting-workshop',
      featured: false,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
    {
      id: 'script-reading-circle',
      title: 'Script Reading Circle',
      category: 'workshop',
      event_date: getFutureDate(45), // ~6.5 weeks ahead
      start_time: '17:30:00',
      end_time: '19:30:00',
      venue: 'FRCC',
      description: 'Collaborative table read and constructive feedback session for original screenplays and dramatic narratives in progress.',
      image_url: null,
      imageSlot: 'event-script-reading-circle',
      featured: false,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
    {
      id: 'cultural-evening-music-and-dance',
      title: 'Cultural Evening: Music and Dance',
      category: 'cultural',
      event_date: getFutureDate(54), // ~7.5 weeks ahead
      start_time: '18:30:00',
      end_time: '21:00:00',
      venue: 'FRCC',
      description: 'An evening celebrating traditional and contemporary musical performances and classical dance forms on the open lawns.',
      image_url: null,
      imageSlot: 'event-cultural-evening-music-and-dance',
      featured: true,
      active: true,
      isSample: true, // SAMPLE: replace with real club events
    },
  ];
}

export const SAMPLE_EVENTS = getSampleEvents();
export default SAMPLE_EVENTS;
