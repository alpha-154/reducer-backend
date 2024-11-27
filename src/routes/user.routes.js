import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  isUserNameUnique,
  getUserId,
  searchUsers,
  sendMessageRequest,
  acceptMessageRequest,
  getConnectedUsers,
  sendMessage,
  sendVoiceMessage ,
  getPreviousMessages,
  declinePrivateMessageRequest,
  createUserSortingList,
  updateUserSortList,
  deleteUserSortList,
  unfriendUser,
  addToChatSortList,
  updatePassword ,
  updateProfileImage
} from "../controllers/user.controller.js";

//import authoriseUser from "../middlewares/auth.middleware.js";


const router = Router();

//Authentication Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Route to Check Whether Username is Unique or Not
router.get("/check-username-unique", isUserNameUnique);

// Route to Update a User's Profile Image
router.put("/update-profile-image", updateProfileImage);


//Route to Change a existing User's Password
router.put("/update-password", updatePassword);


// Fetching Current (logged in) User ID
router.get("/get-user-id", getUserId);


// Route to Search Users by Username
router.get("/search", searchUsers);

//Send & Accept Message Requests
router.post("/message-request", sendMessageRequest);
router.post("/accept-message-request", acceptMessageRequest);


//Route to Decline Private Message Request
router.post("/decline-private-message-request", declinePrivateMessageRequest);


//Fetching Connected Users of The Current Logged In User
router.get("/get-connected-users/:currentUserUserName", getConnectedUsers);

// Sending Private Messages
router.post("/send-message", sendMessage);

//Sending Voice Messages
router.post("/send-voice-message", sendVoiceMessage);



// Handling Users Sorting List
router.get("/get-previous-messages/:currentUserUserName/:chatWithUserUserName", getPreviousMessages);
router.post("/create-user-sorting-list", createUserSortingList);
router.put("/update-user-sorting-list", updateUserSortList);
router.delete("/delete-user-sorting-list", deleteUserSortList);


// Ending Connection with a User
router.delete("/end-connection", unfriendUser);

// Adding a User to Chat Sort List
router.post("/add-user-to-chat-sort-list", addToChatSortList);


export default router;
