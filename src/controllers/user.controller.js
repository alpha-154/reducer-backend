import User from "../models/user.model.js";
import Publickey from "../models/publickey.model.js";
import Message from "../models/message.model.js";
import PrivateMessage from "../models/privatemessage.model.js";
import Notifications from "../models/notification.model.js";

import * as fs from "fs";

import cloudinary from "../config/cloudinary.js";
import formidable from "formidable";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dayjs from "dayjs";

//Todo: add zod validation as such so that a user have to provide strong password.



export const registerUser = async (req, res) => {
  const { userName, password, imageUrl } = req.body;
  if (!userName || !password || !imageUrl) {
    res.status(400).json({ message: "All Fields Are Required!" });
    return;
  }

  try {
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      res.status(400).json({ message: "User Already Exists!" });
      return;
    }
    const hashPassword = await bcrypt.hash(password, 10);
    // Generate public and private key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048, // Key size in bits, 2048 is common for secure RSA
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    //Todo: encrypt the private key with the user's password & then store it into database
    const createdAt = new Date().toISOString().split("T")[0]; // Format the date to YYYY-MM-DD
    // Initialize the chatSortList array with the required list names and empty members arrays
    const chatSortList = [
      { listName: "All Connected Users", members: [] },
      { listName: "Family", members: [] },
      { listName: "Friends", members: [] },
      { listName: "Office", members: [] },
      { listName: "University", members: [] },
    ];

    const newUser = new User({
      publicKey,
      privateKey,
      userName,
      password: hashPassword,
      profileImage: imageUrl || "",
      chatSortList,
      createdAt,
    });
    await newUser.save();
    // Save public key and username to Publickey model
    const publicKeyEntry = new Publickey({
      userName,
      publicKey,
    });
    await publicKeyEntry.save();

    //Initiate the Notification model for the user
    const notifications = new Notifications({
      userId: newUser._id,
    });
    await notifications.save();

    return res
      .status(201)
      .json({ message: "User Registered Successfully!", user: newUser });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};

export const loginUser = async (req, res) => {
  const { userName, password } = req.body;
  // Check if both fields are provided
  if (!userName || !password) {
    return res.status(400).json({ message: "All Fields Are Required" });
  }

  // console.log("usernName, password ", userName, password)
  try {
    // Check if the user exists
    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(400).json({ message: "User Doesn't Exist!" });
    }
    // Validate the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.userName,
        profileImage: user.profileImage,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h", // Set token expiration as needed
      }
    );
    
    // Send token as an HTTP-only cookie
    res.cookie("accessToken", token, {
      httpOnly: true, // Prevent access via JavaScript
      secure: true, // Ensures the cookie is only sent over HTTPS
      sameSite: 'none', // Required for cross-domain cookies
      maxAge: 3600 * 1000, // 1 hour
      path: "/", // Ensure the cookie is accessible across all paths
      domain: ".vercel.app", // Shared domain for frontend and backend
    });
    return res
      .status(200)
      .json({
        message: "Welcome Back!",
        user: { userName: user.userName, publicKey: user.publicKey },
      });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};

export const isUserNameUnique = async (req, res) => {
  const { userName } = req.query;
  //console.log("userName", userName);

  // Check if userName is provided
  if (!userName) {
    return res.status(400).json({ message: "Username is required." });
  }

  try {
    // Query the database to check if the userName exists
    const existingUser = await User.findOne({ userName });

    if (existingUser) {
      // Username is not unique
      return res.status(209).json({ isUnique: false });
    } else {
      // Username is unique
      return res.status(200).json({ isUnique: true });
    }
  } catch (error) {
    console.error("Error checking username uniqueness:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // Clear the accessToken cookie
    res.cookie("accessToken", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0), // Expire the cookie immediately
      path: "/", // Ensure cookie is cleared site-wide
    });

    // Set headers to disable caching
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    return res.status(200).json({
      message: "Logout Successful",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error!",
      error: error.message,
    });
  }
};

