// tests/auth.test.js
import { describe, it, expect } from "vitest";
import { api } from "./helpers.js";

const email = `auth_${Date.now()}@banking.cm`;

describe("AUTHENTIFICATION", () => {

  // ── REGISTER ──────────────────────────────────────────────────────────
  describe("Register", () => {

    it("Créer un utilisateur valide → 201", async () => {
      const res = await api.post("/auth/register", {
        nom: "Kamga",
        prenom: "Jean",
        email,
        motDePasse: "Test1234!",
        telephone: "699000001",
      });
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.email).toBe(email);
      expect(res.data.data.mot_de_passe).toBeUndefined(); // mot de passe jamais renvoyé
    });

    it("Email déjà utilisé → 400", async () => {
      const res = await api.post("/auth/register", {
        nom: "Kamga",
        prenom: "Jean",
        email, // même email
        motDePasse: "Test1234!",
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toMatch(/existe déjà/i);
    });

    it("Champs manquants → 400", async () => {
      const res = await api.post("/auth/register", {
        nom: "Kamga",
        // prenom, email, motDePasse manquants
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    it("Sans email → 400", async () => {
      const res = await api.post("/auth/register", {
        nom: "Kamga",
        prenom: "Jean",
        motDePasse: "Test1234!",
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

  });

  // ── LOGIN ─────────────────────────────────────────────────────────────
  describe("Login", () => {

    it("Connexion avec bonnes credentials → 200 + token", async () => {
      const res = await api.post("/auth/login", {
        email,
        motDePasse: "Test1234!",
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.token).toBeDefined();
      expect(res.data.data.token.length).toBeGreaterThan(20);
      expect(res.data.data.email).toBe(email);
    });

    it("Mauvais mot de passe → 400", async () => {
      const res = await api.post("/auth/login", {
        email,
        motDePasse: "MauvaisMotDePasse",
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    it("Email inexistant → 400", async () => {
      const res = await api.post("/auth/login", {
        email: "inexistant@banking.cm",
        motDePasse: "Test1234!",
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    it("Champs manquants → 400", async () => {
      const res = await api.post("/auth/login", { email });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

  });

});
