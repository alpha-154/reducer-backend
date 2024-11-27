import dayjs from "dayjs";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Notifications from "../models/notification.model.js";
import { createGroupSchema , updateGroupSchema} from "../schemas/userGroup.schema.js";


//Todo: fix this error: after accepting a group join request, the user information doesn't get removed from the admin's notification list

//const formatDate = (date) => dayjs(date).format("DD/MM/YY - HH:mm");


export const createGroup = async (req, res) => {
  const result = createGroupSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: result.error.issues[0].message });
  }

  try {
    const { groupName, admin, imageUrl } = result.data;

    // Find the user by username
    const user = await User.findOne({ userName: admin });
    if (!user) {
      return res.status(400).json({ message: "Provided admin user does not exist!" });
    }

    // Check if a group with the same name already exists
    const isGroupNameUnique = await Group.findOne({ groupName });
    if (isGroupNameUnique) {
      return res.status(400).json({ message: "Group name already exists" });
    }

    // Create the group
    const group = await Group.create({
      groupName,
      groupImage: imageUrl,
      members: [user._id],
      admin: user._id, // Use the user's ObjectId directly
    });

    // Add the group's ObjectId to the user's `groupChatList`
    const isGroupNameExistsInUser = user.groupChatList.find((group) => group.groupName === groupName);
    if (!isGroupNameExistsInUser) {
      user.groupChatList.push({
        groupName: group.groupName,
        groupMessageId: group._id,
      });
      user.joinedGroupList.push(group._id);
      await user.save(); // Save the user with updated groupChatList
    } else {
      return res.status(400).json({ message: "Group name already exists in User's groupChatList field" });
    }

    return res.status(201).json({ message: "Group created successfully!", group });
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};



export const getGroups = async (req, res) => {
  const { userName } = req.params;
  if( !userName ) {
    return res.status(400).json({ message: "User name is required" });
  }
  
  try {
   const userObjectId = await User.findOne({userName}).select("_id")

    const groups = await Group.find({
      members: { $in: [userObjectId] },
    });
    if(!groups){
      return res.status(404).json({ message: "No groups found" });
    }
    res.status(200).json({ message: "Groups fetched successfully!", groups});
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export const updateGroup = async (req, res) => {
  const { groupName } = req.params;
  if( !groupName ) {
    return res.status(400).json({ message: "Group name is required!" });
  }
  const result = updateGroupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues[0].message });
  }  

  const { userName } = result.data;

  try {
    const group = await Group.findOneAndUpdate({groupName}, { userName }, {
      new: true
    });
    if(!group){
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json({ message: "Group updated successfully!", group});
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Server error" });
  }
}


export const deleteGroup = async (req, res) => {
  const { groupName } = req.params;

  if (!groupName) {
    return res.status(400).json({ message: "Group name is required!" });
  }

  try {
    // Find the group by groupName and delete it
    const group = await Group.findOneAndDelete({ groupName });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Remove the group from each member's `joinedGroupList` and `groupChatList`
    await User.updateMany(
      { _id: { $in: group.members } },
      {
        $pull: {
          joinedGroupList: group._id,
          groupChatList: { 
            groupName: group.groupName, 
            groupMessageId: group._id 
          },
        },
      }
    );

    // Respond with success message
    res.status(200).json({ message: "Group deleted successfully!", group });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Server error" });
  }
};



