import mongoose, { Schema } from "mongoose";

const notificationsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    acceptedSentPrivateMessageRequest: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User", // Reference to User documents
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        // isRead: {
        //   type: Boolean,
        //   default: false,
        // },
      },
    ],
    declinedSentPrivateMessageRequest: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        // isRead: {
        //   type: Boolean,
        //   default: false,
        // },
      },
    ],
    acceptedSentGroupMessageRequest: [
      {
        groupId: {
          type: Schema.Types.ObjectId,
          ref: "Group",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        // isRead: {
        //   type: Boolean,
        //   default: false,
        // },
      },
    ],
    declinedSentGroupMessageRequest: [
      {
        groupId: {
          type: Schema.Types.ObjectId,
          ref: "Group",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        // isRead: {
        //   type: Boolean,
        //   default: false,
        // },
      },
    ],
    receivedPrivateMessageRequest: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        // isRead: {
        //   type: Boolean,
        //   default: false,
        // },
      },
    ],
    receivedGroupJoinRequestAsAdmin: [
      {
        groupName: {
          type: String,
        },
        requestedUser: [
          {
            userId: {
              type: Schema.Types.ObjectId,
              ref: "User",
            },
            isSeen: {
              type: Boolean,
              default: false,
            },
            // isRead: {
            //   type: Boolean,
            //   default: false,
            // },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const Notifications = mongoose.model("Notification", notificationsSchema);
export default Notifications;
