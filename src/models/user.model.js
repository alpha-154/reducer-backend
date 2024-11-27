import mongoose, { Schema } from "mongoose";
// Define the user schema
const userSchema = new Schema(
  {
    publicKey: {
      type: String,
      required: true,
      unique: true,
    },
    privateKey: {
      type: String,
      required: true,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    joinedGroupList: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    groupChatList: [
      {
        groupName: {
          type: String,
        },
        groupMessageId: {
          type: Schema.Types.ObjectId,
          ref: "Group",
        },
      },
    ],

    sentGroupJoinRequest:[
      {
        type: String,
      }
    ] ,
    friendList: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    privateChatList: [
      {
        friendUsername: {
          type: String,
        },
        privateMessageId: {
          type: Schema.Types.ObjectId,
          ref: "PrivateMessage",
        },
      },
    ],
    sentPrivateMessageRequest:[
      {
        type: String,
      }
    ] ,
    chatSortList: [
       {
          listName: {
            type: String,
          },
          members: [
            {
              type: Schema.Types.ObjectId,
              ref: "User",
            },
          ]
      }
    ],
    createdAt: {
      type: String,
    },
  },
  { timestamps: true }
);
// Define and export the model with the IUser interface
const User = mongoose.model("User", userSchema);
export default User;


