import { Router } from "express";
import { 
    getUserNotifications,
    deleteUserNotification,
    markNotificationAsSeen,
    // markNotificationAsRead
} from "../controllers/notification.controller.js";

const router = Router();

// Route to Get User Notifications
router.get("/get-user-notifications/:username", getUserNotifications);

//Router to Delete A Notification
router.delete("/delete-user-notification/:currentUserUserName", deleteUserNotification);

//Router to Mark Notification(s) as seen
router.put("/seen-notification", markNotificationAsSeen);

//Router to Mark A Notification as read
// router.put("/read-notification", markNotificationAsRead);


export default router;
