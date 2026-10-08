const ErrorHelper = require("../../../shared/errors/ErrorHelper");

const createSlaConfigValidator = (req, res, next) => {
  const { stage, targetMinutes, warningMinutes, priority } = req.body;

  if (!stage || typeof stage !== "string" || !stage.trim()) {
    return next(ErrorHelper.badRequest("Stage is required and must be a non-empty string."));
  }

  if (targetMinutes === undefined || targetMinutes === null || Number(targetMinutes) <= 0 || !Number.isInteger(Number(targetMinutes))) {
    return next(ErrorHelper.badRequest("targetMinutes is required and must be a positive integer."));
  }

  if (warningMinutes === undefined || warningMinutes === null || Number(warningMinutes) < 0 || !Number.isInteger(Number(warningMinutes))) {
    return next(ErrorHelper.badRequest("warningMinutes is required and must be a non-negative integer."));
  }

  if (priority !== undefined && priority !== null && !["NORMAL", "URGENT"].includes(priority)) {
    return next(ErrorHelper.badRequest("Priority must be either 'NORMAL', 'URGENT', or null."));
  }

  next();
};

const updateSlaConfigValidator = (req, res, next) => {
  const { targetMinutes, warningMinutes, priority } = req.body;

  if (targetMinutes !== undefined && (Number(targetMinutes) <= 0 || !Number.isInteger(Number(targetMinutes)))) {
    return next(ErrorHelper.badRequest("targetMinutes must be a positive integer."));
  }

  if (warningMinutes !== undefined && (Number(warningMinutes) < 0 || !Number.isInteger(Number(warningMinutes)))) {
    return next(ErrorHelper.badRequest("warningMinutes must be a non-negative integer."));
  }

  if (priority !== undefined && priority !== null && !["NORMAL", "URGENT"].includes(priority)) {
    return next(ErrorHelper.badRequest("Priority must be either 'NORMAL', 'URGENT', or null."));
  }

  next();
};

const createDesignerRatingValidator = (req, res, next) => {
  const { rating, ratingSource } = req.body;

  const numRating = Number(rating);
  if (!rating || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return next(ErrorHelper.badRequest("Rating is required and must be an integer between 1 and 5."));
  }

  const validSources = ["CUSTOMER", "MANAGER", "ADMIN"];
  if (!ratingSource || !validSources.includes(ratingSource)) {
    return next(
      ErrorHelper.badRequest(
        `ratingSource is required and must be one of: ${validSources.join(", ")}.`
      )
    );
  }

  next();
};

const performanceTrendValidator = (req, res, next) => {
  const { interval } = req.query;

  if (!interval || !["week", "month"].includes(interval)) {
    return next(ErrorHelper.badRequest("interval query parameter is required and must be either 'week' or 'month'."));
  }

  next();
};

module.exports = {
  createSlaConfigValidator,
  updateSlaConfigValidator,
  createDesignerRatingValidator,
  performanceTrendValidator,
};