export const getUserId = (req, res) => {
  const token = req.cookies.accessToken; // Access the token from cookies

  if (!token) {
    return res.status(401).json({ error: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use the same secret used to sign the token
    const userId = decoded._id; // Assuming _id is part of the token payload

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in token" });
    }
    const username = decoded.username;
    if (!username) {
      return res.status(401).json({ error: "Username not found in token" });
    }
    const profileImage = decoded.profileImage;
    if (!profileImage) {
      return res
        .status(401)
        .json({ error: "Profile image not found in token" });
    }

    return res.status(200).json({ userId, username, profileImage });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const sendMessageRequest = async (req, res) => {
  const { senderUsername, receiverUsername } = req.body;

  if (!senderUsername || !receiverUsername) {
    return res
      .status(400)
      .json({ message: "Sender or Receiver fields not found!" });
  }

  try {
    // Find sender and receiver users
    const senderUser = await User.findOne({ userName: senderUsername });
    const receiverUser = await User.findOne({ userName: receiverUsername });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "Users not found!" });
    }

    // Prevent self-request
    if (senderUser._id.equals(receiverUser._id)) {
      return res
        .status(400)
        .json({ message: "Cannot send a message request to yourself!" });
    }

    // Check if receiver's username already exists in sender's sentPrivateMessageRequest
    if (senderUser.sentPrivateMessageRequest.includes(receiverUser.userName)) {
      return res
        .status(400)
        .json({ message: "Message request already sent to this user!" });
    }

    // Update sender's sentPrivateMessageRequest
    await User.findByIdAndUpdate(
      senderUser._id,
      { $addToSet: { sentPrivateMessageRequest: receiverUser.userName } },
      { new: true }
    );

    // Find or create a Notifications document for the receiver
    let receiverNotifications = await Notifications.findOne({
      userId: receiverUser._id,
    });

    if (!receiverNotifications) {
      receiverNotifications = new Notifications({ userId: receiverUser._id });
      await receiverNotifications.save();
    }

    // Check if sender's ObjectId already exists in receiver's receivedPrivateMessageRequest
    const existingRequest =
      receiverNotifications.receivedPrivateMessageRequest.some(
        (request) => request.userId.toString() === senderUser._id.toString()
      );

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Message request already sent to this user!" });
    }

    // Add sender's ObjectId to receiver's receivedPrivateMessageRequest
    await Notifications.findByIdAndUpdate(
      receiverNotifications._id,
      {
        $addToSet: {
          receivedPrivateMessageRequest: { userId: senderUser._id },
        },
      },
      { new: true }
    );

    res.status(200).json({ message: "Message request sent successfully!" });
  } catch (error) {
    console.error("Error sending message request:", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const acceptMessageRequest = async (req, res) => {
  const { currentUserUserName, requestedUserUserName } = req.body;
  //console.log("currentUserUsername", currentUserUsername);
  //console.log("requestedUserUsername", requestedUserUsername);

  if (!currentUserUserName || !requestedUserUserName) {
    return res
      .status(400)
      .json({ message: "Sender or Receiver fields not found!" });
  }

  try {
    const currentUserData = await User.findOne({
      userName: currentUserUserName,
    });
    const requestedUserData = await User.findOne({
      userName: requestedUserUserName,
    });

    if (!currentUserData || !requestedUserData) {
      return res.status(404).json({ message: "Users not found!" });
    }

    if (currentUserData._id.equals(requestedUserData._id)) {
      return res
        .status(400)
        .json({ message: "Cannot accept your own message request!" });
    }

    // Add requested user to current user's friendList
    const currentUserUpdate = await User.updateOne(
      { _id: currentUserData._id },
      { $addToSet: { friendList: requestedUserData._id } }
    );
    if (currentUserUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to add friend to current users friend list.",
        });
    }

    //Add current user to requested user's friendList
    const requestedUserUpdate = await User.updateOne(
      { _id: requestedUserData._id },
      { $addToSet: { friendList: currentUserData._id } }
    );
    if (requestedUserUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to add friend to requested users friend list.",
        });
    }

    // Remove the message request from current user's Notifications
    const notificationUpdate = await Notifications.updateOne(
      { userId: currentUserData._id },
      {
        $pull: {
          receivedPrivateMessageRequest: { userId: requestedUserData._id },
        },
      }
    );
    if (notificationUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to remove message request from notifications.",
        });
    }

    // Add current user to requested user's Notifications in acceptedSentPrivateMessageRequest
    const requestedUserNotificationUpdate = await Notifications.updateOne(
      { userId: requestedUserData._id },
      {
        $addToSet: {
          acceptedSentPrivateMessageRequest: { userId: currentUserData._id },
        },
      }
    );
    if (requestedUserNotificationUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to add acceptance to sent private message request.",
        });
    }

    // Remove current user's username from requested user's sentPrivateMessageRequest
    const requestedUserUpdate2 = await User.updateOne(
      { _id: requestedUserData._id },
      { $pull: { sentPrivateMessageRequest: currentUserUserName } }
    );
    if (requestedUserUpdate2.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message:
            "Failed to remove username from sent private message request.",
        });
    }

    // Check if a PrivateMessage document already exists between these users
    let privateMessage = await PrivateMessage.findOne({
      members: { $all: [currentUserData._id, requestedUserData._id] },
    });

    if (!privateMessage) {
      privateMessage = new PrivateMessage({
        members: [currentUserData._id, requestedUserData._id],
      });
      await privateMessage.save();
    }

    // Add the privateMessage ID to both users' privateChatList
    const currentUserChatListUpdate = await User.updateOne(
      { _id: currentUserData._id },
      {
        $addToSet: {
          privateChatList: {
            friendUsername: requestedUserUserName,
            privateMessageId: privateMessage._id,
          },
        },
      }
    );
    if (currentUserChatListUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to update current user’s private chat list.",
        });
    }

    const requestedUserChatListUpdate = await User.updateOne(
      { _id: requestedUserData._id },
      {
        $addToSet: {
          privateChatList: {
            friendUsername: currentUserUserName,
            privateMessageId: privateMessage._id,
          },
        },
      }
    );
    if (requestedUserChatListUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          message: "Failed to update requested user’s private chat list.",
        });
    }

    // Update both users' chatSortList for "All connected Users"
    await User.updateOne(
      {
        _id: currentUserData._id,
        "chatSortList.listName": "All Connected Users",
      },
      { $addToSet: { "chatSortList.$.members": requestedUserData._id } }
    );

    await User.updateOne(
      {
        _id: requestedUserData._id,
        "chatSortList.listName": "All Connected Users",
      },
      { $addToSet: { "chatSortList.$.members": currentUserData._id } }
    );

    res.status(200).json({ message: `Now you are connected with ${requestedUserUserName}`, requestedUserUserName });
  } catch (error) {
    console.error("Error accepting message request:", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

// Decline Private Message Request
export const declinePrivateMessageRequest = async (req, res) => {
  const { currentUserUserName, requestedUserUserName } = req.body;

  // Check for missing request body fields
  if (!currentUserUserName || !requestedUserUserName ) {
    return res
      .status(400)
      .json({ message: "Both currentUser and requestedUser are required" });
  }

  try {
    // Find the current and requested users based on their usernames
    const currentUserData = await User.findOne({ userName: currentUserUserName });
    const requestedUserData = await User.findOne({ userName: requestedUserUserName });

    if (!currentUserData || !requestedUserData) {
      return res
        .status(404)
        .json({
          message: `Current user ${currentUserUserName} or Requested user '${requestedUserUserName}' not found`,
        });
    }

    const currentUserId = currentUserData._id;
    const requestedUserId = requestedUserData._id;

    // Fetch notifications for both users to confirm they exist
    const currentUserNotifications = await Notifications.findOne({
      userId: currentUserId,
    });
    const requestedUserNotifications = await Notifications.findOne({
      userId: requestedUserId,
    });

    if (!currentUserNotifications || !requestedUserNotifications) {
      return res
        .status(404)
        .json({
          message:
            "Notification record for current or requested user not found",
        });
    }

    // 1. Remove requestedUser's ID from currentUser's receivedPrivateMessageRequest in Notifications
    const receivedUpdateResult = await Notifications.updateOne(
      { userId: currentUserId },
      {
        $pull: {
          receivedPrivateMessageRequest: { userId: requestedUserId },
        },
      }
    );

    if (receivedUpdateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({
          message:
            "Failed to remove requested user data from the Current user's receivedPrivateMessageRequest from Notification model",
        });
    }

    // 2. Add currentUser's ID to requestedUser's declinedSentPrivateMessageRequest in Notifications
    const declinedUpdateResult = await Notifications.updateOne(
      { userId: requestedUserId },
      {
        $push: {
          declinedSentPrivateMessageRequest: {
            userId: currentUserId,
            createdAt: new Date(),
          },
        },
      }
    );

    if (declinedUpdateResult.modifiedCount === 0) {
      return res
        .status(500)
        .json({
          message: "Failed to add to declinedSentPrivateMessageRequest",
        });
    }

    // 3. Remove currentUser's username from requestedUser's sentPrivateMessageRequest in User model
    const userUpdateResult = await User.updateOne(
      { _id: requestedUserId },
      {
        $pull: {
          sentPrivateMessageRequest: currentUserUserName,
        },
      }
    );

    if (userUpdateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "No sent private message request found to remove" });
    }

    res
      .status(200)
      .json({ message: "Private message request declined!", requestedUserUserName });
  } catch (error) {
    console.error("Error declining private message request:", error);
    res
      .status(500)
      .json({
        message: "An error occurred while declining the request",
        error: error.message,
      });
  }
};

