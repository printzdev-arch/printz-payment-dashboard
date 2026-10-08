const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const designerRatingService = require("../../../application/services/sla/designerRating.service");
const DesignerRatingDto = require("../../../application/dto/sla/DesignerRatingDto");

const createRating = asyncHandler(async (req, res) => {
  const ratingDoc = await designerRatingService.create(req.params.id, req.body, req.user);
  return ResponseHelper.created(
    res,
    "Designer rating submitted successfully",
    DesignerRatingDto.toResponse(ratingDoc)
  );
});

const listRatings = asyncHandler(async (req, res) => {
  const ratings = await designerRatingService.list(req.query, req.user);
  return ResponseHelper.ok(
    res,
    "Designer ratings retrieved successfully",
    DesignerRatingDto.toResponseList(ratings)
  );
});

module.exports = {
  createRating,
  listRatings,
};
