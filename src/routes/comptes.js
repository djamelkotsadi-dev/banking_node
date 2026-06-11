import { Router } from "express";
import { pool } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, created, fail } from "../middleware/response.js";

const router = Router();
router.use(authMiddleware);

const BANQUES_VALIDES = [
  "ECOBANK","CCA","UBA","AFRILAND","SGBC","BICEC","SCB","BGFI","NBC","ATLANTIC"
];
const TYPES_VALIDES = ["COURANT", "EPARGNE"];

// ─── CREATE ────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { utilisateurId, typeCompte, banque, devise } = req.body;

    if (!utilisateurId || !typeCompte || !banque)
      return fail(res, "utilisateurId, typeCompte et banque sont obligatoires.");

    if (!TYPES_VALIDES.includes(typeCompte))
      return fail(res, `typeCompte invalide. Valeurs acceptées : ${TYPES_VALIDES.join(", ")}`);

    if (!BANQUES_VALIDES.includes(banque))
      return fail(res, `Banque invalide. Valeurs acceptées : ${BANQUES_VALIDES.join(", ")}`);

    // Vérifier que l'utilisateur existe
    const user = await pool.query("SELECT id FROM utilisateurs WHERE id = $1", [utilisateurId]);
    if (!user.rows[0]) return fail(res, `Utilisateur introuvable : ${utilisateurId}`, 404);

    // Générer un numéro de compte unique
    let numeroCompte;
    do {
      numeroCompte = banque.substring(0, 3).toUpperCase() + (Date.now() % 10_000_000_000);
    } while (
      (await pool.query("SELECT id FROM comptes WHERE numero_compte = $1", [numeroCompte])).rows.length > 0
    );

    const result = await pool.query(
      `INSERT INTO comptes (user_id, numero_compte, type_compte, banque, devise)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [utilisateurId, numeroCompte, typeCompte, banque, devise || "XAF"]
    );

    const compte = result.rows[0];
    // Enrichir avec les infos du propriétaire
    const proprietaire = await pool.query(
      "SELECT nom, prenom FROM utilisateurs WHERE id = $1", [utilisateurId]
    );

    return created(res, "Compte créé avec succès.", {
      ...compte,
      nomProprietaire: proprietaire.rows[0]?.nom,
      prenomProprietaire: proprietaire.rows[0]?.prenom,
    });
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── GET ALL ───────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.nom, u.prenom
       FROM comptes c JOIN utilisateurs u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    return ok(res, `${result.rows.length} compte(s) trouvé(s).`, result.rows);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── GET ONE ───────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.nom, u.prenom
       FROM comptes c JOIN utilisateurs u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return fail(res, "Compte introuvable.", 404);
    return ok(res, "Compte trouvé.", result.rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── GET BY USER ───────────────────────────────────────────────────────────
router.get("/utilisateur/:utilisateurId", async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT id FROM utilisateurs WHERE id = $1", [req.params.utilisateurId]
    );
    if (!user.rows[0]) return fail(res, "Utilisateur introuvable.", 404);

    const result = await pool.query(
      `SELECT c.*, u.nom, u.prenom
       FROM comptes c JOIN utilisateurs u ON c.user_id = u.id
       WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
      [req.params.utilisateurId]
    );
    return ok(res, `${result.rows.length} compte(s) trouvé(s).`, result.rows);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

export default router;
