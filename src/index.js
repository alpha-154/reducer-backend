import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { setupSocket } from "./socket.js";

const server = createServer(app);

const allowedOrigins = [
  process.env.CORS_ORIGIN_DEVELOPMENT, // Development
  process.env.CORS_ORIGIN_PRODUCTION,  // Production
];

if (!allowedOrigins.every((origin) => origin)) {
  throw new Error("One or more CORS_ORIGIN values are undefined in the environment variables");
}

console.log("Environment:", process.env.NODE_ENV);
console.log("Allowed CORS Origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log("origin: ", origin);
      // Allow requests with no origin (e.g., mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
    },
    credentials: true,
  },
});

// Setup the main socket connection
setupSocket(io);

// Start the server
connectDB()
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
