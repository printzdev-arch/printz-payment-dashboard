/**
 * Calls every operation in the Swagger document the way a person would from Swagger UI, using the
 * documented example body, and checks the answer against what the document promises.
 *
 *   node scripts/verifySwagger.js                 # all operations
 *   node scripts/verifySwagger.js --tag "Sale Orders"
 *   node scripts/verifySwagger.js --skip-writes   # GET only
 *
 * Needs the API running (API_BASE, default http://localhost:5000). Sign-in details come from
 * TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD (and TEST_DESIGNER_*, for the sale order walkthrough).
 *
 * Safety: write calls on an existing record use an id that does not exist, so nothing real is changed.
 * Calls that create new records do create them, so run this against a test database. State-changing or
 * outward-facing calls (logout, password reset, WhatsApp, payroll runs, attendance close-out, master
 * reset) are listed in NEVER_RUN and are skipped.
 */
const BASE = (process.env.API_BASE || "http://localhost:5000").replace(/\/$/, "");
const ADMIN = { email: process.env.TEST_ADMIN_EMAIL || "admin@gmail.com", password: process.env.TEST_ADMIN_PASSWORD || "123456" };
const DESIGNER = { email: process.env.TEST_DESIGNER_EMAIL || "mfgdesigner@gmail.com", password: process.env.TEST_DESIGNER_PASSWORD || "123456" };
const NULL_ID = "000000000000000000000000";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

const NEVER_RUN = [
  /^post \/auth\/(logout|forgot-password|send-reset-email|reset-password)$/,
  /^post \/webhooks\//,
  /^post \/master-settings\/reset-all$/,
  /^post \/salary\/runs$/,
  /^post \/attendance\/(finalize|reopen|reconcile|generate-holidays|batch-punch)$/,
  /^patch \/design\/settings\/max-load$/,
  /^post \/design\/pool\/designer$/,
  /^post \/design\/queue\/auto-assign$/,
];

// Defects in the API itself that this script has found and that need a code decision, not a documentation fix
const KNOWN_ISSUES = {};

const http = async (method, path, { token, body, query, form, headers = {} } = {}) => {
  // Provider webhooks are mounted at the site root, everything else under /api
  const url = new URL(path.startsWith("/webhooks") ? `${BASE}${path}` : `${BASE}/api${path}`);
  Object.entries(query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const init = { method: method.toUpperCase(), headers: { ...headers }, signal: AbortSignal.timeout(30000) };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (form) init.body = form;
  else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* binary or plain text */
  }
  return { status: res.status, json, text, headers: res.headers };
};

