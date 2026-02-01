import { io } from "socket.io-client";
import { PUBLIC_SERVER_URL } from '$env/static/public';

const socketUrl = PUBLIC_SERVER_URL || 'http://localhost:3002';

export const socket = io(socketUrl, {
    autoConnect: false,
    withCredentials: true
});