// Controller to search groups by username
export const searchGroups = async (req, res) => {
  //add zod validation
  try {
    const { query } = req.query;

    // Use a regex for partial, case-insensitive matching
    const users = await Group.find({
      groupName: { $regex: query, $options: "i" }
    }).select("groupName"); // Only return userName field

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};

//Controller to send group requestexport const sendGroupJoinRequest = async (req, res) => {
  
  export const sendGroupJoinRequest = async (req, res) => {
    const { requestSender, requestedGroup } = req.body;

    if (!requestSender || !requestedGroup) {
        return res.status(400).json({ message: "Request sender or requested group fields not found!" });
    }

    try {
        // Find the requesting user
        const senderUser = await User.findOne({ userName: requestSender });
        if (!senderUser) {
            return res.status(404).json({ message: "Request sender not found!" });
        }

        // Find the requested group and populate the admin field
        const group = await Group.findOne({ groupName: requestedGroup }).populate("admin");
        if (!group) {
            return res.status(404).json({ message: "Group not found!" });
        }

        const adminUser = group.admin;
        if (!adminUser) {
            return res.status(404).json({ message: "Group admin not found!" });
        }

        // Check if the admin user has a Notification document
        let adminNotification = await Notifications.findOne({ userId: adminUser._id });
        if (!adminNotification) {
            // Create a new Notification document if it doesn't exist
            adminNotification = new Notifications({ userId: adminUser._id });
            await adminNotification.save();  // Save the newly created Notification
        }

        // Check if a join request already exists in `receivedGroupJoinRequestAsAdmin`
        const existingRequest = adminNotification.receivedGroupJoinRequestAsAdmin.find(
            (request) => request.groupName === requestedGroup
        );

        if (existingRequest) {
            // Check if the user already requested to join this group
            if (existingRequest.requestedUser.includes(senderUser._id)) {
                return res.status(400).json({ message: "Group join request already sent!" });
            } else {
                // Add the requesting user's ID to the existing `requestedUser` array for the group
                existingRequest.requestedUser.push(senderUser._id);
            }
        } else {
            // Create a new join request for this group in the Notification model
            adminNotification.receivedGroupJoinRequestAsAdmin.push({
                groupName: requestedGroup,
                requestedUser: [senderUser._id],
            });
        }

        // Save the group's name in the sender's `sentGroupJoinRequest` array
        senderUser.sentGroupJoinRequest.push(requestedGroup);
        await senderUser.save();

        // Save the updated Notification document (after modifying `receivedGroupJoinRequestAsAdmin`)
        await adminNotification.save();

        res.status(200).json({ message: "Group join request sent successfully!" });
    } catch (error) {
        console.error("Error sending group join request:", error);
        return res.status(500).json({ message: "Internal server error!" });
    }
};


export const acceptGroupJoinRequest = async (req, res) => {
  const { requestedUserUserName, groupName } = req.body;

  if (!requestedUserUserName || !groupName) {
    return res.status(400).json({ message: "Requested User ID and Group Name are required." });
  }

  try {
 
    //step 0: Find the requested user object Id
    const requestedUserId = await User.findOne({ userName: requestedUserUserName }).select("_id");


    // Step 1: Find the group by name and populate admin field
    const group = await Group.findOne({ groupName }).populate('admin');
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Step 2: Determine the admin ID from the group
    const adminId = group.admin._id;

    // Step 3: Find the admin's notification document
    const adminNotification = await Notifications.findOne({ userId: adminId });
    if (!adminNotification) {
      return res.status(404).json({ message: "Admin notifications not found." });
    }

    // Step 4: Remove requestedUserId from admin's receivedGroupJoinRequestAsAdmin
    const groupRequest = adminNotification.receivedGroupJoinRequestAsAdmin.find(req => req.groupName === groupName);
    if (!groupRequest) {
      return res.status(404).json({ message: "No join request found for this group." });
    }

    
    // Corrected: Use filter instead of indexOf for ObjectId comparison
    groupRequest.requestedUser = groupRequest.requestedUser.filter(userId => !userId.equals(requestedUserId));

    // If requestedUser array is empty, remove the group request
    if (groupRequest.requestedUser.length === 0) {
      adminNotification.receivedGroupJoinRequestAsAdmin = adminNotification.receivedGroupJoinRequestAsAdmin.filter(req => req.groupName !== groupName);
    }

    // Step 5: Add requested user's ID to the group's members array
    group.members.push(requestedUserId);
    await group.save();

    // Step 6: Add group info to the requested user's groupChatList
    const requestedUser = await User.findById(requestedUserId);
    if (!requestedUser) {
      return res.status(404).json({ message: "Requested user not found." });
    }

    //Add group name to the requestedUser's joinGroupList
    requestedUser.joinedGroupList.push(group._id);

    // Add group info to user's groupChatList
    requestedUser.groupChatList.push({
      groupName: group.groupName,
      groupMessageId: group._id,
    });

    // Remove group's name from sentGroupJoinRequest array
    requestedUser.sentGroupJoinRequest = requestedUser.sentGroupJoinRequest.filter(name => name !== groupName);

    // Step 7: Add group's info to the user's acceptedSentGroupMessageRequest in notifications
    const userNotification = await Notifications.findOne({ userId: requestedUserId });
    if (!userNotification) {
      return res.status(404).json({ message: "User notifications not found." });
    }

    userNotification.acceptedSentGroupMessageRequest.push({
      groupId: group._id,
      createdAt: new Date(),
    });

    // Save all changes
    await requestedUser.save();
    await adminNotification.save();
    await userNotification.save();

    return res.status(200).json({ message: "Group join request accepted successfully!" });
  } catch (error) {
    console.error("Error accepting group join request:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};



export const declineGroupJoinRequest = async (req, res) => {
  const { requestedUserUserName, groupName } = req.body;

  if (!requestedUserUserName || !groupName) {
    return res.status(400).json({ message: "Current User ID and Group Name are required." });
  }

  try {

    //step 0: Find the requested user object Id
    const requestedUserId = await User.findOne({ userName: requestedUserUserName }).select("_id");

    // Step 1: Find the group by name and populate the admin field
    const group = await Group.findOne({ groupName }).populate('admin');
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Step 2: Find the admin's notification document
    const adminId = group.admin._id; // Get the populated admin's ObjectId
    const adminNotification = await Notifications.findOne({ userId: adminId });
    if (!adminNotification) {
      return res.status(404).json({ message: "Admin notifications not found." });
    }

    // Step 3: Remove requestedUserId from admin's receivedGroupJoinRequestAsAdmin
    const groupRequest = adminNotification.receivedGroupJoinRequestAsAdmin.find(req => req.groupName === groupName);
    if (groupRequest) {
      const userIndex = groupRequest.requestedUser.indexOf(requestedUserId);
      if (userIndex > -1) {
        groupRequest.requestedUser.splice(userIndex, 1);
      }

      // If requestedUser array is empty, remove the group request
      if (groupRequest.requestedUser.length === 0) {
        adminNotification.receivedGroupJoinRequestAsAdmin = adminNotification.receivedGroupJoinRequestAsAdmin.filter(req => req.groupName !== groupName);
      }
    }

    // Step 4: Add groupName to the requested user's declinedSentGroupMessageRequest
    const requestedUserNotification = await Notifications.findOne({ userId: requestedUserId });
    if (!requestedUserNotification) {
      return res.status(404).json({ message: "Requested user notifications not found." });
    }

    requestedUserNotification.declinedSentGroupMessageRequest.push({
      groupId: group._id,
      createdAt: new Date(),
    });

    // Step 5: Remove groupName from the requested user's sentGroupJoinRequest array
    const requestedUser = await User.findById(requestedUserId);
    if (!requestedUser) {
      return res.status(404).json({ message: "Requested user not found." });
    }

    requestedUser.sentGroupJoinRequest = requestedUser.sentGroupJoinRequest.filter(name => name !== groupName);

    // Step 6: Save all changes
    await adminNotification.save();
    await requestedUserNotification.save();
    await requestedUser.save();

    return res.status(200).json({ message: "Group join request declined" });
  } catch (error) {
    console.error("Error declining group join request:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


//send message to a group
export const sendMessageToGroup = async (req, res) => {
  const { groupId, groupName, senderUsername, content } = req.body;
  
  if (!groupId || !senderUsername || !content) {
    return res.status(400).json({ message: "Group ID, sender username, and content are required." });
  }

  try {

     //Find the sender & then extract his profile Image so that later on
     //it can be added to the message
    const sender = await User.findOne({ userName: senderUsername });
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    const senderProfileImage = sender.profileImage;
    if(!senderProfileImage){
      return res.status(404).json({ message: "Sender profile image not found" });
    }

    // Find the group by name
    const group = await Group.findOne({ groupName });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Use Day.js for the createdAt field
    const createdAt = dayjs().toDate();

    // Create a new message
    const newMessage = new Message({
      from: senderUsername,
      to: groupName,
      content,
      isGroupMsg: true,
      senderProfileImage,
      groupMsgIdentifier: groupId,
      createdAt,
    });

    // Save the message
    const savedMessage = await newMessage.save();

    // Add the message ID to the group's messageList
    group.messageList.push(savedMessage._id);
    await group.save();

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//get groups messages
export const getGroupMessages = async (req, res) => {
  const { groupId, groupName } = req.query;
  
  if (!groupId || !groupName) {
    return res.status(400).json({ message: "Group ID and Group Name are required." });
  }

  try {
    // Find the group and populate messageList
    const group = await Group.findOne({ groupName })
      .populate({
        path: "messageList",
        model: "Message",
        select: "from to content senderProfileImage createdAt",
        options: { sort: { createdAt: 1 } } // Sort messages by timestamp in ascending order
      });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json({ groupMessages: group.messageList });
  } catch (error) {
    console.error("Error getting group messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
