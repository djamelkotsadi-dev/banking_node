// helpers.js
import axios from "axios";

export const BASE_URL = "https://banking-node.onrender.com/api"; 
//export const BASE_URL = "http://localhost:8080/api";

// Instance axios qui ne throw pas sur les erreurs HTTP
export const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true,
});

// Créer un utilisateur + se connecter → retourne { token, userId, email }
export async function creerEtConnecterUtilisateur(suffix = Date.now()) {
  const email = `test_${suffix}@banking.cm`;

  await api.post("/auth/register", {
    nom: "Test",
    prenom: "User",
    email,
    motDePasse: "Test1234!",
    telephone: "699000001",
  });

  const loginRes = await api.post("/auth/login", {
    email,
    motDePasse: "Test1234!",
  });

  return {
    token: loginRes.data.data.token,
    userId: loginRes.data.data.id,
    email,
  };
}

// Créer un compte bancaire
export async function creerCompte(token, userId, banque = "ECOBANK") {
  const res = await api.post(
    "/comptes",
    { utilisateurId: userId, typeCompte: "COURANT", banque, devise: "XAF" },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.data;
}

// Faire un dépôt
export async function deposer(token, compteId, montant) {
  return api.post(
    "/transactions",
    { compteId, typeTransaction: "DEPOT", montant },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
