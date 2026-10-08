class DesignerRating {
  constructor({
    id = null,
    jobOrderId,
    designerId,
    rating,
    ratingSource = "CUSTOMER", // CUSTOMER, MANAGER, ADMIN
    comments = "",
    ratedBy,
    ratedAt = new Date(),
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.designerId = designerId;
    this.rating = Number(rating);
    this.ratingSource = ratingSource;
    this.comments = comments;
    this.ratedBy = ratedBy;
    this.ratedAt = ratedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = DesignerRating;
