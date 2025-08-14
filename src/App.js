import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './Homepage';
import RideBookingViewDesktop from './RideBookingViewDesktop';
import RideBookingViewMobile from './RideBookingViewMobile';
import SignIn from './signin'; // your lowercase file
import useMediaQuery from '@mui/material/useMediaQuery';
import GetStarted from './getstarted';

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
        <Route path="/signin" element={<SignIn />} /> {/* Add this line */}
          <Route path="/getstarted" element={<GetStarted />} /> {/* Add this line */}
      </Routes>
      
    </Router>
  );
}

export default App;
