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

const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3003", methods: ["GET","POST"] },
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("joinRoom", (email) => socket.join(email));
  socket.on("leaveRoom", (email) => socket.leave(email));

  socket.on("newRide", (ride) => io.emit("newRide", ride));
  socket.on("rideUpdated", (ride) => {
    io.emit("rideUpdated", ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit("rideUpdated", ride);
  });

  socket.on("disconnect", () => console.log("Client disconnected"));
});

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '123456789',
  database: process.env.DB_NAME || 'swyft',
  port: process.env.DB_PORT || 3306,
});

db.connect(err => {
  if (err) return console.error('Database connection failed:', err.stack);
  console.log('Connected to MySQL database.');
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ====== USER SIGNUP ======
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

// ====== EMAIL VERIFICATION ======
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
        res.redirect('http://localhost:3003/signin');
      });
    });
  } catch {
    res.send('<h3>Invalid or expired token</h3>');
  }
});

// ====== LOGIN ======
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = results[0];
    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ id: user.id, role: user.role, firstName: user.first_name, email: user.email, phone: user.phone });
  });
});

// ====== GET DRIVERS ======
app.get('/api/drivers', (req, res) => {
  db.query('SELECT id, first_name, last_name, email, phone, vehicle_plate FROM users WHERE role = "Driver"', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch drivers' });
    res.json(results);
  });
});

// ====== RIDES ======
// Get rides
app.get('/api/rides', (req, res) => {
  const { passenger_email, driver_email, status } = req.query;
  let query = 'SELECT * FROM rides';
  const conditions = [];
  const params = [];

  if (passenger_email) { conditions.push('passenger_email = ?'); params.push(passenger_email); }
  if (driver_email) { conditions.push('driver_email = ?'); params.push(driver_email); }
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    conditions.push(`status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch rides' });
    res.json(results);
  });
});

// Create new ride
app.post('/api/rides', (req, res) => {
  const { passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType, ridePrice } = req.body;
  if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff || !rideType || ridePrice == null)
    return res.status(400).json({ error: 'Please provide all required fields' });

  const query = `INSERT INTO rides (passenger_name, passenger_email, passenger_phone, pickup_location, dropoff_location, ride_type, price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType, ridePrice], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to save ride' });
    res.status(201).json({ message: 'Ride booked successfully', rideId: result.insertId });
  });
});

// Accept ride
app.post('/api/rides/:rideId/accept', (req, res) => {
  const rideId = req.params.rideId;
  const { email, phone } = req.body;

  db.query('SELECT first_name, last_name, vehicle_plate FROM users WHERE email = ? AND role = "Driver"', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!results.length) return res.status(404).json({ error: 'Driver not found' });

    const driver = results[0];
    const driver_name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
    const vehiclePlate = driver.vehicle_plate;

    const updateQuery = `UPDATE rides 
                         SET driver_name = ?, driver_email = ?, driver_phone = ?, driver_vehicle = ?, driver_assigned = 1, status = 'accepted'
                         WHERE id = ?`;

    db.query(updateQuery, [driver_name, email, phone, vehiclePlate, rideId], (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to accept ride' });
      res.json({ message: 'Ride accepted successfully', rideId, driver_name, vehicle: vehiclePlate });
    });
  });
});

// Start ride
app.post('/api/rides/:id/start', (req, res) => {
  const rideId = req.params.id;
  const query = `UPDATE rides SET status = 'in_progress' WHERE id = ? AND driver_assigned = 1`;

  db.query(query, [rideId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!result.affectedRows) return res.status(400).json({ error: 'Cannot start ride' });

    io.emit("rideUpdated", { id: rideId, status: "in_progress" });
    db.query("SELECT passenger_email FROM rides WHERE id = ?", [rideId], (err2, results) => {
      if (!err2 && results[0]) io.to(results[0].passenger_email).emit("rideUpdated", { id: rideId, status: "in_progress" });
    });

    res.json({ message: 'Ride started', rideId });
  });
});

// Complete ride
app.post('/api/rides/:id/complete', (req, res) => {
  const rideId = req.params.id;
  const query = `UPDATE rides SET status = 'completed', completed_at = NOW() WHERE id = ? AND status IN ('accepted','in_progress')`;

  db.query(query, [rideId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!result.affectedRows) return res.status(400).json({ error: 'Cannot complete ride' });

    db.query("SELECT * FROM rides WHERE id = ?", [rideId], (err2, rows) => {
      if (err2 || !rows[0]) return res.status(500).json({ error: 'Could not fetch ride after update' });

      const updatedRide = rows[0];
      io.emit("rideUpdated", updatedRide);
      if (updatedRide.passenger_email) io.to(updatedRide.passenger_email).emit("rideUpdated", updatedRide);
      res.json({ message: 'Ride completed', ride: updatedRide });
    });
  });
});

// Cancel ride
app.post("/api/rides/:id/cancel", (req, res) => {
  const rideId = parseInt(req.params.id, 10);
  const query = `UPDATE rides SET status = 'canceled', canceled_at = NOW() WHERE id = ? AND driver_assigned = 1`;

  db.query(query, [rideId], (err, result) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    if (!result.affectedRows) return res.status(404).json({ error: "Ride not found or cannot cancel" });

    db.query("SELECT * FROM rides WHERE id = ?", [rideId], (err2, rows) => {
      if (err2 || !rows[0]) return res.status(500).json({ error: "Could not fetch ride after cancel" });

      const updatedRide = rows[0];
      io.emit("rideUpdated", updatedRide);
      if (updatedRide.passenger_email) io.to(updatedRide.passenger_email).emit("rideUpdated", updatedRide);
      res.json({ message: "Ride canceled successfully", ride: updatedRide });
    });
  });
});

// Driver location update
app.post("/api/rides/:id/driver-location", (req, res) => {
  const rideId = req.params.id;
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: "longitude and latitude are required" });

  const query = `UPDATE rides SET driver_lat = ?, driver_lng = ? WHERE id = ? AND driver_assigned = 1 AND status IN ('accepted', 'in_progress')`;
  db.query(query, [lat, lng, rideId], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!result.affectedRows) return res.status(400).json({ error: "cannot update location" });

    db.query("SELECT passenger_email FROM rides WHERE id = ?", [rideId], (err2, results) => {
      if (!err2 && results[0]) io.to(results[0].passenger_email).emit("driverLocationUpdated", { rideId, lat, lng });
    });

    io.emit("driverLocationUpdated", { rideId, lat, lng });
    res.json({ message: "Driver location updated", rideId });
  });
});

// Active rides
app.get('/api/active-rides', (req, res) => {
  const { driver_email } = req.query;
  if (!driver_email) return res.status(400).json({ error: 'driver_email is required' });

  const query = `SELECT * FROM rides WHERE driver_email = ? AND driver_assigned = 1 AND status IN ('accepted', 'in_progress') ORDER BY created_at DESC`;
  db.query(query, [driver_email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch active rides' });
    res.json(results);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
