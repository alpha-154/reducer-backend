import User from "../models/user.model.js";
import Notifications from "../models/notification.model.js";
import dayjs from "dayjs";

// Controller to get user notifications
export const getUserNotifications = async (req, res) => {
  const { username } = req.params;

  // Validate that the username is provided
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    // Find user by username to get the userId
    const user = await User.findOne({ userName: username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the user's notifications document
    const notifications = await Notifications.findOne({ userId: user._id })
      .populate({
        path: "acceptedSentPrivateMessageRequest.userId",
        select: "_id userName profileImage",
      })
      .populate({
        path: "declinedSentPrivateMessageRequest.userId",
        select: "_id userName profileImage",
      })
      .populate({
        path: "acceptedSentGroupMessageRequest.groupId",
        select: "_id groupName groupImage",
      })
      .populate({
        path: "declinedSentGroupMessageRequest.groupId",
        select: "_id groupName groupImage",
      })
      .populate({
        path: "receivedPrivateMessageRequest.userId",
        select: "_id userName profileImage",
      })
      .populate({
        path: "receivedGroupJoinRequestAsAdmin.requestedUser",
        select: "_id userName profileImage",
      });

    if (!notifications) {
      return res
        .status(404)
        .json({ message: "No notifications found for this user" });
    }

    // Helper function to format date
    const formatDate = (date) => dayjs(date).format("DD/MM/YY - hh:mm A");

    // Format notifications into the specified structure
    const formattedNotifications = {
      acceptedSentPrivateMessageRequest: (
        notifications.acceptedSentPrivateMessageRequest || []
      ).map((request) => ({
        id: request.userId?._id,
        name: request.userId?.userName || "",
        image: request.userId?.profileImage || "",
        date: request.createdAt ? formatDate(request.createdAt) : "",
        index: request.userId?._id || "",
        isSeen: request.isSeen,
        isRead: request.isRead,
      })),
      declinedSentPrivateMessageRequest: (
        notifications.declinedSentPrivateMessageRequest || []
      ).map((request) => ({
        id: request.userId?._id,
        name: request.userId?.userName || "",
        image: request.userId?.profileImage || "",
        date: request.createdAt ? formatDate(request.createdAt) : "",
        index: request.userId?._id || "",
        isSeen: request.isSeen,
        isRead: request.isRead,
      })),
      acceptedSentGroupMessageRequest: (
        notifications.acceptedSentGroupMessageRequest || []
      ).map((request) => ({
        id: request.groupId?._id,
        name: request.groupId?.groupName || "",
        image: request.groupId?.groupImage || "",
        date: request.createdAt ? formatDate(request.createdAt) : "",
        index: request.groupId?._id || "",
        isSeen: request.isSeen,
        isRead: request.isRead,
      })),
      declinedSentGroupMessageRequest: (
        notifications.declinedSentGroupMessageRequest || []
      ).map((request) => ({
        id: request.groupId?._id,
        name: request.groupId?.groupName || "",
        image: request.groupId?.groupImage || "",
        date: request.createdAt ? formatDate(request.createdAt) : "",
        index: request.groupId?._id || "",
        isSeen: request.isSeen,
        isRead: request.isRead,
      })),
      receivedPrivateMessageRequest: (
        notifications.receivedPrivateMessageRequest || []
      ).map((request) => ({
        id: request.userId?._id,
        name: request.userId?.userName || "",
        image: request.userId?.profileImage || "",
        date: request.createdAt ? formatDate(request.createdAt) : "",
        index: request.userId?._id || "",
        isSeen: request.isSeen,
        isRead: request.isRead,
      })),
      receivedGroupJoinRequestAsAdmin: (
        notifications.receivedGroupJoinRequestAsAdmin || []
      ).flatMap((request) =>
        (request.requestedUser || []).map((eachUser) => ({
          id: eachUser.userId?._id,
          groupName: request.groupName || "",
          name: eachUser.userId?.userName || "",
          image: eachUser.userId?.profileImage || "",
          date: eachUser.createdAt ? formatDate(request.createdAt) : "",
          index: eachUser.userId?._id || "",
          isSeen: eachUser.isSeen,
          isRead: eachUser.isRead,
        }))
      ),
    };

    // Send the formatted response
    res.status(200).json({ notifications: formattedNotifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res
      .status(500)
      .json({
        message: "An error occurred while fetching notifications",
        error: error.message,
      });
  }
};

// Controller to delete a specific notification
export const deleteUserNotification = async (req, res) => {
  const { currentUserUserName } = req.params; // User ID passed in the URL
  const { notificationType, notificationIndex } = req.body; // Data passed in the request body

  if (
    !currentUserUserName ||
    !notificationType ||
    notificationIndex === undefined
  ) {
    return res.status(400).json({ message: "Invalid request parameters." });
  }

  try {
    // Find user by username to get the userId
    const user = await User.findOne({ userName: currentUserUserName });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Find the user's notification document
    const notifications = await Notifications.findOne({ userId: user._id });

    if (!notifications || !notifications[notificationType]) {
      return res.status(404).json({ message: "Notification not found." });
    }

    // Check if the index is within the bounds of the array
    if (
      notificationIndex < 0 ||
      notificationIndex >= notifications[notificationType].length
    ) {
      return res.status(400).json({ message: "Invalid notification index." });
    }

    // Remove the notification at the specified index
    notifications[notificationType].splice(notificationIndex, 1);

    // Save the updated notifications document
    await notifications.save();

    res
      .status(200)
      .json({
        message: "Notification deleted!",
        notificationType,
        notificationIndex,
      });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res
      .status(500)
      .json({
        message: "An error occurred while deleting the notification.",
        error: error.message,
      });
  }
};

//Controller to mark notification(s) as seen
export const markNotificationAsSeen = async (req, res) => {
  const { currentUserUserName } = req.body;

  if (!currentUserUserName) {
    return res
      .status(400)
      .json({ message: "currentUserUserName is required." });
  }

  try {
    // Find the user based on the provided username
    const user = await User.findOne({ userName: currentUserUserName });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const userId = user._id;

    // Update only notifications with `isSeen: false`
    const result = await Notifications.findOneAndUpdate(
      { userId },
      {
        $set: {
          "acceptedSentPrivateMessageRequest.$[element].isSeen": true,
          "declinedSentPrivateMessageRequest.$[element].isSeen": true,
          "acceptedSentGroupMessageRequest.$[element].isSeen": true,
          "declinedSentGroupMessageRequest.$[element].isSeen": true,
          "receivedPrivateMessageRequest.$[element].isSeen": true,
          "receivedGroupJoinRequestAsAdmin.$[outer].requestedUser.$[inner].isSeen": true,
        },
      },
      {
        arrayFilters: [
          { "element.isSeen": false }, // Match elements with `isSeen: false` in single-level arrays
          { "outer.requestedUser": { $exists: true } }, // Check for nested arrays
          { "inner.isSeen": false }, // Match elements with `isSeen: false` in nested arrays
        ],
        new: true,
      }
    );

    // console.log("updated notifications: ", result);

    if (!result) {
      return res
        .status(404)
        .json({ message: "No notifications found for the user." });
    }

    return res.status(200).json({
      message: "Unseen notifications have been marked as seen.",
      updatedNotifications: result,
    });
  } catch (error) {
    console.error("Error marking notifications as seen:", error);
    return res.status(500).json({
      message: "An error occurred while processing the request.",
    });
  }
};

//Controller to mark a notification as read

// export const markNotificationAsRead = async (req, res) => {
//   const { currentUserUserName, notificationType, notificationIndex } = req.body;

//   // Validate the input
//   if (!currentUserUserName || !notificationType || !notificationIndex) {
//     return res.status(400).json({
//       error: "currentUserUserName, notificationType, and notificationIndex are required.",
//     });
//   }

//   try {
//     // Find the user by username
//     const user = await User.findOne({ userName: currentUserUserName });
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     const userId = user._id;

//     // Populate the required Notification fields
//     const notification = await Notifications.findOne({ userId })
//       .populate("acceptedSentPrivateMessageRequest.userId", "_id")
//       .populate("declinedSentPrivateMessageRequest.userId", "_id")
//       .populate("receivedPrivateMessageRequest.userId", "_id")
//       .populate("receivedGroupJoinRequestAsAdmin.requestedUser.userId", "_id")
//       .populate("acceptedSentGroupMessageRequest.groupId", "_id")
//       .populate("declinedSentGroupMessageRequest.groupId", "_id");

//     if (!notification) {
//       return res.status(404).json({ message: "No notifications found for the user." });
//     }

//     // Find and update the specific notification field
//     let updated = false;
//     const updatePath = notification[notificationType];

//     if (Array.isArray(updatePath)) {
//       // Handle flat arrays (userId/groupId at top level)
//       const index = updatePath.findIndex(
//         (item) =>
//           (item.userId && item.userId._id.toString() === notificationIndex) ||
//           (item.groupId && item.groupId._id.toString() === notificationIndex)
//       );

//       if (index !== -1 && !updatePath[index].isRead) {
//         notification[notificationType][index].isRead = true;
//         updated = true;
//       }
//     } else if (notificationType === "receivedGroupJoinRequestAsAdmin") {
//       // Handle nested arrays
//       for (let group of notification.receivedGroupJoinRequestAsAdmin) {
//         const userIndex = group.requestedUser.findIndex(
//           (user) => user.userId && user.userId._id.toString() === notificationIndex
//         );
//         if (userIndex !== -1 && !group.requestedUser[userIndex].isRead) {
//           group.requestedUser[userIndex].isRead = true;
//           updated = true;
//           break;
//         }
//       }
//     }

//     if (!updated) {
//       return res.status(404).json({
//         message: "Notification not found or already marked as read.",
//       });
//     }

//     // Save the updated document
//     await notification.save();

//     return res.status(200).json({
//       message: "Notification has been marked as read.",
//     });
//   } catch (error) {
//     console.error("Error marking notification as read:", error);
//     return res.status(500).json({
//       message: "An error occurred while processing the request.",
//     });
//   }
// };
