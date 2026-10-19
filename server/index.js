const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/bookings');
const miscRoutes = require('./routes/misc');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/bookings', bookingRoutes);
app.use('/api', miscRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`FRCC CONVENTIONS API on http://localhost:${PORT}`));