import { Server } from "socket.io";
import type { Server as HTTPServer } from "node:http";

let io: Server;

export function initSocket(server: HTTPServer) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Socket connected", socket.id);

        socket.on("join", (room) => {
            console.log(`Socket ${socket.id} joined ${room}`);
            socket.join(room);
        });

        socket.on("leave", (room) => {
            socket.leave(room);
        });
    });
    return io;
}

export function getIO() {
    if (!io) {
        console.warn("Socket.io not initialized yet");
        return null;
    }
    return io;
}
