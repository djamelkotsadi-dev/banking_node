import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDB, pool } from "./db/index.js";
import authRoutes         from "./routes/auth.js";
import utilisateursRoutes from "./routes/utilisateurs.js";
import comptesRoutes      from "./routes/comptes.js";
import transactionsRoutes from "./routes/transactions.js";
import { swaggerSpec, swaggerUi } from "./swagger.js";

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── Middlewares globaux ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Swagger UI ────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Banking API",
  swaggerOptions: { persistAuthorization: true },
}));
app.get("/api-docs.json", (_, res) => res.json(swaggerSpec));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/utilisateurs", utilisateursRoutes);
app.use("/api/comptes",      comptesRoutes);
app.use("/api/transactions", transactionsRoutes);

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ status: "OK", message: "Banking API Node.js", docs: "/api-docs" }));

// ─── Démarrage ─────────────────────────────────────────────────────────────
let server;
async function start() {
  await initDB();
  server = app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📖 Swagger UI : http://localhost:${PORT}/api-docs`);
  });
}

start().catch(err => {
  console.error("Erreur démarrage :", err);
  process.exit(1);
});

// ─── Arrêt propre (Ctrl+C, Render redeploy, etc.) ──────────────────────────
process.on("SIGINT", async () => {
  console.log("\nSIGINT reçu, fermeture propre…");
  try { await pool.end(); } catch {}
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nSIGTERM reçu, fermeture propre…");
  try { await pool.end(); } catch {}
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});