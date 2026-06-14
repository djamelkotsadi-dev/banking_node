// tests/comptes.test.js
import { describe, it, expect, beforeAll } from "vitest";
import { api, creerEtConnecterUtilisateur } from "./helpers.js";

let token = "";
let userId = "";
let compteId = "";

beforeAll(async () => {
  const session = await creerEtConnecterUtilisateur();
  token = session.token;
  userId = session.userId;
});

describe("COMPTES", () => {

  // ── CREATE ────────────────────────────────────────────────────────────
  describe("POST /comptes", () => {

    it("Créer un compte COURANT ECOBANK → 201", async () => {
      const res = await api.post(
        "/comptes",
        { utilisateurId: userId, typeCompte: "COURANT", banque: "ECOBANK", devise: "XAF" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.banque).toBe("ECOBANK");
      expect(res.data.data.type_compte).toBe("COURANT");
      expect(Number(res.data.data.solde)).toBe(0);
      compteId = res.data.data.id; // on garde pour les tests suivants
    });

    it("Créer un compte EPARGNE UBA → 201", async () => {
      const res = await api.post(
        "/comptes",
        { utilisateurId: userId, typeCompte: "EPARGNE", banque: "UBA" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(201);
      expect(res.data.data.banque).toBe("UBA");
      expect(res.data.data.type_compte).toBe("EPARGNE");
    });

    it("Toutes les banques sont acceptées", async () => {
      const banques = ["CCA", "AFRILAND", "SGBC", "BICEC", "SCB", "BGFI", "NBC", "ATLANTIC"];
      for (const banque of banques) {
        const res = await api.post(
          "/comptes",
          { utilisateurId: userId, typeCompte: "COURANT", banque },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        expect(res.status).toBe(201);
        expect(res.data.data.banque).toBe(banque);
      }
    });

    it("Banque invalide → 400", async () => {
      const res = await api.post(
        "/comptes",
        { utilisateurId: userId, typeCompte: "COURANT", banque: "BANQUE_INEXISTANTE" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    it("Type de compte invalide → 400", async () => {
      const res = await api.post(
        "/comptes",
        { utilisateurId: userId, typeCompte: "PROFESSIONNEL", banque: "ECOBANK" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    it("Utilisateur inexistant → 404", async () => {
      const res = await api.post(
        "/comptes",
        {
          utilisateurId: "00000000-0000-0000-0000-000000000000",
          typeCompte: "COURANT",
          banque: "ECOBANK",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(404);
    });

    it("Champs manquants → 400", async () => {
      const res = await api.post(
        "/comptes",
        { utilisateurId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(400);
    });

    it("Sans token → 403", async () => {
      const res = await api.post("/comptes", {
        utilisateurId: userId,
        typeCompte: "COURANT",
        banque: "ECOBANK",
      });
      expect(res.status).toBe(403);
    });

  });

  // ── GET ALL ───────────────────────────────────────────────────────────
  describe("GET /comptes", () => {

    it("Lister tous les comptes → 200", async () => {
      const res = await api.get("/comptes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);
    });

    it("Sans token → 403", async () => {
      const res = await api.get("/comptes");
      expect(res.status).toBe(403);
    });

  });

  // ── GET ONE ───────────────────────────────────────────────────────────
  describe("GET /comptes/:id", () => {

    it("Obtenir un compte par ID → 200", async () => {
      const res = await api.get(`/comptes/${compteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.data.id).toBe(compteId);
    });

    it("ID inexistant → 404", async () => {
      const res = await api.get("/comptes/00000000-0000-0000-0000-000000000000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(404);
    });

  });

  // ── GET BY USER ───────────────────────────────────────────────────────
  describe("GET /comptes/utilisateur/:userId", () => {

    it("Lister les comptes d'un utilisateur → 200", async () => {
      const res = await api.get(`/comptes/utilisateur/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);
      // Tous les comptes appartiennent bien à cet utilisateur
      res.data.data.forEach(c => expect(c.user_id).toBe(userId));
    });

    it("Utilisateur inexistant → 404", async () => {
      const res = await api.get(
        "/comptes/utilisateur/00000000-0000-0000-0000-000000000000",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status).toBe(404);
    });

  });

});
