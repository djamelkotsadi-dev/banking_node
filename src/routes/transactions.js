import { Router } from "express";
import { pool } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, created, fail } from "../middleware/response.js";

const router = Router();
router.use(authMiddleware);

// ─── Règles métier ─────────────────────────────────────────────────────────
const DEPOT_MIN   = 1_000;
const RETRAIT_MIN = 500;
const RETRAIT_MAX = 1_000_000;
const TAUX_FRAIS  = 0.01;   // 1%
const FRAIS_MIN   = 500;    // 500 FCFA minimum

// ═══════════════════════════════════════════════════════════════════════════
//  DÉPÔT / RETRAIT
// ═══════════════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { compteId, typeTransaction, montant, description } = req.body;

    if (!compteId || !typeTransaction || montant == null)
      return fail(res, "compteId, typeTransaction et montant sont obligatoires.");

    const montantNum = Number(montant);
    if (isNaN(montantNum) || montantNum <= 0)
      return fail(res, "Le montant doit être un nombre positif.");

    if (!["DEPOT", "RETRAIT"].includes(typeTransaction))
      return fail(res, "Utilisez POST /api/transactions/transferts pour les transferts.");

    // ── Règles montant minimum
    if (typeTransaction === "DEPOT" && montantNum < DEPOT_MIN)
      return fail(res, `Le montant minimum pour un dépôt est de ${DEPOT_MIN.toLocaleString("fr-FR")} FCFA.`);

    if (typeTransaction === "RETRAIT" && montantNum < RETRAIT_MIN)
      return fail(res, `Le montant minimum pour un retrait est de ${RETRAIT_MIN.toLocaleString("fr-FR")} FCFA.`);

    if (typeTransaction === "RETRAIT" && montantNum > RETRAIT_MAX)
      return fail(res, `Le montant maximum pour un retrait est de ${RETRAIT_MAX.toLocaleString("fr-FR")} FCFA.`);

    await client.query("BEGIN");

    // Verrouiller le compte
    const compteResult = await client.query(
      "SELECT * FROM comptes WHERE id = $1 FOR UPDATE", [compteId]
    );
    const compte = compteResult.rows[0];
    if (!compte) { await client.query("ROLLBACK"); return fail(res, "Compte introuvable.", 404); }
    if (compte.statut !== "ACTIF") { await client.query("ROLLBACK"); return fail(res, `Ce compte est ${compte.statut.toLowerCase()}.`); }

    const soldeAvant = Number(compte.solde);
    let soldeApres;

    if (typeTransaction === "DEPOT") {
      soldeApres = soldeAvant + montantNum;
    } else {
      if (soldeAvant < montantNum) {
        await client.query("ROLLBACK");
        return fail(res, `Solde insuffisant. Solde actuel : ${soldeAvant.toLocaleString("fr-FR")} ${compte.devise}.`);
      }
      soldeApres = soldeAvant - montantNum;
    }

    // Mettre à jour le solde
    await client.query(
      "UPDATE comptes SET solde = $1, updated_at = NOW() WHERE id = $2",
      [soldeApres, compteId]
    );

    // Enregistrer la transaction
    const txResult = await client.query(
      `INSERT INTO transactions (compte_id, type_transaction, montant, frais, solde_avant, solde_apres, description)
       VALUES ($1,$2,$3,0,$4,$5,$6) RETURNING *`,
      [compteId, typeTransaction, montantNum, soldeAvant, soldeApres, description || null]
    );

    await client.query("COMMIT");

    const msg = typeTransaction === "DEPOT" ? "Dépôt effectué avec succès." : "Retrait effectué avec succès.";
    return created(res, msg, formatTx(txResult.rows[0], compte));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSFERT
