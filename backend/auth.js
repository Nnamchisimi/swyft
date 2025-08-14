import express from 'express';
const router = express.Router();

// In-memory users (replace with DB in production)
const users = [
  { email: 'john@passenger.com', password: '1234', role: 'passenger' },
  { email: 'sarah@driver.com', password: '5678', role: 'driver' },
];

// Signin route
router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Return user without password
  const { password: pw, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Signup route
router.post('/signup', (req, res) => {
  const { firstName, lastName, email, password, role, phone, vehiclePlate } = req.body;

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = {
    firstName,
    lastName,
    email,
    password, // NOTE: Hash in real apps!
    role: role.toLowerCase(),
    phone: role.toLowerCase() === 'driver' ? phone : null,
    vehiclePlate: role.toLowerCase() === 'driver' ? vehiclePlate : null,
  };

  users.push(newUser);

  const { password: pw, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

export default router;
