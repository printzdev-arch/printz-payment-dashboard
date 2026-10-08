const JobOrder = require("../../../infrastructure/database/mongoose/models/job-order/JobOrder");
const Notification = require("../../../infrastructure/database/mongoose/models/Notification");
const User = require("../../../infrastructure/database/mongoose/models/User");
const SlaService = require("./sla.service");

class SlaSchedulerService {
  constructor() {
    this.intervalHandle = null;
    this.INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the 5-minute background SLA evaluation scheduler
   */
  startScheduler() {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      this.evaluateAndNotifyOpenJobs().catch((err) => {
        console.error("[SlaSchedulerService] Error evaluating open jobs:", err);
      });
    }, this.INTERVAL_MS);

    // Initial trigger non-blocking
    setTimeout(() => {
      this.evaluateAndNotifyOpenJobs().catch(() => {});
    }, 5000);
  }

  /**
   * Stop the scheduler (e.g. for graceful shutdown / tests)
   */
  stopScheduler() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Evaluate open jobs and dispatch deduplicated SLA approaching/breached alerts
   */
  async evaluateAndNotifyOpenJobs() {
    const openJobs = await JobOrder.find({
      status: { $nin: ["DELIVERED", "CANCELLED"] },
    })
      .select("_id jobNo branchId designerId status currentStage customerSnapshot")
      .lean();

    if (!openJobs.length) return { processed: 0, notificationsSent: 0 };

    // Fetch managers and admins for alerting
    const managersAndAdmins = await User.find({
      role: { $in: ["admin", "manager"] },
      isActive: { $ne: false },
    })
      .select("_id role branchId")
      .lean();

    let notificationsSent = 0;

    for (const job of openJobs) {
      try {
        const evalResult = await SlaService.evaluate(job._id);

        for (const seg of evalResult.segments) {
          if (seg.isClosed || !["APPROACHING", "BREACHED"].includes(seg.state)) {
            continue;
          }

          const notificationType =
            seg.state === "APPROACHING" ? "SLA_APPROACHING" : "SLA_BREACHED";

          const title =
            seg.state === "APPROACHING"
              ? `⚠️ SLA Approaching: ${seg.stage} (${job.jobNo})`
              : `🚨 SLA Breached: ${seg.stage} (${job.jobNo})`;

          const message =
            seg.state === "APPROACHING"
              ? `Job [${job.jobNo}] stage [${seg.stage}] is approaching SLA limit. Remaining: ${seg.remainingMinutes} min (Target: ${seg.targetMinutes} min).`
              : `Job [${job.jobNo}] stage [${seg.stage}] has breached SLA. Elapsed: ${seg.elapsedMinutes} min (Target: ${seg.targetMinutes} min).`;

          // Deduplication: Check if notification already exists for type + entityId + stage identifier
          const stageIdentifier = `[${seg.stage}]`;
          const existing = await Notification.findOne({
            entityId: job._id,
            type: notificationType,
            message: { $regex: stageIdentifier },
          });

          if (existing) {
            continue; // Already notified for this stage & state
          }

          // Build recipient user IDs
          const recipientIds = new Set();

          // 1. Designer / Operator
          if (job.designerId) {
            recipientIds.add(String(job.designerId));
          }

          // 2. Branch Managers
          for (const u of managersAndAdmins) {
            if (u.role === "manager") {
              if (!job.branchId || String(u.branchId) === String(job.branchId)) {
                recipientIds.add(String(u._id));
              }
            } else if (u.role === "admin" && seg.state === "BREACHED") {
              // 3. Admins (on breach)
              recipientIds.add(String(u._id));
            }
          }

          // Create notifications
          for (const rId of recipientIds) {
            await Notification.create({
              userId: rId,
              branchId: job.branchId || null,
              title,
              message,
              type: notificationType,
              entityType: "JOB_ORDER",
              entityId: job._id,
              isRead: false,
            });
            notificationsSent++;
          }
        }
      } catch (err) {
        // Continue processing other jobs
      }
    }

    return { processed: openJobs.length, notificationsSent };
  }
}

module.exports = new SlaSchedulerService();
