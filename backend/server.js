// server.js
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

// ===== Socket.io setup =====
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'https://swyftlatest.vercel.app', // only production frontend
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('joinRoom', (email) => socket.join(email));
  socket.on('leaveRoom', (email) => socket.leave(email));

  socket.on('newRide', (ride) => io.emit('newRide', ride));
  socket.on('rideUpdated', (ride) => {
    io.emit('rideUpdated', ride);
    if (ride.passenger_email) io.to(ride.passenger_email).emit('rideUpdated', ride);
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

// ===== MongoDB connection =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection failed:', err));

// ===== Schemas =====
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  phone: String,
  vehicle_plate: String,
  is_verified: { type: Boolean, default: false },
});

const tokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: String,
  expires_at: Date,
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
  canceled_at: Date,
});

const User = mongoose.model('User', userSchema);
const Token = mongoose.model('Token', tokenSchema);
const Ride = mongoose.model('Ride', rideSchema);

// ===== Email transporter =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ===== Routes =====

// Health check
app.get('/', (req, res) => res.send('Backend is running!'));

// Signup
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
      expires_at: new Date(Date.now() + 3600000),
    });

    await verificationToken.save();

    const verifyUrl = `${process.env.BACKEND_URL}/api/users/verify?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      html: `<p>Hello ${firstName},</p>
             <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>
             <p>This link expires in 1 hour.</p>`,
    });

    res.status(201).json({ message: 'User created. Check email to verify.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Email verification
app.get('/api/users/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.send('<h3>Invalid verification link</h3>');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenDoc = await Token.findOne({ token, expires_at: { $gt: new Date() } });
    if (!tokenDoc) return res.send('<h3>Invalid or expired token</h3>');

    await User.findByIdAndUpdate(decoded.id, { is_verified: true });
    await Token.deleteOne({ token });
    res.redirect(`${process.env.FRONTEND_URL}/signin`);
  } catch {
    res.send('<h3>Invalid or expired token</h3>');
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    res.json({
      id: user._id,
      role: user.role,
      firstName: user.first_name,
      email: user.email,
      phone: user.phone,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await User.find({ role: 'Driver' }).select('first_name last_name email phone vehicle_plate');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers', details: err.message });
  }
});

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

// Create ride
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
      price: ridePrice,
    });
    const savedRide = await newRide.save();
    res.status(201).json({ message: 'Ride booked successfully', rideId: savedRide._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save ride', details: err.message });
  }
});

// Add other ride update routes here (accept/start/complete/cancel) fully with Mongoose

// ===== Start server =====
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
