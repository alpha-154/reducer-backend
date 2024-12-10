import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isGroupMsg: {
      type: Boolean,
      required: true,
    },
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    senderProfileImage: {
      type: String,
    },
    groupMsgIdentifier: {
      type: Schema.Types.ObjectId,
      ref: "Group", 
    },
    privateMsgIdentifier: {
      type: Schema.Types.ObjectId,
      ref: "PrivateMessage", 
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
