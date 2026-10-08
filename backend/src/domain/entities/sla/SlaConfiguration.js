class SlaConfiguration {
  constructor({
    id = null,
    stage,
    jobType = null,
    priority = null,
    targetMinutes,
    warningMinutes,
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.stage = stage;
    this.jobType = jobType;
    this.priority = priority;
    this.targetMinutes = Number(targetMinutes);
    this.warningMinutes = Number(warningMinutes);
    this.isActive = Boolean(isActive);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = SlaConfiguration;
