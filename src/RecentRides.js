import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

export default function RecentRides() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/rides')  // Your backend API route for getting rides
      .then((res) => res.json())
      .then((data) => setRides(data))
      .catch((err) => console.error('Failed to fetch rides:', err));
  }, []);

  return (
    <Box
      sx={{
        width: 1000,              // widened container
        border: '1px solid #ccc',
        borderRadius: 3,
        p: 2,
        ml: 4,
        mt: 2,
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
