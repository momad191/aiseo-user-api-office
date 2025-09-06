import { Request, Response } from "express";
import { userQueue } from "../queue/userQueue";
import { QueueEvents } from "bullmq";

// ✅ Create QueueEvents for listening to job lifecycle events
const userQueueEvents = new QueueEvents("user-queue");

export async function getUser(req: Request, res: Response) {
  const userId = req.params.id;

  try {
    // Add job to the queue
    const job = await userQueue.add("fetch-user", { userId });
    // ✅ Wait until finished using QueueEvents, not Redis
    const result = await job.waitUntilFinished(userQueueEvents);
    res.json(result);
  } catch (err) {
    console.error("Error processing job:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}