export const getConnectedUsers = async (req, res) => {
  const { currentUserUserName } = req.params;

  try {
    // Find the current logged-in user by username and populate chatSortList's members
    const currentUser = await User.findOne({ userName: currentUserUserName })
      .populate({
        path: "chatSortList.members",
        select: "userName profileImage",
      })
      .exec();

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const connectedUsers = [];

    // Iterate through each list in chatSortList
    for (const list of currentUser.chatSortList) {
      const formattedList = {
        listName: list.listName,
        members: [],
      };

      for (const member of list.members) {
        // Check for private chat between the current user and the member
        const privateChat = await PrivateMessage.findOne({
          members: { $all: [currentUser._id, member._id] },
        });

        let lastMessage = "";
        let lastMessageTime = "";
        let privateMessageId = privateChat ? privateChat._id.toString() : null;

        if (privateChat) {
          // Find the last message in this private chat, if it exists
          const lastMessageData = await Message.findOne({
            privateMsgIdentifier: privateChat._id,
          })
            .sort({ createdAt: -1 })
            .exec();

          if (lastMessageData) {
            lastMessage = lastMessageData.content;
            lastMessageTime = lastMessageData.createdAt;
          }
        }

        // Push the member's details into the formatted list
        formattedList.members.push({
          userName: member.userName,
          profileImage: member.profileImage,
          lastMessage,
          lastMessageTime,
          privateMessageId,
        });
      }

      connectedUsers.push(formattedList);
    }

    res.status(200).json({ connectedUsers });
  } catch (error) {
    console.error("Error fetching connected users:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching connected users." });
  }
};

