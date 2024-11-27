import mongoose, { Schema } from "mongoose";
const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true,
      unique: true,
    },
    groupImage: {
      type: String,
      default: "",
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageList: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
const Group = mongoose.model("Group", groupSchema);
export default Group;
