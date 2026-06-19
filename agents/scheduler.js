const cron = require('node-cron');

class TaskScheduler {
  constructor() {
    this.jobs = new Map();
    this.jobId = 0;
  }

  schedule(cronExpression, taskName, callback) {
    const id = ++this.jobId;
    const job = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Running scheduled task: ${taskName}`);
      try {
        await callback();
      } catch (error) {
        console.error(`[Scheduler] Task ${taskName} failed:`, error.message);
      }
    }, { scheduled: true });

    this.jobs.set(id, { id, name: taskName, expression: cronExpression, job });
    return id;
  }

  scheduleInterval(minutes, taskName, callback) {
    return this.schedule(`*/${minutes} * * * *`, taskName, callback);
  }

  scheduleDaily(hour, minute, taskName, callback) {
    return this.schedule(`${minute} ${hour} * * *`, taskName, callback);
  }

  cancel(id) {
    const scheduled = this.jobs.get(id);
    if (scheduled) {
      scheduled.job.stop();
      this.jobs.delete(id);
      return true;
    }
    return false;
  }

  list() {
    return Array.from(this.jobs.values()).map(j => ({
      id: j.id,
      name: j.name,
      expression: j.expression
    }));
  }
}

module.exports = TaskScheduler;
