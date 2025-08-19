import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ActiveRides from './activerides';
import axios from 'axios';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [driverInfo, setDriverInfo] = useState({ name: '', email: '', phone: '', vehicle: '' });

  // Load driver info from sessionStorage
  useEffect(() => {
    const savedDriver = sessionStorage.getItem('driverInfo');
    if (savedDriver) {
      const driver = JSON.parse(savedDriver);
      driver.name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
      setDriverInfo(driver);
    }
  }, []);

  // Fetch driver details from backend
  useEffect(() => {
    const email = JSON.parse(sessionStorage.getItem('driverInfo'))?.email;
    if (!email) return;

    axios.get('http://localhost:3001/api/drivers')
      .then(res => {
        const driver = res.data.find(d => d.email === email);
        if (driver) {
          setDriverInfo({
            name: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            phone: driver.phone,
            vehicle: driver.vehicle || '',
          });
        }
      })
      .catch(err => console.error('Error fetching drivers:', err));
  }, []);

  // Fetch available rides
  useEffect(() => {
    const fetchRides = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const res = await fetch('http://localhost:3001/api/rides', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setPendingRides(data);
        else console.error('Failed to fetch rides:', data.error);
      } catch (err) {
        console.error('Error fetching rides:', err);
      }
    };
    fetchRides();
  }, []);

  // Fetch active rides for this driver
  useEffect(() => {
    const fetchActiveRides = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const driverEmail = driverInfo.email;
        if (!driverEmail) return;

        const res = await fetch(`http://localhost:3001/api/active-rides?driver_email=${driverEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setActiveRides(data);
        else console.error('Failed to fetch active rides:', data.error);
      } catch (err) {
        console.error('Error fetching active rides:', err);
      }
    };
    fetchActiveRides();
  }, [driverInfo.email]);

  // Socket.IO integration
  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('new-ride', ride => {
      setPendingRides(prev => [ride, ...prev]);
    });

    socket.on('ride-updated', updatedRide => {
      setPendingRides(prev => prev.filter(r => r.id !== updatedRide.id));
      if (updatedRide.driver_email === driverInfo.email) {
        setActiveRides(prev => [...prev, updatedRide]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [driverInfo.email]);

  const handleOpenDialog = ride => { setSelectedRide(ride); setOpenDialog(true); };
  const handleCloseDialog = () => { setOpenDialog(false); setSelectedRide(null); };

  const handleConfirmAccept = async () => {
    if (!selectedRide) return;
    try {
      const token = sessionStorage.getItem('authToken');

      const response = await fetch(`http://localhost:3001/api/rides/${selectedRide.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(driverInfo),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error.includes('already accepted')) {
          alert('This ride has already been accepted by another driver.');
          setPendingRides(prev => prev.filter(r => r.id !== selectedRide.id));
          handleCloseDialog();
          return;
        }
        throw new Error(data.error || 'Failed to accept ride');
      }

      // Success: update active rides
      setPendingRides(prev => prev.filter(r => r.id !== selectedRide.id));
      setActiveRides(prev => [
        ...prev,
        {
          ...selectedRide,
          driver_name: driverInfo.name,
          driver_phone: driverInfo.phone,
          driver_vehicle: driverInfo.vehicle,
          driver_email: driverInfo.email,
        }
      ]);

      handleCloseDialog();

    } catch (error) {
      console.error("Accept ride failed:", error.message);
      alert(`Accept ride failed: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 0, bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#82b1ff', color: 'white', p: 2, display: 'flex', alignItems: 'center', justifyContent: isDesktop ? 'space-between' : 'flex-start', pl: isDesktop ? '50px' : '20px', fontWeight: 'bold', fontSize: isDesktop ? '1.5rem' : '1.25rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/taxifav.png" alt="Taxi Icon" style={{ width: isDesktop ? 35 : 30, height: isDesktop ? 35 : 30, marginRight: 10 }} />
          <span style={{ fontWeight: 'bold', fontSize: isDesktop ? '1.75rem' : '1.5rem' }}>SWYFT - Driver Dashboard</span>
        </Box>
        {isDesktop && (
          <Box sx={{ display: 'flex', gap: 2, mr: 10 }}>
            <Button variant="contained" sx={{ borderRadius: '15px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', padding: '10px 24px', '&:hover': { backgroundColor: '#f0f0f0' } }} onClick={() => navigate('/')}>Home</Button>
            <Button variant="outlined" sx={{ borderRadius: '15px', borderColor: '#fff', color: '#fff', fontWeight: 'bold', '&:hover': { borderColor: '#f0f0f0', color: '#f0f0f0' } }} onClick={() => alert('Sign Out')}>Sign Out</Button>
          </Box>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 2, pl: isDesktop ? 5 : 3 }}>
        Welcome, {driverInfo.name} ({driverInfo.email}) | Driver Phone: {driverInfo.phone || 'No phone number found'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: 3, alignItems: isDesktop ? 'flex-start' : 'center', mt: 2, pl: isDesktop ? 5 : 2, pr: isDesktop ? 5 : 2 }}>
        {/* Pending Rides */}
        <Box sx={{ width: isDesktop ? 500 : '100%' }}>
          <Box sx={{ width: '92%', bgcolor: '#82b1ff', color: 'white', p: 2, fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'left', borderTopLeftRadius: 12, borderTopRightRadius: 12, mb: 1 }}>Available Rides</Box>
          <Box sx={{ border: '1px solid #ccc', borderRadius: 3, p: 2, bgcolor: '#f5f5f5', maxHeight: 500, overflowY: 'auto' }}>
            {pendingRides.length === 0 ? <Typography sx={{ mt: 2 }}>No pending rides</Typography> :
              pendingRides.map(ride => (
                <Box key={ride.id} sx={{ border: '1px solid #ccc', borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography># {ride.id} - {ride.passenger_name} ({ride.ride_type})</Typography>
                  <Typography>Pickup: {ride.pickup_location}</Typography>
                  <Typography>Dropoff: {ride.dropoff_location}</Typography>
                  <Typography>Fare: ${ride.price?.toFixed(2) || '0.00'}</Typography>
                  <Button variant="contained" sx={{ mt: 1 }} onClick={() => handleOpenDialog(ride)}>Accept Ride</Button>
                </Box>
              ))
            }
          </Box>
        </Box>

        {/* Active Rides */}
        <ActiveRides 
          rides={activeRides.filter(
            ride => ride.driver_email && ride.driver_email === driverInfo.email
          )} 
        />
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Accept Ride</DialogTitle>
        <DialogContent>
          Are you sure you want to accept ride #{selectedRide?.id}?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmAccept} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
