const path = require('path');
try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch {
  // Ignore if .env is missing or already set in process.env
}

const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/bookings');
const miscRoutes = require('./routes/misc');
const paymentRoutes = require('./routes/payments');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', miscRoutes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, '0.0.0.0', () => console.log(`FRCC CONVENTIONS API on http://localhost:${PORT}`));