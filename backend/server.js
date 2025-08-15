const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'swyft',
  port: 3306,
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
  const { passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType } = req.body;

  if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff || !rideType) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  const query = `
    INSERT INTO rides 
      (passenger_name, passenger_email, passenger_phone, pickup_location, dropoff_location, ride_type) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    query,
    [passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType],
    (err, result) => {
      if (err) {
        console.error('Error inserting ride:', err);
        return res.status(500).json({ error: 'Failed to save ride' });
      }
      res.status(201).json({ message: 'Ride booked successfully', rideId: result.insertId });
    }
  );
});

// POST API to create a new user (passenger or driver) with email check
app.post('/api/users', (req, res) => {
  const { firstName, lastName, email, password, role, phone, vehiclePlate } = req.body;

  // Check required fields
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (role === 'Driver' && !vehiclePlate) {
    return res.status(400).json({ error: 'Vehicle plate is required for drivers' });
  }

  // First, check if email already exists
  const checkEmailQuery = `SELECT * FROM users WHERE email = ?`;
  db.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // If email is unique, insert the new user
    let query, values;

    if (role === 'Driver') {
      query = `
        INSERT INTO users 
          (first_name, last_name, email, password, role, phone, vehicle_plate) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      values = [firstName, lastName, email, password, role, phone || null, vehiclePlate];
    } else {
      query = `
        INSERT INTO users 
          (first_name, last_name, email, password, role, phone) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      values = [firstName, lastName, email, password, role, phone || null];
    }

    db.query(query, values, (err2, result) => {
      if (err2) {
        console.error('Error creating user:', err2);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    });
  });
});

// GET API to fetch user by email
app.get('/api/users', (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
    res.json(results); // returns [] if not found
  });
});


// GET API to fetch recent rides (all rides)
app.get('/api/rides', (req, res) => {
  db.query('SELECT * FROM rides ORDER BY created_at DESC LIMIT 10', (err, results) => {
    if (err) {
      console.error('Error fetching rides:', err);
      return res.status(500).json({ error: 'Failed to fetch rides' });
    }
    res.json(results);
  });
});

// GET API to fetch active rides for a specific driver (only accepted rides)
app.get('/api/active-rides/:driver', (req, res) => {
  const driverName = req.params.driver;
  const query = `
    SELECT * FROM rides 
    WHERE driver_assigned = 1 AND driver_name = ? 
    ORDER BY created_at DESC
  `;

  db.query(query, [driverName], (err, results) => {
    if (err) {
      console.error('Error fetching active rides:', err);
      return res.status(500).json({ error: 'Failed to fetch active rides' });
    }
    res.json(results);
  });
});

// POST API to accept a ride
app.post('/api/rides/:id/accept', (req, res) => {
  const rideId = req.params.id;
  const { name, phone, vehicle } = req.body;

  if (!name || !phone || !vehicle) {
    return res.status(400).json({ error: 'Driver info is incomplete' });
  }

  const query = `
    UPDATE rides 
    SET driver_assigned = 1, driver_name = ?, driver_phone = ?, driver_vehicle = ? 
    WHERE id = ? AND (driver_assigned IS NULL OR driver_assigned = 0)
  `;

  db.query(query, [name, phone, vehicle, rideId], (err, result) => {
    if (err) {
      console.error('Error accepting ride:', err);
      return res.status(500).json({ error: 'Failed to accept ride' });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Ride not found or already assigned' });
    }

    // Return the updated ride
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err2, rows) => {
      if (err2) {
        console.error('Error fetching updated ride:', err2);
        return res.status(500).json({ error: 'Failed to fetch updated ride' });
      }
      res.json({ message: 'Ride accepted successfully', ride: rows[0] });
    });
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
