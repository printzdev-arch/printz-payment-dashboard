class DesignerRatingDto {
  static toResponse(doc) {
    if (!doc) return null;
    return {
      id: doc._id ? doc._id.toString() : doc.id,
      _id: doc._id ? doc._id.toString() : doc.id,
      jobOrderId: doc.jobOrderId?._id || doc.jobOrderId,
      jobOrder: doc.jobOrderId && typeof doc.jobOrderId === "object" ? doc.jobOrderId : undefined,
      designerId: doc.designerId?._id || doc.designerId,
      designer: doc.designerId && typeof doc.designerId === "object" ? doc.designerId : undefined,
      rating: Number(doc.rating),
      ratingSource: doc.ratingSource,
      comments: doc.comments || "",
      ratedBy: doc.ratedBy?._id || doc.ratedBy,
      ratedByUser: doc.ratedBy && typeof doc.ratedBy === "object" ? doc.ratedBy : undefined,
      ratedAt: doc.ratedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(docs = []) {
    return docs.map((doc) => this.toResponse(doc));
  }
}

module.exports = DesignerRatingDto;
