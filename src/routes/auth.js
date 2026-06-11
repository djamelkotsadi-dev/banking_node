import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";
import { ok, created, fail } from "../middleware/response.js";

const router = Router();

// ─── REGISTER ──────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone } = req.body;

    if (!nom || !prenom || !email || !motDePasse)
      return fail(res, "Les champs nom, prenom, email et motDePasse sont obligatoires.");

    // Vérifier unicité email
    const exists = await pool.query(
      "SELECT id FROM utilisateurs WHERE email = $1", [email]
    );
    if (exists.rows.length > 0)
      return fail(res, `Un utilisateur avec l'email '${email}' existe déjà.`);

    const hash = await bcrypt.hash(motDePasse, 10);

    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nom, prenom, email, telephone, created_at, updated_at`,
      [nom, prenom, email, telephone || null, hash]
    );

    return created(res, "Utilisateur créé avec succès.", result.rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse)
      return fail(res, "Email et motDePasse sont obligatoires.");

    const result = await pool.query(
      "SELECT * FROM utilisateurs WHERE email = $1", [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(motDePasse, user.mot_de_passe)))
      return fail(res, "Email ou mot de passe incorrect.");

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return ok(res, "Connexion réussie.", {
      token,
      type: "Bearer",
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

export default router;
