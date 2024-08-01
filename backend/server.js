import path from "path";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from 'cors';

import authRoutes from "./routes/auth.routes.js"
import messageRoutes from "./routes/message.routes.js"
import userRoutes from "./routes/user.routes.js"

import connectToMongoDB from "./db/connectToMongoDB.js";
import { app, server } from "./socket/socket.js";
import {connectToMySQLDB} from "./db/connectToMySQLDB.js";


const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();

dotenv.config();

app.use(cookieParser())
app.use(express.json()); // to parse the incoming requests with JSON payloads (from req.body)

app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/users", userRoutes);

// app.use(express.static(path.join(__dirname,"/frontend/")));

// app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"))
// })

// app.get("/", (req, res) => {
//     // root route http://localhost:5000/
//     res.send("Hello World!!!!");
// })



// CORS 미들웨어 추가
app.use(cors({
  origin: 'http://localhost:3000', // 프론트엔드 주소
  credentials: true
}));


server.listen(PORT, () => {
    connectToMongoDB();
    connectToMySQLDB();
    console.log(`Server Running on port ${PORT}`)
});