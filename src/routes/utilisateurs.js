import { Router } from "express";
import { pool } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, fail } from "../middleware/response.js";

const router = Router();
router.use(authMiddleware);

// ─── GET ALL ───────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nom, prenom, email, telephone, created_at, updated_at FROM utilisateurs ORDER BY created_at DESC"
    );
    return ok(res, `${result.rows.length} utilisateur(s) trouvé(s).`, result.rows);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── GET ONE ───────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nom, prenom, email, telephone, created_at, updated_at FROM utilisateurs WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows[0]) return fail(res, "Utilisateur introuvable.", 404);
    return ok(res, "Utilisateur trouvé.", result.rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── UPDATE ────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { nom, prenom, email, telephone } = req.body;
    const { id } = req.params;

    const user = await pool.query("SELECT * FROM utilisateurs WHERE id = $1", [id]);
    if (!user.rows[0]) return fail(res, "Utilisateur introuvable.", 404);

    if (email && email !== user.rows[0].email) {
      const emailExists = await pool.query(
        "SELECT id FROM utilisateurs WHERE email = $1 AND id != $2", [email, id]
      );
      if (emailExists.rows.length > 0)
        return fail(res, `L'email '${email}' est déjà utilisé.`);
    }

    const result = await pool.query(
      `UPDATE utilisateurs SET
        nom       = COALESCE($1, nom),
        prenom    = COALESCE($2, prenom),
        email     = COALESCE($3, email),
        telephone = COALESCE($4, telephone),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, nom, prenom, email, telephone, created_at, updated_at`,
      [nom || null, prenom || null, email || null, telephone || null, id]
    );

    return ok(res, "Utilisateur mis à jour.", result.rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── DELETE ────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM utilisateurs WHERE id = $1 RETURNING id", [req.params.id]
    );
    if (!result.rows[0]) return fail(res, "Utilisateur introuvable.", 404);
    return ok(res, "Utilisateur supprimé avec succès.");
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

export default router;
