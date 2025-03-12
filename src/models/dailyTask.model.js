import { Schema, model } from "mongoose";

const dailyTaskSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
  time: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: [
    {
      type: String,
      required: true,
    },
  ],
  links: [
    {
      type: String,
      required: true,
    },
  ],
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Daily = model("Daily", dailyTaskSchema);
export default Daily;
