import React, { useState, useEffect } from 'react';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RecentRides from './RecentRides';
import socket from "./socket";



export default function PassengerDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [recentRides, setRecentRides] = useState([]); // list of passenger rides


  // Form state
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [rideType, setRideType] = useState('economy');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Prefill email from session or backend
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('userEmail');
    if (savedEmail) {
      setPassengerEmail(savedEmail);
    } else {
      async function fetchUserEmail() {
        try {
          const token = sessionStorage.getItem('authToken');
          const res = await fetch('http://localhost:3001/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.email) {
            setPassengerEmail(data.email);
              setPassengerName(data.name || '');     // add this
             setPassengerPhone(data.phone || '');   // add this
            sessionStorage.setItem('userEmail', data.email);
            
          }
        } catch (err) {
          console.error('Error fetching user email:', err);
        }
      }
      fetchUserEmail();
    }
  }, []);
// Join private room for real-time updates
useEffect(() => {
  if (!passengerEmail) return;

  // Join private room
  socket.emit("joinRoom", passengerEmail);

  const handleRideUpdate = (ride) => {
    if (ride.passenger_email !== passengerEmail) return;

    // Update the recent rides state
    setRecentRides(prev => {
      const exists = prev.find(r => r.id === ride.id);
      if (exists) {
        return prev.map(r => r.id === ride.id ? ride : r);
      } else {
        return [ride, ...prev];
      }
    });

    // Show snackbar
    setSnackbar({
      open: true,
      message: `Ride Update: ${ride.status}`,
      severity: 'info',
    });
  };

  socket.on("rideUpdated", handleRideUpdate);

  return () => {
    socket.off("rideUpdated", handleRideUpdate);
    socket.emit("leaveRoom", passengerEmail);
  };
}, [passengerEmail]);


  const handleChange = (setter) => (e) => setter(e.target.value);
  const handleRideTypeChange = (_, newType) => { if (newType) setRideType(newType); };

  const onBookClick = async () => {
    if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff) {
      setSnackbar({ open: true, message: 'Please fill all fields', severity: 'error' });
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerName, passengerEmail, passengerPhone, pickup, dropoff, rideType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed');

      setSnackbar({ open: true, message: data.message, severity: 'success' });

      // Reset form (keep email)
      setPassengerName('');
      setPassengerPhone('');
      setPickup('');
      setDropoff('');
      setRideType('economy');
// On booking a ride
socket.emit("newRide", {
  id: data.id, // ride ID returned from backend
  passenger_name: passengerName,
  passenger_email: passengerEmail,
  passenger_phone: passengerPhone,
  pickup_location: pickup,
  dropoff_location: dropoff,
  ride_type: rideType,
});


    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const onSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          bgcolor: '#82b1ff',
          color: 'white',
          p: 2,
          textAlign: 'left',
          fontWeight: 'bold',
          fontSize: isDesktop ? '1.5rem' : '1.25rem',
          pl: isDesktop ? '50px' : '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isDesktop ? 'space-between' : 'flex-start',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/taxifav.png" alt="Taxi Icon" style={{ width: isDesktop ? 35 : 30, height: isDesktop ? 35 : 30, marginRight: 10 }} />
          <span style={{ fontWeight: 'bold', fontSize: isDesktop ? '1.75rem' : '1.5rem' }}>SWYFT - Passenger Dashboard</span>
          
        </Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 2, pl: isDesktop ? 5 : 3 }}>
                  Welcome, {passengerName} ({passengerEmail}) : {passengerPhone}
                </Typography>
        
        {isDesktop && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/')}
            sx={{
              mr: 15,
              borderRadius: '15px',
              backgroundColor: '#ffffff',
              fontWeight: 'bold',
              padding: '10px 24px',
              color: '#000000',
              '&:hover': { backgroundColor: '#f0f0f0' },
            }}
          >
            Home
          </Button>
        )}
      </Box>

      {/* Main content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          justifyContent: 'center',
          mt: 2,
          px: isDesktop ? 7 : 2,
          gap: 3,
          alignItems: isDesktop ? 'flex-start' : 'center',
        }}
      >
        
        {/* Ride booking form */}
        <Container
          maxWidth="xs"
          sx={{
            p: 4,
            border: '1px solid #ccc',
            borderRadius: 3,
            width: '100%',
            maxWidth: 360,
          }}
          
        >
          
          <Typography variant={isDesktop ? "h5" : "h6"} align={isDesktop ? "left" : "center"} gutterBottom sx={{ fontWeight: 'bold' }}>
            Book a Ride
          </Typography>

          <TextField fullWidth label="Passenger Name" margin="normal" value={passengerName} onChange={handleChange(setPassengerName)} />
          <TextField fullWidth label="Passenger Email" margin="normal" value={passengerEmail} disabled />
          <TextField fullWidth label="Passenger Phone" margin="normal" value={passengerPhone} onChange={handleChange(setPassengerPhone)} />
          <TextField fullWidth label="Pickup Location" margin="normal" value={pickup} onChange={handleChange(setPickup)} />
          <TextField fullWidth label="Drop-off Location" margin="normal" value={dropoff} onChange={handleChange(setDropoff)} />

          <Box sx={{ my: isDesktop ? 3 : 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup value={rideType} exclusive onChange={handleRideTypeChange}>
              <ToggleButton value="economy">Economy — 150 TL</ToggleButton>
              <ToggleButton value="premium">Premium — 200 TL</ToggleButton>
              <ToggleButton value="luxury">Luxury — 300 TL</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={onBookClick}
            sx={{ bgcolor: '#82b1ff', '&:hover': { bgcolor: '#5a8de0' } }}
          >
            Book Ride
          </Button>

          <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={onSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert onClose={onSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>

        {/* Recent rides */}
        <RecentRides userEmail={passengerEmail} />

        
      </Box>
    </>
  );
}
