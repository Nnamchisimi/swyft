import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './Homepage';
import RideBookingViewDesktop from './RideBookingViewDesktop';
import RideBookingViewMobile from './RideBookingViewMobile';
import useMediaQuery from '@mui/material/useMediaQuery';

function App() {
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route
          path="/ride-booking"
          element={isMobile ? <RideBookingViewMobile /> : <RideBookingViewDesktop />}
        />
      </Routes>
    </Router>
  );
}

export default App;