const login = async ({ email, password }) => {
  const r = await http("post", "/auth/login", { body: { email, password } });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status} ${r.json?.message || r.text.slice(0, 100)}`);
  return r.json.data;
};

/* ----------------------------------------------------------------- helpers */

const resolveRef = (doc, node) => {
  if (node?.$ref) return resolveRef(doc, node.$ref.split("/").slice(1).reduce((o, k) => o?.[k], doc));
  return node;
};

/** Build a sample value from a schema when the endpoint has no registered example. */
const sampleFrom = (doc, schema, depth = 0) => {
  const s = resolveRef(doc, schema);
  if (!s || depth > 4) return undefined;
  if (s.example !== undefined) return s.example;
  if (s.enum) return s.enum[0];
  if (s.allOf) return Object.assign({}, ...s.allOf.map((x) => sampleFrom(doc, x, depth + 1)));
  if (s.type === "object" || s.properties) {
    const out = {};
    Object.entries(s.properties || {}).forEach(([k, v]) => {
      if ((s.required || []).includes(k)) out[k] = sampleFrom(doc, v, depth + 1);
    });
    return out;
  }
  if (s.type === "array") return [];
  if (s.type === "integer" || s.type === "number") return 1;
  if (s.type === "boolean") return true;
  return "string";
};

const documentedStatus = (op, status) => {
  const keys = Object.keys(op.responses || {});
  return keys.includes(String(status)) || keys.includes(`${String(status)[0]}XX`) || keys.includes("default");
};

const listItems = (json) => (Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.items) ? json.items : []);

/* ------------------------------------------------------------- operations */

const runOperations = async (doc, token) => {
  const ops = [];
  Object.entries(doc.paths).forEach(([path, item]) =>
    Object.entries(item).forEach(([method, op]) => {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) return;
      ops.push({ method, path, op });
    })
  );
  const tag = option("--tag");
  const selected = ops.filter(({ op }) => !tag || op.tags?.includes(tag));

  // Real ids for "get one" calls, taken from the matching list call
  const ids = {};
  for (const { method, path } of selected.filter((o) => o.method === "get" && !o.path.includes("{"))) {
    try {
      const r = await http("get", path, { token, query: { limit: 1 } });
      const first = listItems(r.json)[0];
      if (first?._id) ids[path] = first._id;
    } catch {
      /* list not available, the get-one call will use an unknown id */
    }
  }

  const results = [];
  for (const { method, path, op } of selected) {
    const key = `${method} ${path}`;
    if (NEVER_RUN.some((rx) => rx.test(key))) {
      results.push({ key, verdict: "SKIP", note: "state-changing or outward-facing: test by hand" });
      continue;
    }
    if (flag("--skip-writes") && method !== "get") {
      results.push({ key, verdict: "SKIP", note: "writes skipped" });
      continue;
    }
    const jsonContent = op.requestBody?.content?.["application/json"];
    if (op.requestBody && !jsonContent) {
      results.push({ key, verdict: "SKIP", note: "file upload: covered by the sale order walkthrough" });
      continue;
    }

    const hasPathParam = path.includes("{");
    const collectionPath = path.replace(/\/\{[^}]+\}.*$/, "");
    const realId = method === "get" ? ids[collectionPath] : null;
    const url = path.replace(/\{[^}]+\}/g, (m, offset) => (offset === path.indexOf("{") && realId ? realId : NULL_ID));
    const query = {};
    (op.parameters || []).forEach((p) => {
      const param = resolveRef(doc, p);
      if (param.in === "query" && param.required) query[param.name] = sampleFrom(doc, param.schema) ?? "1";
    });
    const body = jsonContent ? (jsonContent.example ?? sampleFrom(doc, jsonContent.schema)) : undefined;
    const noAuth = Array.isArray(op.security) && op.security.length === 0;

    let r;
    try {
      r = await http(method, url, { token: noAuth ? null : token, body, query });
    } catch (e) {
      results.push({ key, verdict: "FAIL", note: `no answer: ${e.message}` });
      continue;
    }

    const message = r.json?.message || r.text.slice(0, 120);
    let verdict = "PASS";
    let note = `${r.status}`;
    if (KNOWN_ISSUES[key] && (r.status >= 400)) {
      verdict = "KNOWN";
      note = `${r.status} ${KNOWN_ISSUES[key]}`;
    } else if (r.status >= 500 && !Object.keys(op.responses || {}).includes(String(r.status))) {
      verdict = "FAIL";
      note = `${r.status} server error: ${message}`;
    } else if (r.status === 404 && /^Route not found/.test(r.json?.message || "")) {
      verdict = "FAIL";
      note = "documented, but the route does not exist";
    } else if (body !== undefined && [400, 409, 422].includes(r.status) && /already exists|duplicate|overlaps/i.test(message)) {
      note = `${r.status} accepted; the record from an earlier run already exists`;
    } else if (body !== undefined && [400, 422].includes(r.status) && !(hasPathParam && r.status === 404)) {
      verdict = "FAIL";
      note = `${r.status} the documented example was rejected: ${message}`;
    } else if (r.status === 401 && !noAuth) {
      verdict = "FAIL";
      note = "401 with a valid token";
    } else if (!documentedStatus(op, r.status)) {
      verdict = "WARN";
      note = `${r.status} is not listed in the document: ${message}`;
    } else if (r.status < 300 && r.json && typeof r.json === "object" && r.json.success === false) {
      verdict = "FAIL";
      note = `${r.status} but success is false`;
    }
    results.push({ key, verdict, note, status: r.status, generated: Boolean(op["x-generated"]) });
  }
  return results;
};

/* ------------------------------------------------- sale order walkthrough */

const walkthrough = async (doc, adminToken) => {
  const steps = [];
  const record = (name, ok, note = "") => {
    steps.push({ name, ok, note });
    return ok;
  };
  const example = (path, method) => doc.paths[path]?.[method]?.requestBody?.content?.["application/json"]?.example;
  const call = async (name, method, path, opts, expectStatus = [200, 201]) => {
    const r = await http(method, path, opts);
    record(name, expectStatus.includes(r.status), `${r.status}${expectStatus.includes(r.status) ? "" : ` ${r.json?.message || ""}`}`);
    return r;
  };

  const designer = await login(DESIGNER);
  const me = await http("get", "/auth/me", { token: designer.accessToken });
  const designerId = me.json?.data?._id || me.json?.data?.id;

  const created = await call("create draft", "post", "/sale-orders", { token: adminToken, body: example("/sale-orders", "post") });
  const id = created.json?.data?._id;
  if (!id) return steps;

  await call("edit draft", "patch", `/sale-orders/${id}`, { token: adminToken, body: example("/sale-orders/{id}", "patch") });
  await call("place (advance)", "post", `/sale-orders/${id}/place`, { token: adminToken, body: example("/sale-orders/{id}/place", "post"), headers: { "Idempotency-Key": `verify-${Date.now()}` } });
  const reassigned = await call("reassign designer", "post", `/sale-orders/${id}/reassign`, { token: adminToken, body: { designerUserId: designerId, reason: "verify script" } });
  await call("start design", "post", `/sale-orders/${id}/design/start`, { token: designer.accessToken });

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const form = new FormData();
  form.append("preview", new Blob([png], { type: "image/png" }), "preview.png");
  form.append("printFile", new Blob(["%PDF-1.4 verify"], { type: "application/pdf" }), "print.pdf");
  await call("upload design", "post", `/sale-orders/${id}/designs`, { token: designer.accessToken, form });
  await call("send design", "post", `/sale-orders/${id}/designs/1/send`, { token: designer.accessToken });
  await call("record approval", "post", `/sale-orders/${id}/approval`, { token: adminToken, body: example("/sale-orders/{id}/approval", "post") });
  await call("download print file", "get", `/sale-orders/${id}/designs/1/print-file`, { token: designer.accessToken });
  await call("start print", "post", `/sale-orders/${id}/print/start`, { token: designer.accessToken });
  await call("finish print", "post", `/sale-orders/${id}/print/finish`, { token: designer.accessToken, body: example("/sale-orders/{id}/print/finish", "post") });
  await call("dispatch", "post", `/sale-orders/${id}/dispatch`, { token: designer.accessToken, body: example("/sale-orders/{id}/dispatch", "post") });
  await call("receive", "post", `/sale-orders/${id}/receive`, { token: adminToken, body: example("/sale-orders/{id}/receive", "post") });
  const detail = await http("get", `/sale-orders/${id}`, { token: adminToken });
  const balance = detail.json?.data?.balanceDue;
  await call("deliver (balance paid)", "post", `/sale-orders/${id}/deliver`, {
    token: adminToken,
    body: { ...example("/sale-orders/{id}/deliver", "post"), amount: balance },
    headers: { "Idempotency-Key": `verify-deliver-${Date.now()}` },
  });
  const final = await http("get", `/sale-orders/${id}`, { token: adminToken });
  record("order ends DELIVERED and fully paid", final.json?.data?.status === "DELIVERED" && final.json?.data?.balanceDue === 0, `${final.json?.data?.status}, balance ${final.json?.data?.balanceDue}`);
  await call("timeline", "get", `/sale-orders/${id}/timeline`, { token: adminToken });

  // A second order that is cancelled
  const second = await call("create second draft", "post", "/sale-orders", { token: adminToken, body: example("/sale-orders", "post") });
  const id2 = second.json?.data?._id;
  if (id2) {
    await call("place second", "post", `/sale-orders/${id2}/place`, { token: adminToken, body: example("/sale-orders/{id}/place", "post"), headers: { "Idempotency-Key": `verify-c-${Date.now()}` } });
    await call("cancel", "post", `/sale-orders/${id2}/cancel`, { token: adminToken, body: example("/sale-orders/{id}/cancel", "post") });
  }
  void reassigned;
  return steps;
};

/* ------------------------------------------------------------------ main */

const main = async () => {
  const docRes = await fetch(`${BASE}/api-docs.json`);
  const doc = await docRes.json();
  const session = await login(ADMIN);
  const token = session.accessToken;

  // The login response must carry the two tokens and nothing else for the caller to store
  const tokenKeys = ["accessToken", "refreshToken"].filter((k) => session[k]);
  if (tokenKeys.length !== 2) throw new Error("Login did not return both tokens");
  const loginSchema = doc.components.schemas.LoginResponse.properties.data;
  const documented = Object.keys(loginSchema.properties);
  const extra = Object.keys(session).filter((k) => !documented.includes(k));
  console.log(`Login response documented as: ${documented.join(", ")}`);
  if (extra.length) console.log(`  WARN  the real login response also returns: ${extra.join(", ")}`);

  // The token pair must work end to end: refresh gives a new access token that /auth/me accepts
  const refreshed = await http("post", "/auth/refresh", { body: { refreshToken: session.refreshToken } });
  const me = refreshed.json?.data?.accessToken ? await http("get", "/auth/me", { token: refreshed.json.data.accessToken }) : null;
  const refreshOk = refreshed.status === 200 && me?.status === 200;
  console.log(`Token refresh then /auth/me: ${refreshOk ? "ok" : `FAIL (${refreshed.status} ${refreshed.json?.message || ""})`}`);
  if (!refreshOk) process.exitCode = 1;

  const results = await runOperations(doc, token);
  const tally = results.reduce((t, r) => ({ ...t, [r.verdict]: (t[r.verdict] || 0) + 1 }), {});
  console.log("\nOperations:", tally, `of ${results.length}`);
  results.filter((r) => r.verdict === "FAIL").forEach((r) => console.log(`  FAIL  ${r.key}  ${r.note}`));
  results.filter((r) => r.verdict === "KNOWN").forEach((r) => console.log(`  KNOWN ${r.key}  ${r.note}`));
  if (flag("--show-warn")) results.filter((r) => r.verdict === "WARN").forEach((r) => console.log(`  WARN  ${r.key}  ${r.note}`));
  if (flag("--show-skip")) results.filter((r) => r.verdict === "SKIP").forEach((r) => console.log(`  SKIP  ${r.key}  ${r.note}`));

  let failed = results.some((r) => r.verdict === "FAIL");
  if (!option("--tag") || option("--tag") === "Sale Orders") {
    const steps = await walkthrough(doc, token);
    console.log("\nSale order walkthrough:");
    steps.forEach((s) => console.log(`  ${s.ok ? "ok  " : "FAIL"}  ${s.name}  ${s.note}`));
    failed = failed || steps.some((s) => !s.ok);
  }
  process.exit(failed ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

