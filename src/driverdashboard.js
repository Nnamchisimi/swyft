import React, { useEffect, useState } from "react";
import socket from "./socket";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import ActiveRides from "./activerides";
import CompletedRides from "./completedrides";
import CanceledRides from "./canceledrides";
import DriverMap from "./driverMap";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [canceledRides, setCanceledRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [driverInfo, setDriverInfo] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle: "",
  });
  const [currentRide, setCurrentRide] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenDialog = (ride) => {
    setSelectedRide(ride);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRide(null);
  };
  const toggleDrawer = (open) => () => setDrawerOpen(open);

useEffect(() => {
  const savedDriver = sessionStorage.getItem("driverInfo");
  if (savedDriver) {
    const driver = JSON.parse(savedDriver);

    // Use consistent field names from backend
    driver.name = `${driver.firstName || ""} ${driver.lastName || ""}`.trim();

    setDriverInfo(driver);
  }
}, []);



  useEffect(() => {
    if (!driverInfo.email) return;

    const fetchRides = async () => {
      try {
        const token = sessionStorage.getItem("authToken");
        const baseUrl = process.env.REACT_APP_BACKEND_URL;

        const pendingRes = await fetch(`${baseUrl}/api/rides`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pendingData = await pendingRes.json();
        setPendingRides(pendingData.filter((r) => !r.driver_assigned));

        const activeRes = await fetch(
          `${baseUrl}/api/active-rides?driver_email=${driverInfo.email}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const activeData = (await activeRes.json()).filter((r) => r.status !== "completed");
        setActiveRides(activeData);
        setCurrentRide(activeData[0] || null);

        const completedRes = await fetch(
          `${baseUrl}/api/rides?driver_email=${driverInfo.email}&status=completed`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const completedData = await completedRes.json();
        setCompletedRides(completedData);

        const canceledRes = await fetch(
          `${baseUrl}/api/rides?driver_email=${driverInfo.email}&status=cancelled`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const canceledData = await canceledRes.json();
        setCanceledRides(canceledData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRides();
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, [driverInfo.email]);

  useEffect(() => {
    socket.on("newRide", (ride) => {
      if (!ride.driver_assigned) setPendingRides((prev) => [ride, ...prev]);
    });
    return () => socket.off("newRide");
  }, []);

  useEffect(() => {
    if (!driverInfo.email) return;
    socket.emit("joinRoom", driverInfo.email);

    const handleRideUpdated = (ride) => {
      if (ride.driver_email !== driverInfo.email) return;

      setActiveRides((prev) => {
        let updatedRides;
        const exists = prev.find((r) => (r.id || r._id) === (ride.id || ride._id));

        if (ride.status === "completed" || ride.status === "canceled") {
          updatedRides = prev.filter((r) => (r.id || r._id) !== (ride.id || ride._id));
        } else if (exists) {
          updatedRides = prev.map((r) => ((r.id || r._id) === (ride.id || ride._id) ? ride : r));
        } else {
          updatedRides = [...prev, ride];
        }

        setCurrentRide(updatedRides[0] || null);
        return updatedRides;
      });

      if (ride.status === "accepted") {
        setPendingRides((prev) => prev.filter((r) => (r.id || r._id) !== (ride.id || ride._id)));
      }
      if (ride.status === "completed") {
        setCompletedRides((prev) => [ride, ...prev.filter((r) => (r.id || r._id) !== (ride.id || ride._id))]);
      }
      if (ride.status === "canceled") {
        setCanceledRides((prev) => [ride, ...prev.filter((r) => (r.id || r._id) !== (ride.id || ride._id))]);
      }
    };

    socket.on("rideUpdated", handleRideUpdated);
    return () => {
      socket.off("rideUpdated", handleRideUpdated);
      socket.emit("leaveRoom", driverInfo.email);
    };
  }, [driverInfo.email]);

  const handleConfirmAccept = async () => {
    if (!selectedRide) return;
    if (activeRides.length > 0) {
      alert("Complete your current ride first.");
      handleCloseDialog();
      return;
    }

    try {
      const token = sessionStorage.getItem("authToken");
      const baseUrl = process.env.REACT_APP_BACKEND_URL;

      const res = await fetch(
        `${baseUrl}/api/rides/${selectedRide.id || selectedRide._id}/accept`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(driverInfo),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Accept failed");

      socket.emit("rideUpdated", data.ride || selectedRide);
      setPendingRides((prev) => prev.filter((r) => (r.id || r._id) !== (selectedRide.id || selectedRide._id)));
      setActiveRides([data.ride || selectedRide]);
      setCurrentRide(data.ride || selectedRide);
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleRideAction = async (ride, action) => {
    try {
      const token = sessionStorage.getItem("authToken");
      const rideId = ride.id || ride._id;
      const baseUrl = process.env.REACT_APP_BACKEND_URL;
      let url;

      if (action === "start") url = `${baseUrl}/api/rides/${rideId}/start`;
      else if (action === "complete") {
        if (!window.confirm(`Complete ride #${rideId}?`)) return;
        url = `${baseUrl}/api/rides/${rideId}/complete`;
      } else if (action === "cancel") {
        if (!window.confirm(`Cancel ride #${rideId}?`)) return;
        url = `${baseUrl}/api/rides/${rideId}/cancel`;
      } else throw new Error("Invalid action");

      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);

      const updatedRide = data.ride || { ...ride, status: action === "start" ? "in_progress" : action };
      socket.emit("rideUpdated", updatedRide);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
  return (
    <Box sx={{ p: 0, bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: "#82b1ff",
          color: "white",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: isDesktop ? "space-between" : "flex-start",
          pl: isDesktop ? "50px" : "20px",
          fontWeight: "bold",
          fontSize: isDesktop ? "1.5rem" : "1.25rem",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img
            src="/taxifav.png"
            alt="Taxi Icon"
            style={{ width: isDesktop ? 35 : 30, height: isDesktop ? 35 : 30, marginRight: 10 }}
          />
          <span style={{ fontWeight: "bold", fontSize: isDesktop ? "1.75rem" : "1.5rem" }}>
            SWYFT - Driver Dashboard
          </span>
        </Box>

        {/* Desktop Buttons */}
        {isDesktop && (
          <Box sx={{ display: "flex", gap: 2, mr: 10 }}>
            <Button
              variant="contained"
              sx={{
                borderRadius: "15px",
                backgroundColor: "#fff",
                color: "#000",
                fontWeight: "bold",
                padding: "10px 24px",
                "&:hover": { backgroundColor: "#f0f0f0" },
              }}
              onClick={() => navigate("/")}
            >
              Home
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderRadius: "15px",
                borderColor: "#fff",
                color: "#fff",
                fontWeight: "bold",
                "&:hover": { borderColor: "#f0f0f0", color: "#f0f0f0" },
              }}
              onClick={() => navigate('/signin')}
            >
              Sign Out
            </Button>
          </Box>
        )}

        {/* Mobile Hamburger */}
        {!isDesktop && (
          <IconButton color="inherit" sx={{ ml: "auto" }} onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate("/")}>
                <ListItemIcon><HomeIcon /></ListItemIcon>
                <ListItemText primary="Home" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate('/signout')}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Driver Info */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, pl: isDesktop ? 5 : 3 }}>
        Welcome, {driverInfo.name} ({driverInfo.email}) | Driver Phone: {driverInfo.phone || "No phone number found"}
      </Typography>

      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: 3,
          mt: 2,
          pl: isDesktop ? 5 : 2,
          pr: isDesktop ? 5 : 2,
        }}
      >
        {/* Pending Rides */}
        <Box sx={{ width: isDesktop ? 500 : "100%" }}>
          <Box
            sx={{
              bgcolor: "#82b1ff",
              color: "white",
              p: 2,
              fontWeight: "bold",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            Available Rides
          </Box>
          <Box
            sx={{
              border: "1px solid #ccc",
              borderRadius: 3,
              p: 2,
              bgcolor: "#f5f5f5",
              maxHeight: 500,
              overflowY: "auto",
            }}
          >
            {pendingRides.length === 0 ? (
              <Typography>No pending rides</Typography>
            ) : (
              pendingRides.map((ride) => (
                <Box key={ride.id} sx={{ border: "1px solid #ccc", borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography>#{ride.id} - {ride.passenger_name} ({ride.ride_type})</Typography>
                  <Typography>Pickup: {ride.pickup_location}</Typography>
                  <Typography>Dropoff: {ride.dropoff_location}</Typography>
                 <Typography>Fare:  ₺{ride.ride_price?.toFixed(2) || "0.00"}</Typography>
                  <Button variant="contained" sx={{ mt: 1 }} onClick={() => handleOpenDialog(ride)}>Accept Ride</Button>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Map */}
        <DriverMap ride={currentRide} />

        {/* Active, Completed & Canceled Rides */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ActiveRides
            rides={activeRides}
            onStartRide={(ride) => handleRideAction(ride, "start")}
            onCompleteRide={(ride) => handleRideAction(ride, "complete")}
            onCancelRide={(ride) => handleRideAction(ride, "cancel")}
          />
          <CompletedRides rides={completedRides} />
          <CanceledRides rides={canceledRides} />
        </Box>
      </Box>

      {/* Accept Ride Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Accept Ride</DialogTitle>
        <DialogContent>Are you sure you want to accept ride #{selectedRide?.id}?</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAccept}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
