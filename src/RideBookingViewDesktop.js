import React from 'react';
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
import RecentRides from './RecentRides'; // Import the component you just made

export default function RideBookingViewDesktop(props) {
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
        }}
      >
        <img src="/taxifav.png" alt="Taxi Icon" style={{ width: 35, height: 35, marginLeft: 20 }} />
        <span style={{ fontWeight: 'bold', fontSize: '1.75rem', marginLeft: '10px' }}>SWYFT</span>
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
          {/* Your existing booking form code here, unchanged */}
          {/* ... */}
          <Typography variant="h5" component="h1" align="left" gutterBottom sx={{ fontWeight: 'bold' }}>
            Book a Ride
          </Typography>

          <TextField
            fullWidth
            label="Passenger Name"
            variant="outlined"
            margin="normal"
            value={props.passengerName}
            onChange={props.onPassengerNameChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            label="Pickup Location"
            variant="outlined"
            margin="normal"
            value={props.pickup}
            onChange={props.onPickupChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            label="Drop-off Location"
            variant="outlined"
            margin="normal"
            value={props.dropoff}
            onChange={props.onDropoffChange}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={props.rideType}
              exclusive
              onChange={props.onRideTypeChange}
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
            onClick={props.onBookClick}
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
            open={props.snackbar.open}
            autoHideDuration={4000}
            onClose={props.onSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={props.onSnackbarClose} severity={props.snackbar.severity} sx={{ width: '100%' }}>
              {props.snackbar.message}
            </Alert>
          </Snackbar>
        </Container>

        {/* Recent rides side-by-side */}
        <RecentRides />
      </Box>
    </>
  );
}
