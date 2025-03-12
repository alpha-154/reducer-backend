import User from "../models/user.model.js";
import Daily from "../models/dailyTask.model.js";

// Create a new daily task
export const createDailyTask = async (req, res) => {
  try {
    
    const { userId, taskData } = req.body;

    const { time, title, description, links, completed } = taskData; 

    if (!userId || !time || !title || !description || !links) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const newTask = new Daily({
      time,
      title,
      description,
      links,
      completed: completed || false,
    });

    await newTask.save();
    user.dailyTask.push(newTask._id);
    await user.save();

    return res.status(201).json({ message: "Task created successfully.", task: newTask });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Delete a daily task
export const deleteDailyTask = async (req, res) => {
  try {
    const { userId, taskId } = req.body;

    if (!userId || !taskId) {
      return res.status(400).json({ error: "userId and taskId are required." });
    }
    const user = await User.findById(userId);
if (!user) {
  return res.status(404).json({ error: "User not found." });
}


    const deletedTask = await Daily.findOneAndDelete({ _id: taskId });
  

    if (!deletedTask) {
      return res.status(404).json({ error: "Task not found or already deleted." });
    }
    await User.findByIdAndUpdate(userId, { $pull: {dailyTask: taskId}});

    return res.status(200).json({ message: "Task deleted successfully.", taskId: deletedTask._id });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Mark a daily task as completed
export const markTaskAsComplete = async (req, res) => {
  try {
    const { userId, taskId, completed } = req.body;

    if (!userId || !taskId || typeof completed !== "boolean") {
      return res.status(400).json({ error: "userId, taskId, and completed status are required." });
    }

    const updatedTask = await Daily.findByIdAndUpdate(
      taskId,
      { completed },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    return res.status(200).json({ message: "Task status updated successfully.", taskId: updatedTask._id });
  } catch (error) {
    console.error("Error updating task status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Get all daily tasks for a user
export const getAllDailyTasks = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const user = await User.findById(userId).populate("dailyTask");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ message: "Tasks fetched successfully.", tasks: user.dailyTask });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};