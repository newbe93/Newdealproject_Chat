import { Server } from "socket.io";
import http from 'http';
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors : {
        origin : ["http://localhost:3000"],
        methods : ["GET", "POST"]
    },
    serveClient : false,
})

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId] || [];
}

const userSocketMap = {}; // {userId: [socketId1, socketId2, ...]}

io.on('connection', (socket) => {
    console.log("a user connected", socket.id)

    const userId = socket.handshake.query.userId;
    console.log("connected userId = " + userId)
    // if(userId != "undefined") userSocketMap[userId] = socket.id;
    if (userId !== "undefined") {
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = [];
        }
        userSocketMap[userId].push(socket.id);
    }

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap))

    // socket.on("disconnect", () => {
    //     console.log("user disconnected", socket.id)
    //     delete userSocketMap[userId];
    //     io.emit("getOnlineUsers", Object.keys(userSocketMap))
    // })

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id);
        if (userId !== "undefined") {
            userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);
            if (userSocketMap[userId].length === 0) {
                delete userSocketMap[userId];
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
})

export {app, io, server}