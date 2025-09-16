const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS
const corsOptions = {
  origin: "https://swyft-7.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.use(cors(corsOptions));

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("joinRoom", (email) => socket.join(email));
  socket.on("leaveRoom", (email) => socket.leave(email));
  socket.on("newRide", (ride) => io.emit("newRide", ride));
  socket.on("rideUpdated", (ride) => {
    io.emit("rideUpdated", ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit("rideUpdated", ride);
  });
  socket.on("driverLocationUpdated", (data) => io.emit("driverLocationUpdated", data));
  socket.on("disconnect", () => console.log("Client disconnected"));
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection failed:', err));

// ====== Schemas ======
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  phone: String,
  vehicle: String,
  is_verified: { type: Boolean, default: false }
});

const rideSchema = new mongoose.Schema({
  passenger_name: String,
  passenger_email: String,
  passenger_phone: String,
  pickup_location: String,
  dropoff_location: String,
  ride_type: String,
  ride_price: Number,
  driver_name: String,
  driver_email: String,
  driver_phone: String,
  driver_vehicle: String,
  driver_assigned: { type: Boolean, default: false },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  completed_at: Date,
  canceled_at: Date,
  driver_lat: Number,
  driver_lng: Number
});

const emailTokenSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  token: String,
  expiresAt: Date
});

const User = mongoose.model('User', userSchema);
const Ride = mongoose.model('Ride', rideSchema);
const EmailToken = mongoose.model('EmailToken', emailTokenSchema);

// Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ====== Routes ======

// Root
app.get('/', (req, res) => {
  res.send('<h2>SWYFT Backend is running!</h2><p>Frontend: <a href="https://swyft-7.onrender.com">Go to SWYFT</a></p>');
});

// ====== USER SIGNUP ======
app.post('/api/users', async (req, res) => {
  const { firstName, lastName, email, password, role, phone, vehicle } = req.body;
  if (!firstName || !lastName || !email || !password || !role)
    return res.status(400).json({ error: 'Missing required fields' });
  if (role === 'Driver' && !vehicle)
    return res.status(400).json({ error: 'Vehicle required for drivers' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashedPassword, role, phone, vehicle, is_verified: false });

    // Create verification token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await EmailToken.create({ userId: user._id, token, expiresAt: new Date(Date.now() + 3600000) });

    const verifyUrl = `${process.env.REACT_APP_BACKEND_URL}/api/users/verify?token=${token}`;
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====== EMAIL VERIFICATION ======
app.get('/api/users/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.send('<h3>Invalid verification link</h3>');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const record = await EmailToken.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!record) return res.send('<h3>Invalid or expired token</h3>');

    await User.findByIdAndUpdate(decoded.id, { is_verified: true });
    await EmailToken.deleteOne({ token });
    res.redirect(`${process.env.REACT_APP_FRONTEND_URL}/signin`);
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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      vehicle: user.vehicle,
      role: user.role,
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====== GET DRIVERS ======
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await User.find({ role: 'Driver' }).select('firstName lastName email phone vehicle');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
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
  } catch {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Create ride
app.post('/api/rides', async (req, res) => {
  const { passenger_name, passenger_email, passenger_phone, pickup_location, dropoff_location, ride_type, ride_price } = req.body;
  if (!passenger_name || !passenger_email || !passenger_phone || !pickup_location || !dropoff_location || !ride_type || ride_price == null)
    return res.status(400).json({ error: 'Please provide all required fields' });

  try {
    const ride = await Ride.create({ passenger_name, passenger_email, passenger_phone, pickup_location, dropoff_location, ride_type, ride_price });
    io.emit('newRide', ride);
    res.status(201).json({ message: 'Ride booked successfully', rideId: ride._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save ride' });
  }
});

// Accept ride
app.post('/api/rides/:rideId/accept', async (req, res) => {
  const { rideId } = req.params;
  const { email, phone } = req.body;

  try {
    const driver = await User.findOne({ email, role: 'Driver' });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const ride = await Ride.findByIdAndUpdate(rideId, {
      driver_name: `${driver.firstName} ${driver.lastName}`,
      driver_email: driver.email,
      driver_phone: phone,
      driver_vehicle: driver.vehicle,
      driver_assigned: true,
      status: 'accepted'
    }, { new: true });

    io.emit('rideUpdated', ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit('rideUpdated', ride);

    res.json({ message: 'Ride accepted successfully', rideId, driver_name: ride.driver_name, vehicle: ride.driver_vehicle });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

// Start, complete, cancel rides and driver location updates
app.post('/api/rides/:id/start', async (req, res) => {
  try {
    const ride = await Ride.findByIdAndUpdate(req.params.id, { status: 'in_progress' }, { new: true });
    if (!ride || !ride.driver_assigned) return res.status(400).json({ error: 'Cannot start ride' });
    io.emit('rideUpdated', ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit('rideUpdated', ride);
    res.json({ message: 'Ride started', rideId: ride._id });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/rides/:id/complete', async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['accepted', 'in_progress'] } },
      { status: 'completed', completed_at: new Date() },
      { new: true }
    );
    if (!ride) return res.status(400).json({ error: 'Cannot complete ride' });
    io.emit('rideUpdated', ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit('rideUpdated', ride);
    res.json({ message: 'Ride completed', ride });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/rides/:id/cancel', async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, driver_assigned: true },
      { status: 'cancelled', canceled_at: new Date() },
      { new: true }
    );
    if (!ride) return res.status(404).json({ error: 'Ride not found or cannot cancel' });
    io.emit('rideUpdated', ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit('rideUpdated', ride);
    res.json({ message: 'Ride canceled successfully', ride });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/rides/:id/driver-location', async (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'Latitude and longitude required' });

  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, driver_assigned: true, status: { $in: ['accepted', 'in_progress'] } },
      { driver_lat: lat, driver_lng: lng },
      { new: true }
    );
    if (!ride) return res.status(400).json({ error: 'Cannot update location' });
    io.emit('driverLocationUpdated', { rideId: ride._id, lat, lng });
    if (ride.passenger_email) io.to(ride.passenger_email).emit('driverLocationUpdated', { rideId: ride._id, lat, lng });
    res.json({ message: 'Driver location updated', rideId: ride._id });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Active rides for driver
app.get('/api/active-rides', async (req, res) => {
  const { driver_email } = req.query;
  if (!driver_email) return res.status(400).json({ error: 'driver_email is required' });

  try {
    const rides = await Ride.find({ driver_email, driver_assigned: true, status: { $in: ['accepted', 'in_progress'] } }).sort({ created_at: -1 });
    res.json(rides);
  } catch { res.status(500).json({ error: 'Failed to fetch active rides' }); }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
