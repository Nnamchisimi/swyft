import React from 'react';
import { Container, Typography, Box, Button, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Homepage() {
  const navigate = useNavigate();

  const handleStartRiding = () => {
    navigate('/ride-booking');
  };

  return (
    <>
      {/* Full width header outside Container */}
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
          justifyContent: 'space-between',
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
          sx={{ mr: 2 }}
        >
          Home
        </Button>
      </Box>

      {/* Main header */}
      <Container maxWidth="md" sx={{ mt: 6, mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Your Ride, Your Way
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Connect with drivers in your area or offer rides to passengers. Join our community of reliable transportation.
        </Typography>
      </Container>

      {/* Side-by-side Containers */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4, // space between containers
          px: 2,
          flexWrap: 'wrap',
        }}
      >
        {/* Passenger Container */}
        <Container
          maxWidth="sm"
          sx={{
            border: 'none',
            borderRadius: 2,
            p: 5,
            boxShadow: 'none',
            bgcolor: 'transparent',
            flex: '1 1 400px', // flexible width but minimum 400px
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            For Passengers
          </Typography>
          <Typography variant="body1" gutterBottom>
            Book reliable rides with trusted drivers in your area. Safe, convenient, and affordable transportation.
          </Typography>
          <List>
            <ListItem><ListItemText primary="Book rides instantly" /></ListItem>
            <ListItem><ListItemText primary="Track your driver in real-time" /></ListItem>
            <ListItem><ListItemText primary="Safe and secure payments" /></ListItem>
            <ListItem><ListItemText primary="Rate your experience" /></ListItem>
          </List>
          <Button variant="contained" size="large" sx={{ mt: 2 }} onClick={handleStartRiding}>
            Start Riding
          </Button>
        </Container>

        {/* Driver Container */}
        <Container
          maxWidth="sm"
          sx={{
            border: 'none',
            borderRadius: 2,
            p: 3,
            boxShadow: 'none',
            bgcolor: 'transparent',
            flex: '1 1 400px',
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            For Drivers
          </Typography>
          <Typography variant="body1" gutterBottom>
            Turn your car into an income opportunity. Drive when you want, earn money on your schedule.
          </Typography>
          <List>
            <ListItem><ListItemText primary="Flexible working hours" /></ListItem>
            <ListItem><ListItemText primary="Competitive earnings" /></ListItem>
            <ListItem><ListItemText primary="Weekly payments" /></ListItem>
            <ListItem><ListItemText primary="Build your reputation" /></ListItem>
          </List>
          <Button variant="contained" size="large" sx={{ mt: 2 }}>
            Start Driving
          </Button>
        </Container>
      </Box>
    </>
  );
}
