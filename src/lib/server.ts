// import express from "express";
// import { createServer } from "http";
// import { Server } from "socket.io";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import { setupChatSocket } from "./socketio"; // Adjust the import path as necessary

// const app = express();
// app.use(cors({
//     origin: process.env.CORS_ORIGIN,

//     credentials: true
// }))

// app.use(express.json({ limit: "16kb" }))

// app.use(express.urlencoded({ extended: true, limit: "16kb" }))

// app.use(express.static("public"))
// app.use(cookieParser())
// const httpServer = createServer(app);

// const io = new Server(httpServer, {
//     cors: {
//         origin: "*", // Allow any origin; replace with your frontend's URL in production
//     },
// });

// setupChatSocket(io);


// // Start both HTTP and WebSocket servers
// const PORT = process.env.PORT || 3000;
// httpServer.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

// server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import { setupChatSocket } from "./socketio"; // Adjust if needed

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

setupChatSocket(io);

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
