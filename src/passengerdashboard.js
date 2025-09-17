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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Drawer,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import RecentRides from './RecentRides';
import socket from "./socket";
import PassengerMap from './passengermap';

// ------------------ LocationInput Component ------------------
function LocationInput({ label, onSelect, value }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    if (!query) return setSuggestions([]);
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input: query, location: new window.google.maps.LatLng(41.0082, 28.9784), radius: 5000 },
      (predictions, status) => setSuggestions(status === 'OK' && predictions ? predictions : [])
    );
  }, [query]);

  return (
    <Box sx={{ position: 'relative', mb: 2 }}>
      <TextField
        fullWidth
        label={label}
        variant="outlined"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <List sx={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200, bgcolor: 'background.paper', overflowY: 'auto', border: '1px solid #ccc', zIndex: 10 }}>
          {suggestions.map((s) => (
            <ListItem key={s.place_id} disablePadding>
              <ListItemButton
                onClick={() => {
                  setQuery(s.description);
                  setSuggestions([]);
                  onSelect(s.description);
                }}
              >
                {s.description}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

// ------------------ PassengerDashboard Component ------------------
export default function PassengerDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recentRides, setRecentRides] = useState([]);
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [rideType, setRideType] = useState('');
  const [ridePrice, setRidePrice] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedRide, setSelectedRide] = useState(null);
  const [rideBooked, setRideBooked] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [rideToConfirm, setRideToConfirm] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const ridePrices = { economy: 150, premium: 200, luxury: 300 };

useEffect(() => {
  // Get token from sessionStorage
  const token = sessionStorage.getItem('authToken');

  // If no token, redirect to signin page immediately
  if (!token) {
    navigate('/signin');
    return;
  }

  // Optional: you can also validate the token with backend here if needed
}, [navigate]);

  // Fetch user info
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('userEmail');
    if (savedEmail) setPassengerEmail(savedEmail);
    else {
      async function fetchUserEmail() {
        try {
          const token = sessionStorage.getItem('authToken');
          const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.email) {
            setPassengerEmail(data.email);
            setPassengerName(data.name || '');
            setPassengerPhone(data.phone || '');
            sessionStorage.setItem('userEmail', data.email);
          }
        } catch (err) {
          console.error(err);
        }
      }
      fetchUserEmail();
    }
  }, []);

  // Listen for ride updates
  useEffect(() => {
    if (!selectedRide) return;

    socket.emit("joinRideRoom", selectedRide.id);

    const handleRideUpdate = (ride) => {
      if (ride.id !== selectedRide.id) return;

      setSelectedRide(ride);

      if (["accepted", "in_progress"].includes(ride.status)) {
        setDriverLocation({ lat: ride.driver_lat, lng: ride.driver_lng });
      }

      if (ride.status === "accepted") {
        setRideToConfirm(ride);
        setOpenConfirmDialog(true);
      }

      if (ride.status === "completed") {
        setSelectedRide(null);
        setDriverLocation(null);
      }

      setRecentRides(prev => {
        const exists = prev.find(r => r.id === ride.id);
        if (exists) return prev.map(r => r.id === ride.id ? ride : r);
        else return [ride, ...prev];
      });

      setSnackbar({ open: true, message: `Ride Update: ${ride.status}`, severity: 'info' });
    };

    const handleDriverLocation = ({ rideId, lat, lng }) => {
      if (rideId === selectedRide.id) setDriverLocation({ lat, lng });
    };

    socket.on("rideUpdated", handleRideUpdate);
    socket.on("driverLocationUpdated", handleDriverLocation);

    return () => {
      socket.emit("leaveRideRoom", selectedRide.id);
      socket.off("rideUpdated", handleRideUpdate);
      socket.off("driverLocationUpdated", handleDriverLocation);
    };
  }, [selectedRide]);

  const handleChange = (setter) => (e) => setter(e.target.value);
  const handleRideTypeChange = (_, newType) => {
    if (newType) {
      setRideType(newType);
      setRidePrice(ridePrices[newType]);
    }
  };

  const onBookClick = async () => {
    if (!passengerName || !passengerEmail || !passengerPhone || !pickup || !dropoff) {
      setSnackbar({ open: true, message: 'Please fill all fields', severity: 'error' });
      return;
    }
    if (!rideType || ridePrice === '') {
      setSnackbar({ open: true, message: 'Please select a ride type', severity: 'error' });
      return;
    }

    try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_name: passengerName,
          passenger_email: passengerEmail,
          passenger_phone: passengerPhone,
          pickup_location: pickup,
          dropoff_location: dropoff,
          ride_type: rideType,
          ride_price: ridePrice
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed');

      setSnackbar({ open: true, message: data.message, severity: 'success' });

      setPickup(''); setDropoff(''); setRideType(''); setRidePrice(''); setPassengerName(''); setPassengerPhone(''); setRideBooked(true);

      socket.emit("newRide", {
        id: data.rideId,
        passenger_name: passengerName,
        passenger_email: passengerEmail,
        passenger_phone: passengerPhone,
        pickup_location: pickup,
        dropoff_location: dropoff,
        ride_type: rideType,
        status: "pending"
      });

      setSelectedRide({ id: data.rideId, passenger_email: passengerEmail, status: "pending" });

    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const onSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleConfirmRide = () => {
    setOpenConfirmDialog(false);
    setSnackbar({ open: true, message: `Ride #${rideToConfirm.id} confirmed!`, severity: 'success' });
  };

  const handleCancelRide = async () => {
    try {
      await 
      
      (`http://localhost:3001/api/rides/${rideToConfirm.id}/cancel`, { method: 'POST' });
      setOpenConfirmDialog(false);
      setSnackbar({ open: true, message: `Ride #${rideToConfirm.id} cancelled`, severity: 'error' });
      setSelectedRide(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Cancel failed', severity: 'error' });
    }
  };

  // Drawer toggle
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  // ------------------ Render ------------------
  return (
    <>
      {/* Header */}
      <Box sx={{
        bgcolor: '#82b1ff',
        color: 'white',
        p: 2,
        textAlign: 'left',
        fontWeight: 'bold',
        fontSize: isDesktop ? '1.5rem' : '1.25rem',
        pl: isDesktop ? '50px' : '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isDesktop ? 'space-between' : 'flex-start'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/taxifav.png" alt="Taxi Icon" style={{ width: isDesktop ? 35 : 30, height: isDesktop ? 35 : 30, marginRight: 10 }} />
          <span style={{ fontWeight: 'bold', fontSize: isDesktop ? '1.75rem' : '1.5rem' }}>SWYFT - Passenger Dashboard</span>
        </Box>

        {/* Desktop Buttons */}
        {isDesktop && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" color="secondary" onClick={() => navigate('/')} sx={{ borderRadius: '15px', backgroundColor: '#ffffff', fontWeight: 'bold', padding: '10px 24px', color: '#000', '&:hover': { backgroundColor: '#f0f0f0' } }}>Home</Button>
            <Button variant="outlined" color="inherit" onClick={() => navigate('/signin')} sx={{ borderRadius: '15px', borderColor: '#fff', color: '#fff', fontWeight: 'bold', '&:hover': { borderColor: '#f0f0f0', color: '#f0f0f0' } }}>Sign Out</Button>
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
              <ListItemButton onClick={() => navigate('/')}>
                <ListItemIcon><HomeIcon /></ListItemIcon>
                <ListItemText primary="Home" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => alert('Sign Out')}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Passenger Info */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, pl: isDesktop ? 5 : 3 }}>
        Welcome, {passengerName} ({passengerEmail}) : {passengerPhone}
      </Typography>

      {/* Main content */}
      <Box sx={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'center', mt: 2, px: isDesktop ? 7 : 2, gap: 3, alignItems: isDesktop ? 'flex-start' : 'center' }}>
        <Container maxWidth="xs" sx={{ p: 4, border: '1px solid #ccc', borderRadius: 3, width: '100%', maxWidth: 360 }}>
          <Typography variant={isDesktop ? "h5" : "h6"} align={isDesktop ? "left" : "center"} gutterBottom sx={{ fontWeight: 'bold' }}>Book a Ride</Typography>
          <TextField fullWidth label="Passenger Name" margin="normal" value={passengerName} onChange={handleChange(setPassengerName)} />
          <TextField fullWidth label="Passenger Email" margin="normal" value={passengerEmail} disabled />
          <TextField fullWidth label="Passenger Phone" margin="normal" value={passengerPhone} onChange={handleChange(setPassengerPhone)} />
          <LocationInput label="Pickup Location" value={pickup} onSelect={setPickup} />
          <LocationInput label="Drop-off Location" value={dropoff} onSelect={setDropoff} />

          <Box sx={{ my: isDesktop ? 3 : 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup value={rideType} exclusive onChange={handleRideTypeChange}>
              <ToggleButton value="economy">Economy — 150 TL</ToggleButton>
              <ToggleButton value="premium">Premium — 200 TL</ToggleButton>
              <ToggleButton value="luxury">Luxury — 300 TL</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Button variant="contained" fullWidth size="large" onClick={onBookClick} sx={{ bgcolor: '#82b1ff', '&:hover': { bgcolor: '#5a8de0' } }}>Book Ride</Button>

          <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={onSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert onClose={onSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
          </Snackbar>
        </Container>

        <PassengerMap
          passengerEmail={passengerEmail}
          pickupLocation={pickup ? { address: pickup } : null}
          dropoffLocation={dropoff ? { address: dropoff } : null}
          ride={selectedRide}
          rideId={selectedRide?.id || null}
          driverLocation={driverLocation}
        />

        <RecentRides userEmail={passengerEmail} />
      </Box>

      {/* Ride Confirmation Dialog */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>Ride Accepted!</DialogTitle>
        <DialogContent>
          <Typography>Driver: {rideToConfirm?.driver_name}</Typography>
          <Typography>Vehicle: {rideToConfirm?.driver_vehicle}</Typography>
          <Typography>Phone: {rideToConfirm?.driver_phone}</Typography>
          <Typography>Pickup: {rideToConfirm?.pickup_location}</Typography>
          <Typography>Dropoff: {rideToConfirm?.dropoff_location}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRide}>Cancel</Button>
          <Button onClick={handleConfirmRide} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}