export const searchUsers = async (req, res) => {
  const { currentUserUserName, query } = req.query;
  if (!currentUserUserName || !query) {
    return res
      .status(400)
      .json({ message: "Username and query are required." });
  }

  try {
    // Step 1: Find the current user and populate the `friendList`
    const currentUser = await User.findOne({ userName: currentUserUserName })
      .select("friendList sentPrivateMessageRequest")
      .populate({
        path: "friendList",
        select: "userName",
      });

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    // Step 2: Retrieve users matching the search query
    const users = await User.find({
      userName: { $regex: query, $options: "i" },
    }).select("userName profileImage");

    // Step 3: Build the response with `isFriend` and `isMessageRequestSent` fields
    const formattedUsers = users.map((user) => {
      // Check if the user is a friend of the current user
      const isFriend = currentUser.friendList.some(
        (friend) => friend.userName === user.userName
      );

      // Check if a message request has already been sent to this user
      const isMessageRequestSent =
        currentUser.sentPrivateMessageRequest.includes(user.userName);

      return {
        userName: user.userName,
        profileImage: user.profileImage,
        isFriend,
        isMessageRequestSent,
      };
    });

    res.status(200).json({ users: formattedUsers });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  const { sender, receiver, content } = req.body;

  if (!sender || !receiver || !content) {
    return res
      .status(400)
      .json({ message: "Sender, receiver, and content are required!" });
  }

  try {
    // Find sender and receiver in the database
    const senderUser = await User.findOne({ userName: sender });
    const receiverUser = await User.findOne({ userName: receiver });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "Sender or receiver not found!" });
    }

    // Check for an existing PrivateMessage document
    const privateMessage = await PrivateMessage.findOne({
      members: { $all: [senderUser._id, receiverUser._id] },
    });

    if (!privateMessage) {
      return res
        .status(403)
        .json({ message: "No message thread exists between these users!" });
    }

    // Use Day.js for the createdAt field
    const createdAt = dayjs().toDate();

    // Create a new message
    const newMessage = new Message({
      from: sender,
      to: receiver,
      contentType: "text",
      content,
      isGroupMsg: false, // This is a private message, not a group message
      privateMsgIdentifier: privateMessage._id,
      createdAt,
    });

    // Save the message
    await newMessage.save();

    // Add message to the PrivateMessage's message list
    privateMessage.messageList.push(newMessage._id);
    await privateMessage.save();

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error!" });
  }
};


