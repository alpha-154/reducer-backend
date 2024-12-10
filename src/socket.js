// Todo: add  <winston></winston> logger instead of console.log for debug purposes.

export const onlineUsers = new Map(); // A map to store active users with their usernames and socket IDs
export const userRooms = new Map(); // Map to track which rooms users are in (e.g., private or group)

export function setupSocket(io) {
  console.log("Socket setup started");

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    // Register user for online status
    socket.on("register", (userId) => {
      console.log(`Registering user: ${userId} with socket ID: ${socket.id}`);
      onlineUsers.set(socket.id, userId);
      console.log("Current online users:", onlineUsers);

      // Notify all clients about the user's online status
      io.emit("userStatusUpdate", { userId, status: "online" });
    });

    // Join a room (private or group chat)
    socket.on("joinRoom", ({ roomIdentifier }) => {
      if (!roomIdentifier) {
        console.error("Room identifier is required to join a room");
        return;
      }

      // Leave any existing room and join the new one
      if (userRooms.has(socket.id)) {
        const previousRoom = userRooms.get(socket.id);
        socket.leave(previousRoom);
        console.log(`Socket ${socket.id} left room: ${previousRoom}`);
      }
      socket.join(roomIdentifier);
      userRooms.set(socket.id, roomIdentifier);

      console.log(`Socket ${socket.id} joined room: ${roomIdentifier}`);
    });

    // Handle private messages
    socket.on("privatemessage", (data) => {
      const { to, privateMsgIdentifier } = data;
      if (!privateMsgIdentifier) {
        console.error(
          "Private message identifier is required for private messaging"
        );
        return;
      }

      //emitting private message to the receiver user for real time update in the `Drawer` component
      //console.log(`Private message content: ${data.content}`);
      socket.to(privateMsgIdentifier).emit("privatemessage", data);

      //emitting private message to the receiver user for real time update in the `UserCard` component
      // while the receiver user isn't connected with the sender user in this private chat room
      // Find the socket ID of the recipient user by searching the onlineUsers map
      let recipientSocketId = null;
      onlineUsers.forEach((userId, socketId) => {
        if (userId === to) {
          recipientSocketId = socketId;
        }
      });

      if (recipientSocketId) {
        const recipientRoomIdentifier = userRooms.get(recipientSocketId);
        if (recipientRoomIdentifier !== privateMsgIdentifier) {
          // That's mean user is online but not connected in this private chat room with the sender
          socket.to(recipientSocketId).emit("realTimeMsgDataUpdate", data);
          console.log(
            `Private message sent to user ${to} (socket ID: ${recipientSocketId})`
          );
        }
      } else {
        console.log(`user ${to} is online & connected in this private chat socket room`);
      }
    });

    // Handle group messages
    socket.on("groupmessage", (data) => {
      const { groupMsgIdentifier } = data;
      if (!groupMsgIdentifier) {
        console.error(
          "Group message identifier is required for group messaging"
        );
        return;
      }

      //  console.log(`Group message content: ${data}`);
      socket.to(groupMsgIdentifier).emit("groupmessage", data);
    });

    // Leave a room
    socket.on("leaveRoom", ({ roomIdentifier}) => {
      if (!roomIdentifier) {
        console.error("Room identifier is required to leave the room");
        return;
      }

      // Leave the room and remove the user from the userRooms map
    
      socket.leave(roomIdentifier);
      userRooms.delete(socket.id);

      
      console.log(`Socket ${socket.id} left room: ${roomIdentifier}`);
    });

    // Handle notifications
    socket.on("newNotification", (notificationPayload) => {
      const { recipientUserId } = notificationPayload;

      // Find the socket ID of the recipient user by searching the onlineUsers map
      let recipientSocketId = null;
      onlineUsers.forEach((userId, socketId) => {
        if (userId === recipientUserId) {
          recipientSocketId = socketId;
        }
      });

      if (recipientSocketId) {
        // If the recipient is online, send the notification
        socket
          .to(recipientSocketId)
          .emit("newNotification", notificationPayload);
        console.log(
          `Notification sent to user ${recipientUserId} (socket ID: ${recipientSocketId})`
        );
      } else {
        console.log(
          `User ${recipientUserId} is offline. Notification will be stored.`
        );
        // Add logic to store the notification for offline users
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected from socket:", socket.id);

      const disconnectedUserId = onlineUsers.get(socket.id);

      // Remove user from onlineUsers map
      onlineUsers.forEach((value, key) => {
        if (key === socket.id) {
          onlineUsers.delete(key);
        }
      });

      // Notify all clients about the user's offline status
      if (disconnectedUserId) {
        io.emit("userStatusUpdate", {
          userId: disconnectedUserId,
          status: "offline",
        });
      }

      // Remove user from userRooms map
      userRooms.delete(socket.id);

      console.log("Updated online users:", onlineUsers);
    });
  });
}
