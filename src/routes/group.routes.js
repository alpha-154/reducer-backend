import { Router } from "express";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  searchGroups,
  sendGroupJoinRequest,
  acceptGroupJoinRequest,
  declineGroupJoinRequest,
  sendMessageToGroup,
  getGroupMessages
} from "../controllers/group.controller.js";

const router = Router();

// Route to Create a Group
router.post("/create", createGroup);
router.get("/getGroups/:userName", getGroups);
router.put("/update/:groupName", updateGroup);
router.delete("/delete/:groupName", deleteGroup);
router.get("/search", searchGroups);

//Route to Send Group Message
router.post("/send-group-message", sendMessageToGroup);

//Route to Fetch Previous Group Messages
router.get("/get-previous-group-messages", getGroupMessages);

//Route to Send Group Request
router.post("/sendGroupJoinRequest", sendGroupJoinRequest);

//Route to Get Accepted Group Requests
router.post("/accept-group-join-request", acceptGroupJoinRequest);

//Route to Decline Group Join Request
router.post("/decline-group-join-request", declineGroupJoinRequest);


export default router;