// sending audio messages
export const sendVoiceMessage = async (req, res) => {
  const form = formidable({
    multiples: false, // Disable multiple files for simplicity
    keepExtensions: true, // Keep file extensions
  });

  form.parse(req, async (err, fields, files) => {

    //console.log("Fields:", fields);
    //console.log("Files:", files);

    if (err) {
      console.error("Error parsing form data:", err);
      return res.status(400).json({ message: "Invalid form data!" });
    }

    const { sender, receiver } = fields;
    const senderUserName = sender[0]; // Extract username from the array
    const receiverUserName = receiver[0]; // Extract username from the array

    //console.log("sender:", senderUserName, "receiver:", receiverUserName);
    
    const audioFile = files.audio[0]; // The audio file key from FormData
    //console.log("audioFile:", audioFile);

    if (!senderUserName || !receiverUserName || !audioFile) {
      return res
        .status(400)
        .json({ message: "Sender, receiver, and audio file are required!" });
    }
    //console.log("audioFile size : ", audioFile.size/(1024 *1024) , "mb");

     // Check file size (2MB = 2 * 1024 * 1024 bytes)
     const maxFileSize = 2 * 1024 * 1024;
     if (audioFile.size > maxFileSize) {
       return res
         .status(400)
         .json({ message: "Audio file size exceeds the 2MB limit!" });
     }

    try {
      // Validate sender and receiver
      const senderUser = await User.findOne({ userName: senderUserName });
      const receiverUser = await User.findOne({ userName: receiverUserName });

      if (!senderUser || !receiverUser) {
        return res
          .status(404)
          .json({ message: "Sender or receiver not found!" });
      }

      // Check for an existing PrivateMessage document
      const privateMessage = await PrivateMessage.findOne({
        members: { $all: [senderUser._id, receiverUser._id] },
      });

      if (!privateMessage) {
        return res
          .status(403)
          .json({ message: "No message thread exists between these users!" });
      }

      // Upload the audio file to Cloudinary
      const uploadAudioToCloudinary = () => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "video", folder: "voice-messages" },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
    
          const fileStream = fs.createReadStream(audioFile.filepath);
          fileStream.pipe(uploadStream);
    
          fileStream.on("error", (streamError) => {
            reject(streamError);
          });
        });
      };

      const cloudinaryResult = await uploadAudioToCloudinary();

      if (!cloudinaryResult || !cloudinaryResult.secure_url) {
        return res
          .status(500)
          .json({ message: "Failed to retrieve Cloudinary upload URL!" });
      }
      //console.log("cloudinaryResult secure_url", cloudinaryResult.secure_url);

      // Create and save the voice message in the database
      const createdAt = dayjs().toDate();

      const newMessage = new Message({
        from: senderUserName,
        to: receiverUserName,
        contentType: "audio",
        content: cloudinaryResult.secure_url,
        isGroupMsg: false,
        privateMsgIdentifier: privateMessage._id,
        createdAt,
      });

      await newMessage.save();

      // Add the message to the private message thread
      privateMessage.messageList.push(newMessage._id);
      await privateMessage.save();

      res
        .status(201)
        .json({ message: newMessage });
    } catch (error) {
      console.error("Error sending voice message:", error);
      res.status(500).json({ message: "Internal server error!" });
    }
  });
};


