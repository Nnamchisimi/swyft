import React from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";

export default function CanceledRides({ rides }) {
      const theme = useTheme();
      const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  return (
      <Box sx={{
           width: isDesktop ? "70%" : "100%",   // take 70% of screen width on desktop
         maxWidth: isDesktop ? "600px" : "450px", // cap it at 1000px on desktop, 500px on mobile
        minWidth: isDesktop ? "600px" : "450px", // cap it at 1000px on desktop, 500px on mobile
        maxHeight: 500,
         minHeight: 400,    // ✅ Always at least 400px tall
        border: "1px solid #ccc",
        borderRadius: 3,
        p: 0,
        mt: 2,
        ml: isDesktop ? 4 : 0,
       
        overflowY: "auto",
        bgcolor: "#f5f5f5",
      }}>
        <Box sx={{
          width: "100%",
          bgcolor: "#ff8a80",
          color: "white",
          p: 2,
          fontWeight: "bold",
          fontSize: isDesktop ? "1.25rem" : "1rem",
          textAlign: "left",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          position: "sticky",
          top: 0,
          zIndex: 1
        }}>
          Canceled Rides
        </Box>

      <Box
        sx={{
          border: "1px solid #ccc",
          borderRadius: 2,
          p: 2,
          mt: 1,
          maxHeight: 300,
          overflowY: "auto",
          bgcolor: "#f5f5f5",
        }}
      >
        {rides.length === 0 ? (
          <Typography>No canceled rides</Typography>
        ) : (
          rides.map((ride) => (
            <Box
              key={ride.id || ride._id}
              sx={{ border: "1px solid #ccc", borderRadius: 2, p: 2, mb: 2 }}
            >
              <Typography>
                #{ride.id || ride._id} - {ride.passenger_name} ({ride.ride_type})
              </Typography>
              <Typography>Pickup: {ride.pickup_location}</Typography>
              <Typography>Dropoff: {ride.dropoff_location}</Typography>
              <Typography>Fare: ${ride.price?.toFixed(2) || "0.00"}</Typography>
              {ride.canceled_at && (
                <Typography variant="caption" color="text.secondary">
                  Canceled at: {new Date(ride.canceled_at).toLocaleString()}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
