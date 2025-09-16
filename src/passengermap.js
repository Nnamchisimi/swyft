import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import { Box, Paper, Typography } from "@mui/material";
import { io } from "socket.io-client";

const containerStyle = { width: "100%", height: "100%" };
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const socket = io(SOCKET_URL);

export default function PassengerMap({ passengerEmail, pickupLocation, dropoffLocation, rideBooked, rideId }) {
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [pickup, setPickup] = useState(pickupLocation || null);
  const [dropoff, setDropoff] = useState(dropoffLocation || null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY || "YOUR_GOOGLE_MAPS_API_KEY",
    libraries: ["places"],
  });

  // Get passenger's current location
  useEffect(() => {
    if (!navigator.geolocation) return console.error("Geolocation not supported");

    navigator.geolocation.getCurrentPosition(
      (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  // Listen for driver location updates
  useEffect(() => {
    if (!rideId) return;

    socket.emit("joinRideRoom", rideId);

    const handleDriverLocation = ({ rideId: updatedRideId, lat, lng }) => {
      if (updatedRideId === rideId) setDriverLocation({ lat, lng });
    };

    socket.on("driverLocationUpdated", handleDriverLocation);

    return () => {
      socket.emit("leaveRideRoom", rideId);
      socket.off("driverLocationUpdated", handleDriverLocation);
    };
  }, [rideId]);

  // Geocode pickup & dropoff addresses
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();

    const geocodeAddress = (address, setter) => {
      if (!address) return;
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          setter({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
        } else console.error("Geocode failed:", status);
      });
    };

    geocodeAddress(pickupLocation?.address, setPickup);
    geocodeAddress(dropoffLocation?.address, setDropoff);
  }, [pickupLocation?.address, dropoffLocation?.address, isLoaded]);

  // Fetch directions
  useEffect(() => {
    if (!isLoaded || !pickup || !dropoff || !passengerLocation) return;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: pickup,
        destination: dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result.routes[0]) {
          setDirections(result);
          setDistance(result.routes[0].legs[0].distance.text);
          setDuration(result.routes[0].legs[0].duration.text);

          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].overview_path.forEach((p) => bounds.extend(p));
            mapRef.current.fitBounds(bounds);
          }
        }
      }
    );
  }, [pickup, dropoff, isLoaded, passengerLocation]);

  // Reset map when ride is booked
  useEffect(() => {
    if (!rideBooked) return;

    setPickup(null);
    setDropoff(null);
    setDriverLocation(null);
    setDirections(null);
    setDistance(null);
    setDuration(null);
    setPassengerLocation(null);
  }, [rideBooked]);

  if (!isLoaded || !passengerLocation) {
    return <Typography>Loading map and fetching your location…</Typography>;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: 2,
        p: 1,
        borderRadius: 2,
        overflow: "hidden",
        height: 400,
        width: { xs: "100%", sm: "80%", md: "40%", mx: "auto" },
      }}
    >
      <Box sx={{ height: "90%", width: "100%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={pickup || dropoff || driverLocation || passengerLocation}
          zoom={13}
          onLoad={(map) => (mapRef.current = map)}
        >
          {pickup && <Marker position={pickup} label="Pickup" />}
          {dropoff && <Marker position={dropoff} label="Drop-off" />}
          {driverLocation && <Marker position={driverLocation} label="Driver" />}
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
        </GoogleMap>
      </Box>
      {(distance || duration) && (
        <Box sx={{ mt: 1, textAlign: "center" }}>
          {distance && <Typography variant="body1">Distance: {distance}</Typography>}
          {duration && <Typography variant="body1">Duration: {duration}</Typography>}
        </Box>
      )}
    </Paper>
  );
}
