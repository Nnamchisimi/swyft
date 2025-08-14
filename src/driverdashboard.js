import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ActiveRides from './activerides';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [pendingRides, setPendingRides] = useState([]);
  const [refreshActive, setRefreshActive] = useState(0);
  const [selectedRide, setSelectedRide] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const [driverInfo] = useState({
    name: 'ko',
    phone: 'aa',
    vehicle: 'aa',
  });

  // Fetch pending rides
  useEffect(() => {
    fetch('http://localhost:3001/api/rides')
      .then((res) => res.json())
      .then((data) =>
        setPendingRides(data.filter((ride) => !ride.driver_assigned))
      )
      .catch((err) => console.error('Failed to fetch rides:', err));
  }, []);

  const handleOpenDialog = (ride) => {
    setSelectedRide(ride);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRide(null);
  };

  const handleConfirmAccept = async () => {
    if (!selectedRide) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/rides/${selectedRide.id}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(driverInfo),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to accept ride');

      // Remove from pending rides
      setPendingRides((prev) =>
        prev.filter((r) => r.id !== selectedRide.id)
      );

      // Trigger refresh for active rides
      setRefreshActive((prev) => prev + 1);

      handleCloseDialog();
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <Box sx={{ p: 0, bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: '#82b1ff',
          color: 'white',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isDesktop ? 'space-between' : 'flex-start',
          pl: isDesktop ? '50px' : '20px',
          fontWeight: 'bold',
          fontSize: isDesktop ? '1.5rem' : '1.25rem',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/taxifav.png"
            alt="Taxi Icon"
            style={{
              width: isDesktop ? 35 : 30,
              height: isDesktop ? 35 : 30,
              marginRight: 10,
            }}
          />
          <span
            style={{
              fontWeight: 'bold',
              fontSize: isDesktop ? '1.75rem' : '1.5rem',
            }}
          >
            SWYFT - Driver Dashboard
          </span>
        </Box>

        {isDesktop && (
          <Box sx={{ display: 'flex', gap: 2, mr: 10 }}>
            <Button
              variant="contained"
              sx={{
                borderRadius: '15px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontWeight: 'bold',
                padding: '10px 24px',
                '&:hover': { backgroundColor: '#f0f0f0' },
              }}
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderRadius: '15px',
                borderColor: '#ffffff',
                color: '#ffffff',
                fontWeight: 'bold',
                '&:hover': { borderColor: '#f0f0f0', color: '#f0f0f0' },
              }}
              onClick={() => alert('Sign Out')}
            >
              Sign Out
            </Button>
          </Box>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 2, pl: isDesktop ? 5 : 3 }}>
        Welcome, {driverInfo.name}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 3,
          alignItems: isDesktop ? 'flex-start' : 'center',
          mt: 2,
          pl: isDesktop ? 5 : 2,
          pr: isDesktop ? 5 : 2,
        }}
      >
        {/* Pending Rides Section */}
        <Box sx={{ width: isDesktop ? 500 : '100%' }}>
          <Box
            sx={{
              width: '92%',
              bgcolor: '#82b1ff',
              color: 'white',
              p: 2,
              fontWeight: 'bold',
              fontSize: '1.25rem',
              textAlign: 'left',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              mb: 1,
            }}
          >
            Available Rides
          </Box>

          <Box
            sx={{
              border: '1px solid #ccc',
              borderRadius: 3,
              p: 2,
              bgcolor: '#f5f5f5',
              maxHeight: 500,
              overflowY: 'auto',
            }}
          >
            {pendingRides.length === 0 ? (
              <Typography sx={{ mt: 2 }}>No pending rides</Typography>
            ) : (
              pendingRides.map((ride) => (
                <Box
                  key={ride.id}
                  sx={{
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    #{ride.id} - {ride.ride_type}
                  </Typography>
                  <Typography>From: {ride.pickup_location}</Typography>
                  <Typography>To: {ride.dropoff_location}</Typography>
                  <Typography>
                    {ride.passenger_name} - {ride.passenger_phone}
                  </Typography>
                  <Typography>
                    {new Date(ride.created_at).toLocaleString()}
                  </Typography>
                  <Typography>${ride.price?.toFixed(2) || '0.00'}</Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 1 }}
                    onClick={() => handleOpenDialog(ride)}
                  >
                    Accept Ride
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Active Rides Section */}
        <ActiveRides driver={driverInfo.name} refreshTrigger={refreshActive} />
      </Box>

      {/* Confirm Accept Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Accept Ride</DialogTitle>
        <DialogContent>
          {selectedRide && (
            <Box>
              <Typography>
                From: {selectedRide.pickup_location}
              </Typography>
              <Typography>
                To: {selectedRide.dropoff_location}
              </Typography>
              <Typography>
                Passenger: {selectedRide.passenger_name} - {selectedRide.passenger_phone}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmAccept} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