// ═══════════════════════════════════════════════════════════════════════════
router.post("/transferts", async (req, res) => {
  const client = await pool.connect();
  try {
    const { compteSourceId, compteDestinataireId, montant, description } = req.body;

    if (!compteSourceId || !compteDestinataireId || montant == null)
      return fail(res, "compteSourceId, compteDestinataireId et montant sont obligatoires.");

    const montantNum = Number(montant);
    if (isNaN(montantNum) || montantNum < DEPOT_MIN)
      return fail(res, `Le montant minimum de transfert est de ${DEPOT_MIN.toLocaleString("fr-FR")} FCFA.`);

    if (compteSourceId === compteDestinataireId)
      return fail(res, "Impossible de transférer vers le même compte.");

    await client.query("BEGIN");

    // Verrouiller les deux comptes (ordre fixe pour éviter deadlock)
    const [idA, idB] = [compteSourceId, compteDestinataireId].sort();
    await client.query("SELECT id FROM comptes WHERE id IN ($1,$2) FOR UPDATE", [idA, idB]);

    const srcResult  = await client.query("SELECT * FROM comptes WHERE id = $1", [compteSourceId]);
    const destResult = await client.query("SELECT * FROM comptes WHERE id = $1", [compteDestinataireId]);

    const source = srcResult.rows[0];
    const dest   = destResult.rows[0];

    if (!source)  { await client.query("ROLLBACK"); return fail(res, "Compte source introuvable.", 404); }
    if (!dest)    { await client.query("ROLLBACK"); return fail(res, "Compte destinataire introuvable.", 404); }
    if (source.statut !== "ACTIF") { await client.query("ROLLBACK"); return fail(res, "Le compte source est inactif."); }
    if (dest.statut   !== "ACTIF") { await client.query("ROLLBACK"); return fail(res, "Le compte destinataire est inactif."); }

    // ── Calcul frais inter-bancaires
    let frais = 0;
    if (source.banque !== dest.banque) {
      frais = Math.ceil(montantNum * TAUX_FRAIS);
      if (frais < FRAIS_MIN) frais = FRAIS_MIN;
    }
    const totalDebit = montantNum + frais;

    const soldeAvantSource = Number(source.solde);
    if (soldeAvantSource < totalDebit) {
      await client.query("ROLLBACK");
      return fail(res,
        `Solde insuffisant. Solde : ${soldeAvantSource.toLocaleString("fr-FR")} ${source.devise}. ` +
        `Total requis (montant + frais) : ${totalDebit.toLocaleString("fr-FR")} FCFA.`
      );
    }

    const soldeApresSource = soldeAvantSource - totalDebit;
    const soldeAvantDest   = Number(dest.solde);
    const soldeApresDest   = soldeAvantDest + montantNum;

    // Mettre à jour les soldes
    await client.query("UPDATE comptes SET solde=$1, updated_at=NOW() WHERE id=$2", [soldeApresSource, compteSourceId]);
    await client.query("UPDATE comptes SET solde=$1, updated_at=NOW() WHERE id=$2", [soldeApresDest,   compteDestinataireId]);

    const descEmis = `Transfert vers ${dest.numero_compte}` +
      (source.banque !== dest.banque ? ` (${dest.banque}) — frais : ${frais.toLocaleString("fr-FR")} FCFA` : "") +
      (description ? ` | ${description}` : "");

    const descRecu = `Transfert de ${source.numero_compte} (${source.banque})` +
      (description ? ` | ${description}` : "");

    // Enregistrer les deux lignes de transaction
    const txEmisResult = await client.query(
      `INSERT INTO transactions (compte_id, type_transaction, montant, frais, solde_avant, solde_apres, compte_contrepartie_id, description)
       VALUES ($1,'TRANSFERT_EMIS',$2,$3,$4,$5,$6,$7) RETURNING *`,
      [compteSourceId, montantNum, frais, soldeAvantSource, soldeApresSource, compteDestinataireId, descEmis]
    );
    const txRecuResult = await client.query(
      `INSERT INTO transactions (compte_id, type_transaction, montant, frais, solde_avant, solde_apres, compte_contrepartie_id, description)
       VALUES ($1,'TRANSFERT_RECU',$2,0,$3,$4,$5,$6) RETURNING *`,
      [compteDestinataireId, montantNum, soldeAvantDest, soldeApresDest, compteSourceId, descRecu]
    );

    await client.query("COMMIT");

    return created(res, "Transfert effectué avec succès.", [
      { ...formatTx(txEmisResult.rows[0], source), montantTotal: totalDebit },
      formatTx(txRecuResult.rows[0], dest),
    ]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  HISTORIQUE
// ═══════════════════════════════════════════════════════════════════════════
router.get("/compte/:compteId", async (req, res) => {
  try {
    const compte = await pool.query("SELECT * FROM comptes WHERE id = $1", [req.params.compteId]);
    if (!compte.rows[0]) return fail(res, "Compte introuvable.", 404);

    const result = await pool.query(
      "SELECT * FROM transactions WHERE compte_id = $1 ORDER BY created_at DESC",
      [req.params.compteId]
    );
    return ok(res, `${result.rows.length} transaction(s) trouvée(s).`,
      result.rows.map(t => formatTx(t, compte.rows[0]))
    );
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── DÉTAIL UNE TRANSACTION ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT t.*, c.numero_compte, c.devise FROM transactions t JOIN comptes c ON t.compte_id = c.id WHERE t.id = $1",
      [req.params.id]
    );
    if (!result.rows[0]) return fail(res, "Transaction introuvable.", 404);
    return ok(res, "Transaction trouvée.", result.rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, "Erreur interne du serveur.", 500);
  }
});

// ─── Helper format ─────────────────────────────────────────────────────────
function formatTx(tx, compte) {
  return {
    id: tx.id,
    compteId: tx.compte_id,
    numeroCompte: compte.numero_compte,
    typeTransaction: tx.type_transaction,
    montant: Number(tx.montant),
    frais: Number(tx.frais || 0),
    montantTotal: Number(tx.montant) + Number(tx.frais || 0),
    soldeAvant: Number(tx.solde_avant),
    soldeApres: Number(tx.solde_apres),
    devise: compte.devise,
    compteContrepartieId: tx.compte_contrepartie_id || null,
    description: tx.description,
    createdAt: tx.created_at,
  };
}

export default router;