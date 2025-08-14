import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';

export default function ActiveRides({ driver, refreshTrigger }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [activeRides, setActiveRides] = useState([]);

  // Fetch active rides from backend
  const fetchActiveRides = () => {
    if (!driver) return;

    fetch(`http://localhost:3001/api/active-rides/${encodeURIComponent(driver)}`)
      .then((res) => res.json())
      .then((data) => {
        setActiveRides(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to fetch active rides:', err));
  };

  // Fetch rides on mount, when driver changes, or refreshTrigger changes
  useEffect(() => {
    fetchActiveRides();

    // Optional: auto-refresh every 15 seconds
    const interval = setInterval(fetchActiveRides, 15000);
    return () => clearInterval(interval);
  }, [driver, refreshTrigger]);

  return (
    <Box
      sx={{
        width: isDesktop ? 1000 : '100%',
        maxWidth: isDesktop ? 'none' : 500,
        border: '1px solid #ccc',
        borderRadius: 3,
        p: 0,
        mt: isDesktop ? 2 : 0,
        ml: isDesktop ? 4 : 0,
        maxHeight: 500,
        overflowY: 'auto',
        bgcolor: '#f5f5f5',
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          width: '100%',
          bgcolor: '#82b1ff',
          color: 'white',
          p: 2,
          fontWeight: 'bold',
          fontSize: isDesktop ? '1.25rem' : '1rem',
          textAlign: 'left',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        Active Rides
      </Box>

      {/* List of active rides */}
      <List sx={{ p: 2 }}>
        {activeRides.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active rides.
          </Typography>
        ) : (
          activeRides.map((ride) => (
            <React.Fragment key={ride.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={`#${ride.id} - ${ride.passenger_name} (${ride.ride_type})`}
                  secondary={
                    <>
                      <Typography>From: {ride.pickup_location}</Typography>
                      <Typography>To: {ride.dropoff_location}</Typography>
                        <Typography>Phone: {ride.passenger_phone}</Typography>
                        <Typography>Driver Name: {ride.driver_name}</Typography>
                          <Typography>Driver Phone: {ride.driver_phone}</Typography>
                          <Typography>Driver vehicle: {ride.driver_vehicle}</Typography>
                      <Typography>
                        Requested: {new Date(ride.created_at).toLocaleString()}
                      </Typography>
                      <Typography>Fare: ${ride.price?.toFixed(2) || '0.00'}</Typography>

                      
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))
        )}
      </List>
    </Box>
  );
}
