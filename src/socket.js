import { io } from "socket.io-client";

const socket = io("https://swyft-4.onrender.com", {
  transports: ["websocket"], // ensures real-time without fallbacks
});

export default socket;
