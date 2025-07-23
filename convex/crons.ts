import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily cron job to reset quotas for users whose reset date has passed
// Runs every day at 2:00 AM UTC to handle quota resets proactively
crons.cron(
  "daily-quota-reset",
  "0 2 * * *", // Every day at 2:00 AM UTC
  internal.users.resetExpiredQuotas
);

export default crons;