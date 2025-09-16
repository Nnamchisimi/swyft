import React from "react";
import { Box, Typography, List, ListItem, ListItemText, Divider, Button, useTheme, useMediaQuery } from "@mui/material";

export default function ActiveRides({ rides, onCancelRide, onCompleteRide }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Box sx={{ width: isDesktop ? 500 : "100%" }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: "#82b1ff",
          color: "white",
          p: 2,
          fontWeight: "bold",
          fontSize: isDesktop ? "1.25rem" : "1rem",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        Active Rides
      </Box>

      {/* Content */}
      <Box
        sx={{
          border: "1px solid #ccc",
          borderRadius: 3,
          p: 2,
          bgcolor: "#f5f5f5",
          maxHeight: 500,
          minHeight: 400,
          overflowY: "auto",
        }}
      >
        {rides.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active rides.
          </Typography>
        ) : (
          rides.map((ride) => (
            <Box
              key={ride.id || ride._id}
              sx={{
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 2,
                mb: 2,
              }}
            >
              <Typography fontWeight="bold">
                #{ride.id || ride._id} - {ride.passenger_name} ({ride.ride_type})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                From: {ride.pickup_location}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                To: {ride.dropoff_location}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Passenger: {ride.passenger_name} - {ride.passenger_phone}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Driver: {ride.driver_name || "—"} | {ride.driver_phone || "—"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vehicle: {ride.driver_vehicle || "—"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Requested: {new Date(ride.created_at).toLocaleString()}
              </Typography>
             <Typography variant="body2" color="textSecondary">
                  Fare: ₺{ride.ride_price?.toFixed(2) || "0.00"}
             </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => onCancelRide(ride)}
                >
                  Cancel Ride
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => onCompleteRide(ride)}
                >
                  Complete Ride
                </Button>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
