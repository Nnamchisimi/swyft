const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '123456789',
  database: process.env.DB_NAME || 'swyft',
  port: process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) return console.error('Database connection failed:', err.stack);
  console.log('Connected to MySQL database.');
});

// Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// === SIGNUP ===
app.post('/api/users', async (req, res) => {
  const { firstName, lastName, email, password, role, phone, vehiclePlate } = req.body;
  if (!firstName || !lastName || !email || !password || !role)
    return res.status(400).json({ error: 'Missing required fields' });

  if (role === 'Driver' && !vehiclePlate)
    return res.status(400).json({ error: 'Vehicle plate required for drivers' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = role === 'Driver'
      ? 'INSERT INTO users (first_name, last_name, email, password, role, phone, vehicle_plate, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
      : 'INSERT INTO users (first_name, last_name, email, password, role, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?, 0)';

    const values = role === 'Driver'
      ? [firstName, lastName, email, hashedPassword, role, phone || null, vehiclePlate]
      : [firstName, lastName, email, hashedPassword, role, phone || null];

    db.query(query, values, (err2, result) => {
      if (err2) return res.status(500).json({ error: 'Failed to create user' });

      const userId = result.insertId;
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

      db.query(
        'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, new Date(Date.now() + 3600000)],
        (err3) => {
          if (err3) return res.status(500).json({ error: 'Failed to save token' });

          const verifyUrl = `http://localhost:3001/api/users/verify?token=${token}`;
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your email',
            html: `<p>Hello ${firstName},</p>
                   <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>
                   <p>This link expires in 1 hour.</p>`
          }, (err4) => {
            if (err4) return res.status(500).json({ error: 'Failed to send verification email' });
            res.status(201).json({ message: 'User created. Check email to verify.' });
          });
      });
    });
  });
});

// GET all drivers
app.get('/api/drivers', (req, res) => {
  const query = 'SELECT id, first_name, last_name, email, phone, vehicle_plate FROM users WHERE role = "Driver"';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch drivers' });
    res.json(results);
  });
});

// === VERIFY EMAIL ===
app.get('/api/users/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.send('<h3>Invalid verification link</h3>');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    db.query('SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()', [token], (err, results) => {
      if (err || results.length === 0) return res.send('<h3>Invalid or expired token</h3>');

      const userId = decoded.id;
      db.query('UPDATE users SET is_verified = 1 WHERE id = ?', [userId], (err2) => {
        if (err2) return res.send('<h3>Failed to verify email</h3>');

        db.query('DELETE FROM email_verification_tokens WHERE token = ?', [token]);
        res.redirect('http://localhost:3000/signin');
      });
    });
  } catch {
    res.send('<h3>Invalid or expired token</h3>');
  }
});

// === LOGIN ===
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = results[0];
    if (user.is_verified === 0) return res.status(403).json({ error: 'Email not verified' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ id: user.id, role: user.role, firstName: user.first_name, email: user.email });
  });
});

// GET rides (optionally filter by passenger_email or driver_email)
app.get('/api/rides', (req, res) => {
  const { passenger_email, driver_email } = req.query;
  let query = 'SELECT * FROM rides';
  let conditions = [];
  let params = [];

  if (passenger_email) {
    conditions.push('passenger_email = ?');
    params.push(passenger_email);
  }

  if (driver_email) {
    conditions.push('driver_email = ?');
    params.push(driver_email);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch rides' });
    res.json(results);
  });
});

// GET active rides for a driver
app.get('/api/active-rides', (req, res) => {
  const { driver_email } = req.query;
  if (!driver_email) return res.status(400).json({ error: 'driver_email is required' });

  const query = `SELECT * FROM rides WHERE driver_email = ? AND status = 'accepted' ORDER BY created_at DESC`;
  db.query(query, [driver_email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch active rides' });
    res.json(results);
  });
});

// POST new ride
app.post('/api/rides', (req, res) => {
  const { passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType } = req.body;
  if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff || !rideType)
    return res.status(400).json({ error: 'Please provide all required fields' });

  const query = `
    INSERT INTO rides (passenger_name, passenger_email, passenger_phone, pickup_location, dropoff_location, ride_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to save ride' });
    res.status(201).json({ message: 'Ride booked successfully', rideId: result.insertId });
  });
});

// Accept ride
app.post('/api/rides/:rideId/accept', (req, res) => {
  const rideId = req.params.rideId;
  const { name, email, phone, vehicle } = req.body;

  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(404).json({ error: 'Ride not found' });

    const ride = results[0];
    if (ride.driver_assigned) return res.status(400).json({ error: 'Ride already accepted' });

    const updateQuery = `
      UPDATE rides 
      SET driver_name = ?, driver_email = ?, driver_phone = ?, driver_vehicle = ?, status = 'accepted', driver_assigned = 1
      WHERE id = ?
    `;
    db.query(updateQuery, [name, email, phone, vehicle, rideId], (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to accept ride' });
      res.json({ message: 'Ride accepted successfully', rideId });
    });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
