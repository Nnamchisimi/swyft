const express = require('express');
const mongoose = require('mongoose');
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
  cors: { 
    origin: [
      'https://swyftlatest.vercel.app', // production frontend
      'http://localhost:3000'            // local frontend dev
    ],
    methods: ["GET","POST"]
  },
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

// ====== DATABASE ======
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection failed:", err));

// ====== SCHEMAS ======
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  phone: String,
  vehicle_plate: String,
  is_verified: { type: Boolean, default: false }
});

const tokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: String,
  expires_at: Date
});

const rideSchema = new mongoose.Schema({
  passenger_name: String,
  passenger_email: String,
  passenger_phone: String,
  pickup_location: String,
  dropoff_location: String,
  ride_type: String,
  price: Number,
  driver_name: String,
  driver_email: String,
  driver_phone: String,
  driver_vehicle: String,
  driver_assigned: { type: Boolean, default: false },
  driver_lat: Number,
  driver_lng: Number,
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  completed_at: Date,
  canceled_at: Date
});

const User = mongoose.model('User', userSchema);
const Token = mongoose.model('Token', tokenSchema);
const Ride = mongoose.model('Ride', rideSchema);

// ====== EMAIL TRANSPORTER ======
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

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      role,
      phone,
      vehicle_plate: vehiclePlate,
    });

    const savedUser = await newUser.save();
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const verificationToken = new Token({
      user_id: savedUser._id,
      token,
      expires_at: new Date(Date.now() + 3600000)
    });

    await verificationToken.save();

    const verifyUrl = `http://localhost:3001/api/users/verify?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      html: `<p>Hello ${firstName},</p>
             <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>
             <p>This link expires in 1 hour.</p>`
    });

    res.status(201).json({ message: 'User created. Check email to verify.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// ====== EMAIL VERIFICATION ======
app.get('/api/users/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.send('<h3>Invalid verification link</h3>');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenDoc = await Token.findOne({ token, expires_at: { $gt: new Date() } });
    if (!tokenDoc) return res.send('<h3>Invalid or expired token</h3>');

    await User.findByIdAndUpdate(decoded.id, { is_verified: true });
    await Token.deleteOne({ token });
    res.redirect('http://localhost:3003/signin');
  } catch {
    res.send('<h3>Invalid or expired token</h3>');
  }
});

// ====== LOGIN ======
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ id: user._id, role: user.role, firstName: user.first_name, email: user.email, phone: user.phone });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ====== GET DRIVERS ======
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await User.find({ role: "Driver" }).select('first_name last_name email phone vehicle_plate');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers', details: err.message });
  }
});

// ====== RIDES ======
// Get rides
app.get('/api/rides', async (req, res) => {
  const { passenger_email, driver_email, status } = req.query;
  const filter = {};
  if (passenger_email) filter.passenger_email = passenger_email;
  if (driver_email) filter.driver_email = driver_email;
  if (status) filter.status = { $in: status.split(',').map(s => s.trim()) };

  try {
    const rides = await Ride.find(filter).sort({ created_at: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides', details: err.message });
  }
});

// Create new ride
app.post('/api/rides', async (req, res) => {
  const { passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType, ridePrice } = req.body;
  if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff || !rideType || ridePrice == null)
    return res.status(400).json({ error: 'Please provide all required fields' });

  try {
    const newRide = new Ride({
      passenger_name: passengerName,
      passenger_email: passengerEmail,
      passenger_phone: passengerPhone,
      pickup_location: pickup,
      dropoff_location: dropoff,
      ride_type: rideType,
      price: ridePrice
    });
    const savedRide = await newRide.save();
    res.status(201).json({ message: 'Ride booked successfully', rideId: savedRide._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save ride', details: err.message });
  }
});

// ====== ACCEPT, START, COMPLETE, CANCEL, DRIVER LOCATION ROUTES ======
// (Same logic as original MySQL routes, replaced with Mongoose queries)


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
