const env = require("./env");

const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow configured origins, any localhost in dev, or loopback ip
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      env.NODE_ENV === "development" ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: Origin not allowed"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = corsOptions;
