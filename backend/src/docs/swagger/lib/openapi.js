/**
 * Small helpers that keep the module doc files short and consistent.
 * Every module file only describes its own endpoints; envelopes, errors and shared
 * parameters live in components/ and are referenced from here.
 */
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });
const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });

const jsonBody = (schemaName, { example, required = true, description } = {}) => ({
  required,
  ...(description ? { description } : {}),
  content: { "application/json": { schema: schemaRef(schemaName), ...(example ? { example } : {}) } },
});

/** 2xx response wrapped in the standard { success, message, data } envelope. */
const okResponse = (description, dataSchemaName, example) => ({
  description,
  content: {
    "application/json": {
      schema: dataSchemaName
        ? { allOf: [schemaRef("ApiSuccessResponse"), { type: "object", properties: { data: schemaRef(dataSchemaName) } }] }
        : schemaRef("ApiSuccessResponse"),
      ...(example ? { example } : {}),
    },
  },
});

const pagedResponse = (description, itemSchemaName) => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          schemaRef("ApiSuccessResponse"),
          {
            type: "object",
            properties: { data: { type: "array", items: schemaRef(itemSchemaName) }, meta: schemaRef("PaginationMeta") },
          },
        ],
      },
    },
  },
});

/** Error responses by HTTP status, pointing at the shared components. */
const STATUS_RESPONSE = {
  400: "BadRequest",
  401: "Unauthorized",
  403: "Forbidden",
  404: "NotFound",
  409: "Conflict",
  422: "Unprocessable",
  429: "TooManyRequests",
  500: "ServerError",
};
const errors = (...codes) => Object.fromEntries(codes.map((c) => [c, responseRef(STATUS_RESPONSE[c])]));

const pathId = (name = "id", description = "Record id (24-character MongoDB ObjectId)") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: schemaRef("ObjectId"),
});

module.exports = { schemaRef, responseRef, paramRef, jsonBody, okResponse, pagedResponse, errors, pathId };
