/**
 * ResponseHelper
 * Standardized API response formatter for the presentation layer.
 */
class ResponseHelper {
  static send(res, statusCode, success, message, data = null, meta = null, code = null, details = null) {
    const payload = {
      success,
      message,
    };

    if (data !== null) {
      payload.data = data;

      if (Array.isArray(data)) {
        payload.items = data;
      } else if (typeof data === "object") {
        const obj = typeof data.toObject === "function" ? data.toObject() : data;

        if (obj.customerCode !== undefined || (obj.name && obj.mobile)) {
          payload.customer = data;
        }
        if (obj.jobNo !== undefined) {
          payload.job = data;
          payload.jobOrder = data;
        }
        if (obj.estimateNo !== undefined) {
          payload.estimate = data;
        }
        if (obj.productionNo !== undefined) {
          payload.productionOrder = data;
        }
        if (obj.checkType !== undefined || obj.defects !== undefined) {
          payload.qualityCheck = data;
        }
        if (obj.reprintNo !== undefined || obj.reprintRequestId !== undefined) {
          payload.reprintRequest = data;
        }

        for (const [k, v] of Object.entries(obj)) {
          if (payload[k] === undefined) {
            payload[k] = v;
          }
        }
      }
    }

    if (meta !== null) {
      payload.meta = meta;
      if (typeof meta === "object") {
        if (meta.total !== undefined && payload.total === undefined) payload.total = meta.total;
        if (meta.page !== undefined && payload.page === undefined) payload.page = meta.page;
        if (meta.limit !== undefined && payload.limit === undefined) payload.limit = meta.limit;
        if (meta.totalPages !== undefined && payload.totalPages === undefined) payload.totalPages = meta.totalPages;
      }
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

  static created(res, dataOrMessage = null, messageOrData = "Resource created successfully") {
    let data = dataOrMessage;
    let message = messageOrData;
    if (typeof dataOrMessage === "string" && (typeof messageOrData !== "string" && messageOrData !== undefined)) {
      data = messageOrData;
      message = dataOrMessage;
    }
    return this.send(res, 201, true, message, data);
  }

  static paginated(res, items = [], total = 0, page = 1, limit = 10, message = "Data retrieved successfully") {
    let finalTotal = total;
    let finalPage = page;
    let finalLimit = limit;
    let finalMessage = message;

    if (typeof total === "object" && total !== null) {
      finalTotal = total.total ?? 0;
      finalPage = total.page ?? 1;
      finalLimit = total.limit ?? 10;
      finalMessage = typeof page === "string" ? page : message;
    }

    const numLimit = Number(finalLimit) > 0 ? Number(finalLimit) : 10;
    const totalPages = Math.ceil(Number(finalTotal) / numLimit) || 1;
    return this.send(res, 200, true, finalMessage, items, {
      total: Number(finalTotal),
      page: Number(finalPage),
      limit: numLimit,
      totalPages,
    });
  }

  static badRequest(res, message = "Bad Request", code = "BAD_REQUEST", details = null) {
    return this.send(res, 400, false, message, null, null, code, details);
  }

  static unauthorized(res, message = "Unauthorized", code = "UNAUTHORIZED", details = null) {
    return this.send(res, 401, false, message, null, null, code, details);
  }

  static forbidden(res, message = "Forbidden", code = "FORBIDDEN", details = null) {
    return this.send(res, 403, false, message, null, null, code, details);
  }

  static notFound(res, message = "Resource not found", code = "NOT_FOUND", details = null) {
    return this.send(res, 404, false, message, null, null, code, details);
  }

  static error(res, message = "An error occurred", statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    return this.send(res, statusCode, false, message, null, null, code, details);
  }
}

module.exports = ResponseHelper;
