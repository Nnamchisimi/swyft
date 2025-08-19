import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, useTheme, useMediaQuery } from '@mui/material';

export default function ActiveRides({ rides }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

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

      <List sx={{ p: 2 }}>
        {rides.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active rides.
          </Typography>
        ) : (
          rides.map((ride) => (
            <React.Fragment key={ride.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={`#${ride.id} - ${ride.passenger_name} (${ride.ride_type})`}
                  secondary={
                   <>
                        <Typography>From: {ride.pickup_location}</Typography>
                        <Typography>To: {ride.dropoff_location}</Typography>
                        <Typography>
                          Passenger: {ride.passenger_name} - {ride.passenger_phone}
                        </Typography>

                        <Typography>
                          Driver: {ride.driver_name || '—'} 
                        </Typography>
                        <Typography>
                          Driver Phone: {ride.driver_phone || '—'}
                        </Typography>
                        <Typography>
                          Vehicle: {ride.driver_vehicle || '—'}
                        </Typography>

                        <Typography>
                          Requested: {new Date(ride.created_at).toLocaleString()}
                        </Typography>
                        <Typography>
                          Fare: ${ride.price ? ride.price.toFixed(2) : '0.00'}
                        </Typography>
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