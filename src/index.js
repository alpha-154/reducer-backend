import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { setupSocket } from "./socket.js";

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Setup the main socket connection
setupSocket(io);

// Start the server
connectDB()
  .then(() => {
    server.listen(process.env.PORT || 7000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
