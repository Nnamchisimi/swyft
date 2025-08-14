import React, { useState, useEffect } from 'react';
import RideBookingViewDesktop from './passengerdashboard';
import RideBookingViewMobile from './RideBookingViewMobile';

export default function RideBookingView(props) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <RideBookingViewMobile {...props} /> : <RideBookingViewDesktop {...props} />;
}
