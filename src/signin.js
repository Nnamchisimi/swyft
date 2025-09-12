import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Link,
  CircularProgress,
  IconButton,
  Drawer,
  List,
  ListItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import axios from 'axios';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

   const API_URL = process.env.REACT_APP_API_URL;

try {
  const response = await axios.post(`${API_URL}/users/login`, {
    email,
    password,
  });


      const user = response.data;

      // Save auth token
      if (user.token) sessionStorage.setItem('authToken', user.token);

      // Save email
      const savedEmail = user.email || user.user?.email;
      if (savedEmail) sessionStorage.setItem('userEmail', savedEmail);

      // Save driver info
      const driverData = {
        name: user.name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.user?.name),
        email: user.email || user.user?.email,
        phone: user.phone || user.user?.phone,
        vehicle: user.vehicle || user.user?.vehicle,
      };
      sessionStorage.setItem('driverInfo', JSON.stringify(driverData));

      // Redirect based on role
      const role = user.role || user.user?.role;
      if (role === 'Passenger') navigate('/ride-booking');
      else if (role === 'Driver') navigate('/driver');
      else setError('Unknown user role');

    } catch (err) {
      console.error(err);
      if (err.response) setError(err.response.data.error || 'Login failed');
      else setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          bgcolor: '#82b1ff',
          color: 'white',
          p: 2,
          fontWeight: 'bold',
          fontSize: '1.5rem',
          pl: { xs: 2, sm: '50px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src="/taxifav.png"
            alt="Taxi Icon"
            sx={{ width: 35, height: 35, mt: -1.25, ml: { xs: 1, sm: 15 } }}
          />
          <Box component="span" sx={{ fontWeight: 'bold', fontSize: { xs: '1.25rem', sm: '1.75rem' }, ml: '10px' }}>
            SWYFT
          </Box>
        </Box>

        {/* Desktop Buttons */}
        {isDesktop && (
          <Box sx={{ display: 'flex', gap: 2, mr: { sm: 15 } }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              sx={{
                borderRadius: '15px',
                borderColor: '#ffffff',
                color: '#ffffff',
                fontWeight: 'bold',
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.25 },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: '#ffffff',
                },
              }}
            >
              Home
            </Button>
          </Box>
        )}

        {/* Mobile Hamburger */}
        {!isDesktop && (
          <IconButton color="inherit" sx={{ ml: 'auto' }} onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
          <List>
            <ListItem disablePadding>
              <Button fullWidth startIcon={<HomeIcon />} onClick={() => navigate('/')}>
                Home
              </Button>
            </ListItem>
            <ListItem disablePadding>
              <Button fullWidth startIcon={<RocketLaunchIcon />} onClick={() => navigate('/getstarted')}>
                Get Started
              </Button>
            </ListItem>
            <ListItem disablePadding>
              <Button fullWidth startIcon={<LoginIcon />} onClick={() => navigate('/signin')}>
                Sign In
              </Button>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Sign In Form */}
      <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#4e4e4eff' }}>
          Sign In
        </Typography>

        {error && (
          <Typography color="error" variant="body2" textAlign="center" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 2, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              borderRadius: '15px',
              borderColor: '#ffffff',
              color: '#ffffff',
              fontWeight: 'bold',
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.25 },
              display: 'flex',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderColor: '#ffffff',
              },
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
          </Button>

          <Typography variant="body2" textAlign="center">
            Don’t have an account?{' '}
            <Link
              component="button"
              type="button"
              onClick={() => navigate('/getstarted')}
              sx={{ color: '#82b1ff', fontWeight: 'bold' }}
            >
              Get Started
            </Link>
          </Typography>
        </Box>
      </Container>
    </>
  );
}
