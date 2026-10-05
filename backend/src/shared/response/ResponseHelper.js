/**
 * ResponseHelper
 * Standardized API response format helper.
 */
class ResponseHelper {
  static send(res, statusCode, success, message, data = null, meta = null, code = null, details = null) {
    const payload = {
      success,
      message,
    };

    if (data !== null) {
      payload.data = data;
    }

    if (meta !== null) {
      payload.meta = meta;
    }

    if (code !== null) {
      payload.code = code;
    }

    if (details !== null) {
      payload.details = details;
    }

    return res.status(statusCode).json(payload);
  }

  static success(res, data = null, message = "Success", statusCode = 200, meta = null) {
    return this.send(res, statusCode, true, message, data, meta);
  }

  static ok(res, message = "Success", data = null, meta = null) {
    return this.send(res, 200, true, message, data, meta);
  }

  static created(res, data = null, message = "Resource created successfully") {
    return this.send(res, 201, true, message, data);
  }

  static paginated(res, items = [], total = 0, page = 1, limit = 10, message = "Data retrieved successfully") {
    const totalPages = Math.ceil(total / limit) || 1;
    return this.send(res, 200, true, message, items, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    });
  }

  static error(res, message = "An error occurred", statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    return this.send(res, statusCode, false, message, null, null, code, details);
  }
}

module.exports = ResponseHelper;
