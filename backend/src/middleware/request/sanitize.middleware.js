/**
 * Removes MongoDB operator keys ("$ne", "$gt", "$where", ...) from the request body, query string and route
 * params, at any depth. Without this, a value such as { "email": { "$ne": null } } or ?status[$ne]=x could be
 * passed straight into a database filter (NoSQL injection). Legitimate requests never send keys that start
 * with "$", so nothing else is changed.
 */
const MAX_DEPTH = 12;

const stripOperators = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > MAX_DEPTH) return value;
  if (Buffer.isBuffer(value) || value instanceof Date) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) value[i] = stripOperators(value[i], depth + 1);
    return value;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key === "__proto__" || key === "constructor" || key === "prototype") {
      delete value[key];
    } else {
      value[key] = stripOperators(value[key], depth + 1);
    }
  }
  return value;
};

const sanitizeRequest = (req, _res, next) => {
  stripOperators(req.body);
  stripOperators(req.query);
  stripOperators(req.params);
  next();
};

module.exports = { sanitizeRequest, stripOperators };
