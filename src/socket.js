// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"], // ensures real-time without fallbacks
});

export default socket;
