import { Queue, Worker, Job } from "bullmq";

const connection = { host: "127.0.0.1", port: 6379 };

// Create queue
export const userQueue = new Queue("user-queue", { connection });

// Worker that processes jobs
new Worker(
  "user-queue",
  async (job: Job) => {
    const { userId } = job.data;

    console.log(`[Worker] Processing userId=${userId}`);

    // Simulate DB call latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      userId,
      name: "John Doe",
      fetchedAt: new Date().toISOString(),
    };
  },
  { connection }
);
