import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// Daily cron job to reset quotas for users whose reset date has passed
// Runs every day at 2:00 AM UTC to handle quota resets proactively
crons.cron(
  "daily-quota-reset",
  "0 2 * * *", // Every day at 2:00 AM UTC
  internal.users.resetExpiredQuotas
);

// Daily cron job to process expired cancelled subscriptions
// Runs every day at 6:00 AM UTC to downgrade users after grace period ends
crons.cron(
  "process-expired-subscriptions",
  "0 6 * * *", // Every day at 6:00 AM UTC
  api.subscriptions.processExpiredSubscriptions
);

export default crons;