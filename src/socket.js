// Todo: add  <winston></winston> logger instead of console.log for debug purposes.

const onlineUsers = new Map(); // A map to store active users with their usernames and socket IDs
const userRooms = new Map(); // Map to track which rooms users are in (e.g., private or group)

export function setupSocket(io) {
  console.log("Socket setup started");

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    // Register user for online status
    socket.on("register", (userName) => {
      console.log(`Registering user: ${userName} with socket ID: ${socket.id}`);
      onlineUsers.set(userName, socket.id);
      console.log("Current online users:", onlineUsers);
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
      const { privateMsgIdentifier } = data;
      if (!privateMsgIdentifier) {
        console.error(
          "Private message identifier is required for private messaging"
        );
        return;
      }

      //console.log(`Private message content: ${data.content}`);
      socket.to(privateMsgIdentifier).emit("privatemessage", data);
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
  socket.on("leaveRoom", ({ roomIdentifier }) => {
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
      const { recipientUserName } = notificationPayload;

      if (onlineUsers.has(recipientUserName)) {
        const recipientSocketId = onlineUsers.get(recipientUserName);
        socket
          .to(recipientSocketId)
          .emit("newNotification", notificationPayload);
      } else {
        console.log(
          `User ${recipientUserName} is offline. Notification will be stored.`
        );
        // Add logic to store notification for offline users
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected from socket:", socket.id);

      // Remove user from onlineUsers map
      onlineUsers.forEach((value, key) => {
        if (value === socket.id) {
          onlineUsers.delete(key);
        }
      });

      // Remove user from userRooms map
      userRooms.delete(socket.id);

      console.log("Updated online users:", onlineUsers);
    });
  });
}
