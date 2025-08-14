import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';  // Import useNavigate
import RecentRides from './RecentRides';

export default function RideBookingViewDesktop() {
  const navigate = useNavigate();

  const [passengerName, setPassengerName] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [rideType, setRideType] = useState('economy');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const onPassengerNameChange = (e) => setPassengerName(e.target.value);
  const onPickupChange = (e) => setPickup(e.target.value);
  const onDropoffChange = (e) => setDropoff(e.target.value);
  const onRideTypeChange = (_, newType) => {
    if (newType !== null) setRideType(newType);
  };

  const onBookClick = async () => {
    if (!passengerName || !pickup || !dropoff) {
      setSnackbar({ open: true, message: 'Please fill all fields', severity: 'error' });
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerName, pickup, dropoff, rideType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      setSnackbar({ open: true, message: data.message, severity: 'success' });

      // Clear fields after booking
      setPassengerName('');
      setPickup('');
      setDropoff('');
      setRideType('economy');
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const onSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: '#82b1ff',
          color: 'white',
          p: 2,
          textAlign: 'left',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          pl: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between', // space between title and button
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/taxifav.png"
            alt="Taxi Icon"
            style={{ width: 35, height: 35, marginLeft: 20 }}
          />
          <span style={{ fontWeight: 'bold', fontSize: '1.75rem', marginLeft: '10px' }}>
            SWYFT
          </span>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          onClick={() => navigate('/')} // redirect to homepage
            sx={{
              mr: 15,
              borderRadius: '15px',       // round edges
              backgroundColor: '#ffffff', // white background
              fontWeight: 'bold',
              padding: '10px 24px',
              color: '#000000',           // black text
              '&:hover': {
                backgroundColor: '#f0f0f0', // light grey hover
              },
            }}
        >
          Home
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 2,
          px: 7,
        }}
      >
        <Container
          maxWidth="xs"
          sx={{
            p: 4,
            border: '1px solid #ccc',
            borderRadius: 3,
            boxShadow: 0,
          }}
        >
          <Typography variant="h5" component="h1" align="left" gutterBottom sx={{ fontWeight: 'bold' }}>
            Book a Ride
          </Typography>

          <TextField
            fullWidth
            label="Passenger Name"
            variant="outlined"
            margin="normal"
            value={passengerName}
            onChange={onPassengerNameChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            label="Pickup Location"
            variant="outlined"
            margin="normal"
            value={pickup}
            onChange={onPickupChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            label="Drop-off Location"
            variant="outlined"
            margin="normal"
            value={dropoff}
            onChange={onDropoffChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={rideType}
              exclusive
              onChange={onRideTypeChange}
              aria-label="ride type"
              color="primary"
            >
              <ToggleButton value="economy" aria-label="Economy">
                Economy — 150 TL
              </ToggleButton>
              <ToggleButton value="premium" aria-label="Premium">
                Premium — 200 TL
              </ToggleButton>
              <ToggleButton value="luxury" aria-label="Luxury">
                Luxury — 300 TL
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={onBookClick}
            sx={{
              bgcolor: '#82b1ff',
              color: 'white',
              '&:hover': {
                bgcolor: '#5a8de0',
              },
            }}
          >
            Book Ride
          </Button>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={onSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={onSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>

        <RecentRides />
      </Box>
    </>
  );
}
