import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/mva-manager",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  allowedEmails: (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean),
  serverUrl: process.env.SERVER_URL || "http://localhost:3100",
  logLevel: process.env.LOG_LEVEL || "info",
  nodeEnv: process.env.NODE_ENV || "development",
  geocodioApiKey: process.env.GEOCODIO_API_KEY || "",
  mapboxToken: process.env.MAPBOX_TOKEN || "",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
} as const;
