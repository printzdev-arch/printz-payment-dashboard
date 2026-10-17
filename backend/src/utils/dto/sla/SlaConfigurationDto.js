class SlaConfigurationDto {
  static toResponse(doc) {
    if (!doc) return null;
    return {
      id: doc._id ? doc._id.toString() : doc.id,
      _id: doc._id ? doc._id.toString() : doc.id,
      stage: doc.stage,
      jobType: doc.jobType || null,
      priority: doc.priority || null,
      targetMinutes: Number(doc.targetMinutes),
      warningMinutes: Number(doc.warningMinutes),
      isActive: Boolean(doc.isActive),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(docs = []) {
    return docs.map((doc) => this.toResponse(doc));
  }
}

module.exports = SlaConfigurationDto;
