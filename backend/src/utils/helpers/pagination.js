/**
 * Optional paging for list endpoints that return a plain array.
 *
 *   GET /payments                 -> every record, exactly as before
 *   GET /payments?page=2&limit=50 -> records 51-100, plus headers:
 *                                    X-Total-Count, X-Page, X-Limit, X-Total-Pages
 *
 * Paging is opt-in so screens that still load the whole list keep working. The totals travel in
 * headers (not in the body) so the response body stays the same array in both cases.
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const isGiven = (value) => value !== undefined && value !== null && value !== "";

/** Read `page` and `limit` from a query object. `paged` is false when neither was sent. */
const parsePaging = (query = {}) => {
  if (!isGiven(query.page) && !isGiven(query.limit)) return { paged: false };
  let page = Number.parseInt(query.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);
  return { paged: true, page, limit, skip: (page - 1) * limit };
};

/** A copy of the query without the paging keys, for code that passes the query straight to a filter. */
const withoutPaging = (query = {}) => {
  const { page, limit, ...rest } = query; // eslint-disable-line no-unused-vars
  return rest;
};

/** Attach paging details to an array without changing how the array is serialised. */
const attachPaging = (rows, { page, limit, total }) => {
  Object.defineProperty(rows, "paging", {
    value: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    enumerable: false,
  });
  return rows;
};

/**
 * Run a list query with optional paging.
 *   buildFind: () => a fresh Mongoose query (already sorted); paging adds skip/limit to it
 *   count:     () => the total number of matching records
 */
const runPaged = async (buildFind, count, filters = {}) => {
  const p = parsePaging(filters);
  if (!p.paged) return buildFind();
  const [rows, total] = await Promise.all([buildFind().skip(p.skip).limit(p.limit), count()]);
  return attachPaging(rows, { page: p.page, limit: p.limit, total });
};

/** Set the paging response headers when the result carries paging details. */
const sendPagingHeaders = (res, rows) => {
  const paging = rows && rows.paging;
  if (!paging) return;
  res.set({
    "X-Total-Count": String(paging.total),
    "X-Page": String(paging.page),
    "X-Limit": String(paging.limit),
    "X-Total-Pages": String(paging.totalPages),
  });
};

module.exports = { DEFAULT_LIMIT, MAX_LIMIT, parsePaging, withoutPaging, attachPaging, runPaged, sendPagingHeaders };
