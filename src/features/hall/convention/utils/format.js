export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export function hoursUntilEvent(date, startTime) {
  const [h, m] = String(startTime || '00:00').split(':').map(Number);
  const start = new Date(`${date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  return (start.getTime() - Date.now()) / 3600000;
}

export const CANCEL_WINDOW_HOURS = 48;

export function canCancel(booking) {
  return booking.status === 'CONFIRMED' && hoursUntilEvent(booking.date, booking.startTime) > CANCEL_WINDOW_HOURS;
}

export function eventStart(date, startTime) {
  const [h, m] = String(startTime || '00:00').split(':').map(Number);
  const start = new Date(`${date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  return start;
}
