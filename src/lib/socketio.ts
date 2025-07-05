import { Server as SocketIOServer, Socket } from "socket.io";

interface SendMessagePayload {
    message: string;
    name: string;
}

export const setupChatSocket = (io: SocketIOServer): void => {
    io.on("connection", (socket: Socket) => {
        console.log("🟢 New client connected:", socket.id);

        socket.on("send-message", ({ message, name }: SendMessagePayload) => {
            console.log("📨 Message:", message, "from", name);
            io.emit("receive-message", { message, name });
        });

        socket.on("disconnect", () => {
            console.log("🔴 Client disconnected:", socket.id);
        });
    });
};
