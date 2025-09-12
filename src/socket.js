// socket.js
import { io } from "socket.io-client";

// Use environment variable for deployment
const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", {
  transports: ["websocket"], // ensures real-time without fallbacks
});

export default socket;
