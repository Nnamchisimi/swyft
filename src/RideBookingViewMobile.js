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

export default function RideBookingViewMobile({
  passengerName,
  onPassengerNameChange,
  pickup,
  onPickupChange,
  dropoff,
  onDropoffChange,
  rideType,
  onRideTypeChange,
  onBookClick,
  snackbar,
  onSnackbarClose,
}) {
  return (
    <>
      <Box
      sx={{
          bgcolor: '#82b1ff',  // primary main color
          color: 'white',
          p: 2,
          textAlign: 'left',
          fontWeight: 'bold',
          fontSize: '1.5rem',
            pl: '50px',    
        }}
      >
        <img src="/taxifav.png" alt="Taxi Icon" style={{ width: 30, height: 30, marginRight: 10 }} />
        <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>SWYFT</span>
      </Box>

        <Container maxWidth="xs" sx={{ mt: 2, p: 4, border: '1px solid #ccc', borderRadius: 3, boxShadow: 0 }}>
        <Typography variant="h6" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
          Book a Ride
        </Typography>

        <TextField
          fullWidth
          label="Passenger Name"
          variant="outlined"
          margin="normal"
          value={passengerName}
          onChange={onPassengerNameChange}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
        />

        <TextField
          fullWidth
          label="Pickup Location"
          variant="outlined"
          margin="normal"
          value={pickup}
          onChange={onPickupChange}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
        />

        <TextField
          fullWidth
          label="Drop-off Location"
          variant="outlined"
          margin="normal"
          value={dropoff}
          onChange={onDropoffChange}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
        />

        <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
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
    </>
  );
}

