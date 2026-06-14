// transactions.test.js
import { describe, it, expect, beforeAll } from "vitest";
import { api, creerEtConnecterUtilisateur, creerCompte, deposer } from "./helpers.js";

// ── Utilisateur A (ECOBANK) ──────────────────────────────────────────────
let tokenA = "", userIdA = "", compteA_ecobank = "";

// ── Utilisateur B (UBA — autre banque) ───────────────────────────────────
let tokenB = "", userIdB = "", compteB_uba = "";

// ── Utilisateur C (ECOBANK — même banque que A) ───────────────────────────
let tokenC = "", userIdC = "", compteC_ecobank = "";

beforeAll(async () => {
  const sessionA = await creerEtConnecterUtilisateur("A_" + Date.now());
  tokenA  = sessionA.token;
  userIdA = sessionA.userId;
  const cA = await creerCompte(tokenA, userIdA, "ECOBANK");
  compteA_ecobank = cA.id;

  const sessionB = await creerEtConnecterUtilisateur("B_" + Date.now());
  tokenB  = sessionB.token;
  userIdB = sessionB.userId;
  const cB = await creerCompte(tokenB, userIdB, "UBA");
  compteB_uba = cB.id;

  const sessionC = await creerEtConnecterUtilisateur("C_" + Date.now());
  tokenC  = sessionC.token;
  userIdC = sessionC.userId;
  const cC = await creerCompte(tokenC, userIdC, "ECOBANK");
  compteC_ecobank = cC.id;
}, 30000);

// ════════════════════════════════════════════════════════════════════════════
//  DÉPÔT
// ════════════════════════════════════════════════════════════════════════════
describe("DÉPÔT", () => {

  it("Dépôt valide de 5 000 FCFA → 201", async () => {
    const res = await deposer(tokenA, compteA_ecobank, 5000);
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data.typeTransaction).toBe("DEPOT");
    expect(Number(res.data.data.montant)).toBe(5000);
    expect(Number(res.data.data.frais)).toBe(0);
  });

  it("Dépôt au minimum exact de 1 000 FCFA → 201", async () => {
    const res = await deposer(tokenA, compteA_ecobank, 1000);
    expect(res.status).toBe(201);
    expect(Number(res.data.data.montant)).toBe(1000);
  });

  it("Dépôt de gros montant 10 000 000 FCFA → 201", async () => {
    const res = await deposer(tokenA, compteA_ecobank, 10000000);
    expect(res.status).toBe(201);
    expect(Number(res.data.data.montant)).toBe(10000000);
  });

  it("Dépôt de 500 FCFA (sous le minimum de 1 000) → 400", async () => {
    const res = await deposer(tokenA, compteA_ecobank, 500);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/1 000|1000|minimum/i);
  });

  it("Dépôt de 0 FCFA → 400", async () => {
    const res = await deposer(tokenA, compteA_ecobank, 0);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it("Dépôt négatif → 400", async () => {
    const res = await deposer(tokenA, compteA_ecobank, -5000);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it("Compte inexistant → 404", async () => {
    const res = await deposer(tokenA, "00000000-0000-0000-0000-000000000000", 5000);
    expect(res.status).toBe(404);
  });

  it("Sans token → 403", async () => {
    const res = await api.post("/transactions", {
      compteId: compteA_ecobank,
      typeTransaction: "DEPOT",
      montant: 5000,
    });
    expect(res.status).toBe(403);
  });

});

// ════════════════════════════════════════════════════════════════════════════
//  RETRAIT  (règles : min 500 FCFA — max 1 000 000 FCFA)
// ════════════════════════════════════════════════════════════════════════════
describe("RETRAIT", () => {

  it("Retrait valide de 500 FCFA (minimum exact) → 201", async () => {
    await deposer(tokenA, compteA_ecobank, 5000000);

    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 500 },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data.typeTransaction).toBe("RETRAIT");
    expect(Number(res.data.data.montant)).toBe(500);
  });

  it("Retrait valide de 50 000 FCFA → 201", async () => {
    await deposer(tokenA, compteA_ecobank, 5000000);

    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 50000 },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(201);
    expect(Number(res.data.data.montant)).toBe(50000);
    expect(Number(res.data.data.soldeApres)).toBeLessThan(Number(res.data.data.soldeAvant));
  });

  it("Retrait au maximum exact de 1 000 000 FCFA → 201", async () => {
    await deposer(tokenA, compteA_ecobank, 5000000);

    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 1000000, description: "Test retrait max" },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(201);
    expect(Number(res.data.data.montant)).toBe(1000000);
  });

  it("Retrait de 100 FCFA (sous le minimum de 500) → 400", async () => {
    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 100 },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/500|minimum/i);
  });

  it("Retrait de 1 500 000 FCFA (au-dessus du maximum de 1 000 000) → 400", async () => {
    await deposer(tokenA, compteA_ecobank, 5000000);

    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 1500000 },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/1 000 000|1000000|maximum/i);
  });

  it("Retrait avec solde insuffisant → 400", async () => {
    const session = await creerEtConnecterUtilisateur("vide_" + Date.now());
    const compte = await creerCompte(session.token, session.userId, "ECOBANK");

    const res = await api.post(
      "/transactions",
      { compteId: compte.id, typeTransaction: "RETRAIT", montant: 500 },
      { headers: { Authorization: `Bearer ${session.token}` } }
    );
    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/solde insuffisant/i);
  });

  it("Retrait de 0 → 400", async () => {
    const res = await api.post(
      "/transactions",
      { compteId: compteA_ecobank, typeTransaction: "RETRAIT", montant: 0 },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(400);
  });

  it("Sans token → 403", async () => {
    const res = await api.post("/transactions", {
      compteId: compteA_ecobank,
      typeTransaction: "RETRAIT",
      montant: 5000,
    });
    expect(res.status).toBe(403);
  });

});

