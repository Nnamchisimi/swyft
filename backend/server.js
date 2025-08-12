const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow frontend to communicate with backend
app.use(express.json()); // Parse JSON bodies

// MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',              // replace with your MySQL username
  password: '123456789',     // replace with your MySQL password
  database: 'swyft',         // your database name
  port: 3306,                // default MySQL port (optional)
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});

// POST API to insert new ride into the rides table
app.post('/api/rides', (req, res) => {
  const { passengerName, pickup, dropoff, rideType } = req.body;

  if (!passengerName || !pickup || !dropoff || !rideType) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

    const query = 'INSERT INTO rides (passenger_name, pickup_location, dropoff_location, ride_type) VALUES (?, ?, ?, ?)';
    db.query(query, [passengerName, pickup, dropoff, rideType], (err, result) => {
    if (err) {
      console.error('Error inserting ride:', err);
      return res.status(500).json({ error: 'Failed to save ride' });
    }
    res.status(201).json({ message: 'Ride booked successfully', rideId: result.insertId });
  });
});
app.get('/api/rides', (req, res) => {
  db.query('SELECT * FROM rides ORDER BY created_at DESC LIMIT 10', (err, results) => {
    if (err) {
      console.error('Error fetching rides:', err);
      return res.status(500).json({ error: 'Failed to fetch rides' });
    }
    res.json(results);
  });
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
