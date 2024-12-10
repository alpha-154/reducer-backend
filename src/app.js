import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// Routes import
import userRouter from "./routes/user.routes.js";
import groupRouter from "./routes/group.routes.js";
import notificationRouter from "./routes/notification.routes.js";

const app = express();

// Define allowed origins for development and production
const allowedOrigins = [
  process.env.CORS_ORIGIN_DEVELOPMENT, // Development origin
  process.env.CORS_ORIGIN_PRODUCTION,  // Production origin
];

if (!allowedOrigins.every((origin) => origin)) {
  throw new Error("One or more CORS_ORIGIN values are undefined in the environment variables");
}

//console.log("Environment:", process.env.NODE_ENV);
//console.log("Allowed CORS Origins:", allowedOrigins);

// * Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
    },
    credentials: true, // Allow cookies and authorization headers
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));



// Routes configuration
app.use("/api/user", userRouter);
app.use("/api/group", groupRouter);
app.use("/api/notification", notificationRouter);

export default app;
