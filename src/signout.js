import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

export default function SignOut() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all authentication and user info
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('driverInfo');
    // Optional: sessionStorage.clear(); // if you want to remove everything

    // Redirect to Sign In page after clearing storage
    const timer = setTimeout(() => {
      navigate('/signin');
    }, 1000); // optional delay to show "Signing out..." message

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Signing out...
      </Typography>
      <CircularProgress />
    </Box>
  );
}