export const getPreviousMessages = async (req, res) => {
  const { currentUserUserName, chatWithUserUserName } = req.params;

  // console.log("currentUserUserName", currentUserUserName);
  // console.log("chatWithUserUserName", chatWithUserUserName);

  if (!currentUserUserName || !chatWithUserUserName) {
    return res
      .status(400)
      .json({ message: "Sender or Receiver fields not found!" });
  }

  try {
    // Get user data by username
    const currentUserData = await User.findOne({
      userName: currentUserUserName,
    });
    const chatWithUserData = await User.findOne({
      userName: chatWithUserUserName,
    });

    if (!currentUserData || !chatWithUserData) {
      return res.status(404).json({ message: "Users not found!" });
    }

    // Find the PrivateMessage document with both users in the members array
    const privateMessage = await PrivateMessage.findOne({
      members: { $all: [currentUserData._id, chatWithUserData._id] },
    }).populate({
      path: "messageList",
      model: "Message",
      select: "from to contentType content createdAt",
      options: { sort: { createdAt: 1 } }, // Sort messages by timestamp ascending
    });

    if (!privateMessage) {
      return res.status(404).json({ message: "No previous messages found!" });
    }

    //newly added code
    // Group messages by date
    const previousMessages = privateMessage.messageList.reduce((acc, msg) => {
      const dateKey = dayjs(msg.createdAt).format("YYYY-MM-DD");

      // Check if this date key already exists in the accumulator object.
      if (!acc[dateKey]) {
        acc[dateKey] = []; // Initialize an empty array if the date key is not yet present.
      }

      // Add the message to the appropriate date array.
      acc[dateKey].push({
        from: msg.from,
        to: msg.to,
        contentType: msg.contentType,
        content: msg.content,
        createdAt: msg.createdAt,
      });

      // Return the updated accumulator object after processing this message.
      return acc;
    }, {});

    res.status(200).json({ previousMessages });

    //res.status(200).json({ messages: privateMessage.messageList });
  } catch (error) {
    console.error("Error fetching previous messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new users sorting list

export const createUserSortingList = async (req, res) => {
  const { currentUserUserName, listName } = req.body;
  if (!currentUserUserName || !listName) {
    return res
      .status(400)
      .json({ message: "Sender or List Name fields not found!" });
  }

  try {
    // Find the user by their userName
    const user = await User.findOne({ userName: currentUserUserName });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the list name already exists in the user's chatSortList
    const listExists = user.chatSortList.some(
      (list) => list.listName === listName
    );
    if (listExists) {
      return res.status(400).json({ message: "List Name already taken" });
    }

    // Create a new list object
    const newList = {
      listName,
      members: [], // initialize with an empty array
    };

    // Add the new list to the user's chatSortList
    user.chatSortList.push(newList);
    await user.save();

    return res
      .status(201)
      .json({
        message: "List created successfully",
        createdList: newList,
      });
  } catch (error) {
    console.error("Error creating sorting list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update a users sorting list
export const updateUserSortList = async (req, res) => {
  const { currentUserUserName, currentListName, updatedListName } = req.body;
  if (!currentUserUserName || !currentListName || !updatedListName) {
    return res
      .status(400)
      .json({ message: "Sender or List Name fields not found!" });
  }
  try {
    // Check if the updatedListName already exists in other chatSortList items to prevent duplicates
    const duplicateNameCheck = await User.findOne({
      userName: currentUserUserName,
      "chatSortList.listName": {
        $regex: new RegExp(`^${updatedListName}$`, "i"),
      },
    });

    if (duplicateNameCheck) {
      return res
        .status(400)
        .json({ message: "Updated List Name already taken" });
    }

    // Use updateOne to update the specific listName in chatSortList
    const result = await User.updateOne(
      {
        userName: currentUserUserName,
        "chatSortList.listName": currentListName,
      },
      { $set: { "chatSortList.$.listName": updatedListName } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "List not found" });
    }

    return res.status(200).json({ message: "List updated successfully", updatedListNameData: { currentListName, updatedListName} });
  } catch (error) {
    console.error("Error updating sorting list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// delete a users sorting list

export const deleteUserSortList = async (req, res) => {
  const { currentUserUserName, deleteListName } = req.query;
  if (!currentUserUserName || !deleteListName) {
    return res
      .status(400)
      .json({ message: "Sender or List Name fields not found!" });
  }
  try {
    // Use deleteOne to remove the specified list from chatSortList
    const result = await User.updateOne(
      { userName: currentUserUserName },
      { $pull: { chatSortList: { listName: deleteListName } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "List not found" });
    }

    return res.status(200).json({ message: "List deleted successfully", deletedListName: deleteListName });
  } catch (error) {
    console.error("Error deleting sorting list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// End connection with a user....
export const unfriendUser = async (req, res) => {

  
  try {
    const { currentUserUserName, unfriendUserUserName } = req.query;
  //console.log("currentUserUserName", currentUserUserName, "unfriendUserUserName", unfriendUserUserName);
  if (!currentUserUserName || !unfriendUserUserName) {
    return res
      .status(400)
      .json({ message: "Sender or Recipient fields not found!" });
  }
    // Find the current user and the user to be unfriended
    const currentUser = await User.findOne({ userName: currentUserUserName });
    const unfriendUser = await User.findOne({ userName: unfriendUserUserName });

    if (!currentUser || !unfriendUser) {
      return res.status(404).json({ error: "One or both users not found." });
    }

    // Step 1: Remove each other from the `friendList`
    currentUser.friendList = currentUser.friendList.filter(
      (friendId) => !friendId.equals(unfriendUser._id)
    );
    unfriendUser.friendList = unfriendUser.friendList.filter(
      (friendId) => !friendId.equals(currentUser._id)
    );

    // Step 2: Remove each other from the `privateChatList`
    const currentUserChatIndex = currentUser.privateChatList.findIndex(
      (chat) => chat.friendUsername === unfriendUser.userName
    );
    const unfriendUserChatIndex = unfriendUser.privateChatList.findIndex(
      (chat) => chat.friendUsername === currentUser.userName
    );

    // Store the private message ID for message deletion later
    const privateMessageId =
      currentUserChatIndex >= 0
        ? currentUser.privateChatList[currentUserChatIndex].privateMessageId
        : null;

    if (currentUserChatIndex >= 0)
      currentUser.privateChatList.splice(currentUserChatIndex, 1);
    if (unfriendUserChatIndex >= 0)
      unfriendUser.privateChatList.splice(unfriendUserChatIndex, 1);

    // Step 3: Remove each other from the `chatSortList`
    currentUser.chatSortList.forEach((list) => {
      list.members = list.members.filter(
        (memberId) => !memberId.equals(unfriendUser._id)
      );
    });
    unfriendUser.chatSortList.forEach((list) => {
      list.members = list.members.filter(
        (memberId) => !memberId.equals(currentUser._id)
      );
    });

    // Save both user documents after making modifications
    await currentUser.save();
    await unfriendUser.save();

    // Step 4: Delete the PrivateMessage document associated with the users
    if (privateMessageId) {
      await PrivateMessage.findByIdAndDelete(privateMessageId);

      // Step 5: Delete all Message documents linked to this private message conversation
      await Message.deleteMany({ privateMsgIdentifier: privateMessageId });
    }

    // Send a success response
    res.status(200).json({ message: "Unfriended successfully.", unfriendedUserUserName: unfriendUser.userName });
  } catch (error) {
    console.error("Error unfriending user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while unfriending the user." });
  }
};

// Add a User to a Specific Chat Sort List
export const addToChatSortList = async (req, res) => {
  try {
    const { currentUserUserName, addedUserUserName, listName } = req.body;
    if (!currentUserUserName || !addedUserUserName || !listName) {
      return res
        .status(400)
        .json({ message: "Sender or Recipient fields not found!" });
    }

    // Ensure listName isn't 'All Connected Users' for this operation
    if (listName === "All Connected Users") {
      return res.status(400).json({
        error: "'All Connected Users' cannot be modified directly.",
      });
    }

    // Fetch the current user and the user to be added
    const currentUser = await User.findOne({ userName: currentUserUserName });
    const addedUser = await User.findOne({ userName: addedUserUserName });

    if (!currentUser || !addedUser) {
      return res.status(404).json({ error: "One or both users not found." });
    }

    // Check if addedUser is already in 'All Connected Users'
    const allConnectedList = currentUser.chatSortList.find(
      (list) => list.listName === "All Connected Users"
    );

    if (
      !allConnectedList ||
      !allConnectedList.members.some((memberId) =>
        memberId.equals(addedUser._id)
      )
    ) {
      return res.status(400).json({
        error: "User to be added must be in 'All Connected Users' first.",
      });
    }

    // Find the requested list in currentUser's chatSortList, creating it if it doesn't exist
    let targetList = currentUser.chatSortList.find(
      (list) => list.listName === listName
    );

    if (!targetList) {
      targetList = { listName, members: [] };
      currentUser.chatSortList.push(targetList);
    }

    // Remove addedUser from any other list (excluding 'All Connected Users')
    currentUser.chatSortList.forEach((list) => {
      if (
        list.listName !== "All Connected Users" &&
        list.listName !== listName
      ) {
        list.members = list.members.filter(
          (memberId) => !memberId.equals(addedUser._id)
        );
      }
    });

    // Add addedUser to the requested listName, if not already there
    if (
      !targetList.members.some((memberId) => memberId.equals(addedUser._id))
    ) {
      targetList.members.push(addedUser._id);
    }

    // Save the updated user document
    await currentUser.save();

    res.status(200).json({
      message: `User ${addedUserUserName} successfully added to list '${listName}'.`,
      addedUserListData: {
        userName: addedUser.userName,
        listName: listName,
      },
    });
  } catch (error) {
    console.error("Error adding user to chatSortList:", error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the user to the list." });
  }
};


// Update An User's Profile Image
export const updateProfileImage = async (req, res) => {
  try {
    const {currentUserUserName, imageUrl} = req.body;
    if(!imageUrl || !currentUserUserName) return res.status(400).json({ message: "Username or Image url isn't provided!" });

    const user = await User.findOne({ userName: currentUserUserName });
    //console.log("user name: ", user.userName);
    //console.log("user profile image ", user.profileImage);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }


    user.profileImage = imageUrl;
   
    await user.save();
    //console.log("user profile Image after Update", user.profileImage);
    res.status(200).json({ message: "Profile Image Updated Successfully!", updatedProfileImage: user.profileImage });

  } catch (error) {
    res.status(500).json({ message: "An error occurred while updating the profile image." });
  }
}

// Change An User's Current Password
export const updatePassword = async (req, res) => {
  try {
    const { currentUserUserName, currentPassword, newPassword } = req.body;
    console.log( "username: ", currentUserUserName, "currentPassword: ",currentPassword,"currentPassword: ", newPassword)
    if(!currentUserUserName || !currentPassword || !newPassword){
      return res.status(400).json({ message: "Username or Current Password or New Password not found!" });
    }

    // Check if user exists
    const user = await User.findOne({ userName: currentUserUserName });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // Validate updated password requirements
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Updated password must be at least 8 characters long, include one uppercase letter, one number, and one special character.",
      });
    }

    // Hash and update password
    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "An error occurred while updating the password." });
  }
};