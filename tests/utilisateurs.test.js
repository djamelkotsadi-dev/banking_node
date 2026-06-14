// tests/utilisateurs.test.js
import { describe, it, expect, beforeAll } from "vitest";
import { api, creerEtConnecterUtilisateur } from "./helpers.js";

let token = "";
let userId = "";

beforeAll(async () => {
  const session = await creerEtConnecterUtilisateur();
  token = session.token;
  userId = session.userId;
});

describe("UTILISATEURS", () => {

  // ── LISTER ────────────────────────────────────────────────────────────
  describe("GET /utilisateurs", () => {

    it("Lister tous les utilisateurs → 200", async () => {
      const res = await api.get("/utilisateurs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    it("Sans token → 403", async () => {
      const res = await api.get("/utilisateurs");
      expect(res.status).toBe(403);
    });

  });

  // ── GET ONE ───────────────────────────────────────────────────────────
  describe("GET /utilisateurs/:id", () => {

    it("Obtenir un utilisateur par ID → 200", async () => {
      const res = await api.get(`/utilisateurs/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.id).toBe(userId);
    });

    it("ID inexistant → 404", async () => {
      const res = await api.get("/utilisateurs/00000000-0000-0000-0000-000000000000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(404);
      expect(res.data.success).toBe(false);
    });

    it("Sans token → 403", async () => {
      const res = await api.get(`/utilisateurs/${userId}`);
      expect(res.status).toBe(403);
    });

  });

  // ── UPDATE ────────────────────────────────────────────────────────────
  describe("PUT /utilisateurs/:id", () => {

    it("Mettre à jour le téléphone → 200", async () => {
      const res = await api.put(
        `/utilisateurs/${userId}`,
        { telephone: "677000099" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.telephone).toBe("677000099");
    });

    it("Mettre à jour le nom → 200", async () => {
      const res = await api.put(
        `/utilisateurs/${userId}`,
        { nom: "NouveauNom" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(200);
      expect(res.data.data.nom).toBe("NouveauNom");
    });

    it("ID inexistant → 404", async () => {
      const res = await api.put(
        "/utilisateurs/00000000-0000-0000-0000-000000000000",
        { nom: "Test" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(404);
    });

    it("Sans token → 403", async () => {
      const res = await api.put(`/utilisateurs/${userId}`, { nom: "Test" });
      expect(res.status).toBe(403);
    });

  });

  // ── DELETE ────────────────────────────────────────────────────────────
  describe("DELETE /utilisateurs/:id", () => {

    it("Supprimer un utilisateur → 200", async () => {
      // Créer un utilisateur temporaire à supprimer
      const temp = await creerEtConnecterUtilisateur("delete_" + Date.now());
      const res = await api.delete(`/utilisateurs/${temp.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it("ID inexistant → 404", async () => {
      const res = await api.delete(
        "/utilisateurs/00000000-0000-0000-0000-000000000000",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(404);
    });

    it("Sans token → 403", async () => {
      const res = await api.delete(`/utilisateurs/${userId}`);
      expect(res.status).toBe(403);
    });

  });

});
