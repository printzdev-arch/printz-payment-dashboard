# API reference (Swagger / OpenAPI 3)

Served at `/api-docs` (UI) and `/api-docs.json` (spec).

```
docs/swagger/
  index.js               builds the document
  modules/*.docs.js      one file per business area: { tags, schemas, paths }
  components/            shared schemas, error responses, parameters
  examples/
    endpoint.examples.js   request bodies keyed "METHOD /path" (verified against the API)
    payload.examples.js    older schema-level examples
  lib/
    openapi.js           helpers for writing module files (jsonBody, okResponse, errors, ...)
    tags.js              URL prefix -> tag table and tag descriptions
    enrich.js            lists every Express route that has no hand-written entry
```

## Adding or changing an endpoint

1. Describe it in the module file for its area (`modules/sale-orders.docs.js` is the model to copy).
2. Use `errors(401, 403, 404, ...)` for error responses; the standard ones are added automatically.
3. Put a working request body in `examples/endpoint.examples.js`.
4. Run the check below.

Routes that are not described by hand still appear, generated from the code (path and query parameters and
the express-validator fields). They carry `x-generated: true`; replace them with a hand-written entry to give
them proper schemas and descriptions.

## Signing in from Swagger UI

`POST /auth/login` issues the `accessToken` and `refreshToken`. Paste the `accessToken` into **Authorize**.