// ════════════════════════════════════════════════════════════════════════════
//  TRANSFERT
// ════════════════════════════════════════════════════════════════════════════
describe("TRANSFERT", () => {

  beforeAll(async () => {
    await deposer(tokenA, compteA_ecobank, 10000000);
    await deposer(tokenC, compteC_ecobank, 10000000);
  }, 15000);

  // ── Même banque (sans frais) ──────────────────────────────────────────
  describe("Même banque (ECOBANK → ECOBANK) — sans frais", () => {

    it("Transfert de 5 000 FCFA → 201, frais = 0", async () => {
      const res = await api.post(
        "/transactions/transferts",
        {
          compteSourceId: compteA_ecobank,
          compteDestinataireId: compteC_ecobank,
          montant: 5000,
          description: "Test même banque",
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBe(2);

      const emis = res.data.data[0]; // TRANSFERT_EMIS
      const recu = res.data.data[1]; // TRANSFERT_RECU

      expect(emis.typeTransaction).toBe("TRANSFERT_EMIS");
      expect(recu.typeTransaction).toBe("TRANSFERT_RECU");
      expect(Number(emis.frais)).toBe(0);
      expect(Number(emis.montantTotal)).toBe(5000);
      expect(Number(recu.montant)).toBe(5000);
    });

    it("Le solde source diminue du montant exact", async () => {
      const avant = await api.get(`/comptes/${compteA_ecobank}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const soldeAvant = Number(avant.data.data.solde);

      await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteC_ecobank, montant: 2000 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );

      const apres = await api.get(`/comptes/${compteA_ecobank}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(Number(apres.data.data.solde)).toBe(soldeAvant - 2000);
    });

  });

  // ── Banques différentes (avec frais) ─────────────────────────────────
  describe("Banques différentes (ECOBANK → UBA) — avec frais 1%", () => {

    it("Transfert de 10 000 FCFA → frais = 500 FCFA (1%)", async () => {
      await deposer(tokenA, compteA_ecobank, 5000000);

      const res = await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteB_uba, montant: 10000 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(201);
      const emis = res.data.data[0];
      expect(Number(emis.frais)).toBe(500);
      expect(Number(emis.montantTotal)).toBe(10500);
    });

    it("Transfert de 1 000 FCFA → frais minimum 500 FCFA", async () => {
      await deposer(tokenA, compteA_ecobank, 5000000);

      const res = await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteB_uba, montant: 1000 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(201);
      const emis = res.data.data[0];
      expect(Number(emis.frais)).toBe(500);
      expect(Number(emis.montantTotal)).toBe(1500);
    });

    it("Le destinataire reçoit le montant sans les frais", async () => {
      await deposer(tokenA, compteA_ecobank, 5000000);

      const avantDest = await api.get(`/comptes/${compteB_uba}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const soldeAvantDest = Number(avantDest.data.data.solde);

      await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteB_uba, montant: 50000 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );

      const apresDest = await api.get(`/comptes/${compteB_uba}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(Number(apresDest.data.data.solde)).toBe(soldeAvantDest + 50000);
    });

  });

  // ── Cas d'erreur ──────────────────────────────────────────────────────
  describe("Cas d'erreur", () => {

    it("Transfert vers le même compte → 400", async () => {
      const res = await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteA_ecobank, montant: 5000 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/même compte/i);
    });

    it("Solde insuffisant (source) → 400", async () => {
      const session = await creerEtConnecterUtilisateur("pauvre_" + Date.now());
      const comptePauvre = await creerCompte(session.token, session.userId, "ECOBANK");

      const res = await api.post(
        "/transactions/transferts",
        { compteSourceId: comptePauvre.id, compteDestinataireId: compteC_ecobank, montant: 5000 },
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/solde insuffisant/i);
    });

    it("Montant sous le minimum de 1 000 FCFA → 400", async () => {
      const res = await api.post(
        "/transactions/transferts",
        { compteSourceId: compteA_ecobank, compteDestinataireId: compteC_ecobank, montant: 500 },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(400);
    });

    it("Compte source inexistant → 404", async () => {
      const res = await api.post(
        "/transactions/transferts",
        {
          compteSourceId: "00000000-0000-0000-0000-000000000000",
          compteDestinataireId: compteC_ecobank,
          montant: 5000,
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(404);
    });

    it("Compte destinataire inexistant → 404", async () => {
      const res = await api.post(
        "/transactions/transferts",
        {
          compteSourceId: compteA_ecobank,
          compteDestinataireId: "00000000-0000-0000-0000-000000000000",
          montant: 5000,
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      expect(res.status).toBe(404);
    });

    it("Sans token → 403", async () => {
      const res = await api.post("/transactions/transferts", {
        compteSourceId: compteA_ecobank,
        compteDestinataireId: compteC_ecobank,
        montant: 5000,
      });
      expect(res.status).toBe(403);
    });

  });

});

// ════════════════════════════════════════════════════════════════════════════
//  HISTORIQUE & DÉTAIL
// ════════════════════════════════════════════════════════════════════════════
describe("HISTORIQUE & DÉTAIL", () => {

  let transactionId = "";

  it("Historique d'un compte → liste triée par date", async () => {
    const res = await api.get(`/transactions/compte/${compteA_ecobank}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);

    transactionId = res.data.data[0].id;

    if (res.data.data.length > 1) {
      const d1 = new Date(res.data.data[0].createdAt);
      const d2 = new Date(res.data.data[1].createdAt);
      expect(d1.getTime()).toBeGreaterThanOrEqual(d2.getTime());
    }
  });

  it("Détail d'une transaction → 200", async () => {
    const res = await api.get(`/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(transactionId);
  });

  it("Historique d'un compte inexistant → 404", async () => {
    const res = await api.get(
      "/transactions/compte/00000000-0000-0000-0000-000000000000",
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(404);
  });

  it("Transaction inexistante → 404", async () => {
    const res = await api.get(
      "/transactions/00000000-0000-0000-0000-000000000000",
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    expect(res.status).toBe(404);
  });

  it("Sans token → 403", async () => {
    const res = await api.get(`/transactions/compte/${compteA_ecobank}`);
    expect(res.status).toBe(403);
  });

});
