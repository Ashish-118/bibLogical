// src/lib/socketClient.ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
    transports: ["websocket"], // Ensure WS only (optional)
});

export default socket;
