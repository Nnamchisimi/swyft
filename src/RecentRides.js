import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, useTheme, useMediaQuery } from '@mui/material';

export default function RecentRides() {
  const [rides, setRides] = useState([]);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // detects desktop size

  useEffect(() => {
    fetch('http://localhost:3001/api/rides')  // Your backend API route for getting rides
      .then((res) => res.json())
      .then((data) => setRides(data))
      .catch((err) => console.error('Failed to fetch rides:', err));
  }, []);

  return (
    <Box
      sx={{
        width: isDesktop ? 600 : '100%',    // wider on desktop, full width on mobile
        maxWidth: isDesktop ? 'none' : 360, // max width on mobile to match form width
        border: '1px solid #ccc',
        borderRadius: 3,
        p: 2,
        mt: isDesktop ? 2 : 0,
        ml: isDesktop ? 4 : 0,
        maxHeight: 500,
        overflowY: 'auto',
        bgcolor: '#f5f5f5',
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        Recent Rides
      </Typography>
      <List>
        {rides.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No rides found.
          </Typography>
        ) : (
          rides.map((ride) => (
            <React.Fragment key={ride.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={`${ride.passenger_name} (${ride.ride_type})`}
                  secondary={`${ride.pickup_location} → ${ride.dropoff_location}`}
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
