import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttpModule from "pino-http";
const pinoHttp = (pinoHttpModule as any).default ?? pinoHttpModule;
import { config } from "./config.js";
import { connectDb, closeDb } from "./db/connection.js";
import { startCleanup, stopCleanup } from "./db/cleanup.js";
import { apiRouter } from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { logger } from "./logger.js";

const app = express();

// --- Middleware ---

// WHY: Google OAuth loads scripts from accounts.google.com/gsi and uses
// inline styles. Default helmet CSP blocks both, breaking the sign-in button.
// WHY: crossOriginOpenerPolicy must be "same-origin-allow-popups" because
// useGoogleLogin opens a popup to accounts.google.com. The popup communicates
// the credential back via window.opener. Helmet's default "same-origin" severs
// that link, so the popup completes but the token never reaches our callback.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://api.mapbox.com", "https://events.mapbox.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://api.mapbox.com"],
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

// --- API routes ---

app.use("/api/v1", apiRouter);

// --- React frontend (static files) ---

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));

// SPA fallback: non-API GET requests return index.html
app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

// --- Error handling ---

app.use(notFound);
app.use(errorHandler);

// --- Graceful shutdown ---

function shutdown(): void {
  logger.info("Shutting down...");
  stopCleanup();
  closeDb().catch((err) => logger.error({ err }, "Error closing database"));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- Start ---

async function start(): Promise<void> {
  try {
    await connectDb();
    logger.info("Connected to PostgreSQL");

    startCleanup();

    app.listen(config.port, () => {
      logger.info({ port: config.port }, "Server started");
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();

export { app };
