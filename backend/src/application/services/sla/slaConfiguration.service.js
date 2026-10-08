const slaConfigurationRepository = require("../../../infrastructure/database/mongoose/repositories/sla/SlaConfigurationRepository");
const MongoProductionStateRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionStateRepository");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class SlaConfigurationService {
  /**
   * List SLA configurations with optional filters
   */
  async list(filters = {}) {
    const query = {};
    if (filters.stage) query.stage = filters.stage;
    if (filters.jobType !== undefined && filters.jobType !== "") {
      query.jobType = filters.jobType === "null" ? null : filters.jobType;
    }
    if (filters.isActive !== undefined && filters.isActive !== "") {
      query.isActive = filters.isActive === "true" || filters.isActive === true;
    }

    return slaConfigurationRepository.find(query);
  }

  /**
   * Get single SLA configuration by ID
   */
  async getById(id) {
    const config = await slaConfigurationRepository.findById(id);
    if (!config) {
      throw ErrorHelper.notFound("SLA Configuration not found");
    }
    return config;
  }

  /**
   * Create SLA configuration
   */
  async create(data, user = null) {
    const { stage, jobType = null, priority = null, targetMinutes, warningMinutes } = data;

    if (!stage || !targetMinutes || warningMinutes === undefined) {
      throw ErrorHelper.badRequest("stage, targetMinutes, and warningMinutes are required");
    }

    const normJobType = jobType || null;
    const normPriority = priority || null;

    // Check for existing active configuration with exact match
    const existing = await slaConfigurationRepository.findOne({
      stage,
      jobType: normJobType,
      priority: normPriority,
      isActive: true,
    });

    if (existing) {
      const err = new Error("DUPLICATE: An active SLA configuration already exists for this stage, jobType, and priority");
      err.status = 409;
      err.statusCode = 409;
      throw err;
    }

    const config = await slaConfigurationRepository.create({
      stage,
      jobType: normJobType,
      priority: normPriority,
      targetMinutes: Number(targetMinutes),
      warningMinutes: Number(warningMinutes),
      isActive: true,
    });

    // Audit log
    await MongoProductionStateRepository.createAuditLog({
      action: "CONFIGURATION_CREATE",
      resource: "SLA_CONFIGURATION",
      resourceId: config._id,
      userId: user?._id || user?.id || null,
      userName: user?.name || "System",
      userRole: user?.role || "",
      branchId: user?.branchId || null,
      details: {
        actor: user?.email || user?.name || "System",
        configurationId: config._id,
        created: {
          stage: config.stage,
          jobType: config.jobType,
          priority: config.priority,
          targetMinutes: config.targetMinutes,
          warningMinutes: config.warningMinutes,
        },
        timestamp: new Date(),
      },
    });

    return config;
  }

  /**
   * Update SLA configuration
   */
  async update(id, updateData, user = null) {
    const current = await slaConfigurationRepository.findById(id);
    if (!current) {
      throw ErrorHelper.notFound("SLA Configuration not found");
    }

    const beforeState = {
      stage: current.stage,
      jobType: current.jobType,
      priority: current.priority,
      targetMinutes: current.targetMinutes,
      warningMinutes: current.warningMinutes,
      isActive: current.isActive,
    };

    const nextStage = updateData.stage || current.stage;
    const nextJobType = updateData.jobType !== undefined ? updateData.jobType : current.jobType;
    const nextPriority = updateData.priority !== undefined ? updateData.priority : current.priority;
    const nextIsActive = updateData.isActive !== undefined ? updateData.isActive : current.isActive;

    if (nextIsActive) {
      const duplicate = await slaConfigurationRepository.findOne({
        _id: { $ne: id },
        stage: nextStage,
        jobType: nextJobType || null,
        priority: nextPriority || null,
        isActive: true,
      });

      if (duplicate) {
        const err = new Error("DUPLICATE: An active SLA configuration already exists for this stage, jobType, and priority");
        err.status = 409;
        err.statusCode = 409;
        throw err;
      }
    }

    const updated = await slaConfigurationRepository.update(id, updateData);

    // Audit log
    await MongoProductionStateRepository.createAuditLog({
      action: "CONFIGURATION_CHANGE",
      resource: "SLA_CONFIGURATION",
      resourceId: updated._id,
      userId: user?._id || user?.id || null,
      userName: user?.name || "System",
      userRole: user?.role || "",
      branchId: user?.branchId || null,
      details: {
        actor: user?.email || user?.name || "System",
        configurationId: updated._id,
        before: beforeState,
        after: {
          stage: updated.stage,
          jobType: updated.jobType,
          priority: updated.priority,
          targetMinutes: updated.targetMinutes,
          warningMinutes: updated.warningMinutes,
          isActive: updated.isActive,
        },
        timestamp: new Date(),
      },
    });

    return updated;
  }

  /**
   * Deactivate SLA configuration
   */
  async deactivate(id, user = null) {
    const current = await slaConfigurationRepository.findById(id);
    if (!current) {
      throw ErrorHelper.notFound("SLA Configuration not found");
    }

    const updated = await slaConfigurationRepository.deactivate(id);

    // Audit log
    await MongoProductionStateRepository.createAuditLog({
      action: "CONFIGURATION_CHANGE",
      resource: "SLA_CONFIGURATION",
      resourceId: updated._id,
      userId: user?._id || user?.id || null,
      userName: user?.name || "System",
      userRole: user?.role || "",
      branchId: user?.branchId || null,
      details: {
        actor: user?.email || user?.name || "System",
        configurationId: updated._id,
        before: { isActive: true },
        after: { isActive: false },
        timestamp: new Date(),
      },
    });

    return updated;
  }
}

module.exports = new SlaConfigurationService();
