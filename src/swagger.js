import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Banking API",
      version: "1.0.0",
      description: `
## API Bancaire — Cameroun

Gestion de comptes bancaires multi-banques avec transferts inter-bancaires.

### Règles métier
- **Dépôt minimum** : 1 000 FCFA
- **Retrait minimum** : 1 000 000 FCFA
- **Transfert même banque** : aucun frais
- **Transfert banques différentes** : 1% du montant (minimum 500 FCFA)

### Banques disponibles
\`ECOBANK\`, \`CCA\`, \`UBA\`, \`AFRILAND\`, \`SGBC\`, \`BICEC\`, \`SCB\`, \`BGFI\`, \`NBC\`, \`ATLANTIC\`
      `,
    },
    servers: [
      { url: "/", description: "Serveur actuel" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obtenu via POST /api/auth/login",
        },
      },
      schemas: {
        // ── Utilisateur ──────────────────────────────────────────────────
        UtilisateurResponse: {
          type: "object",
          properties: {
            id:         { type: "string", format: "uuid" },
            nom:        { type: "string", example: "Kamga" },
            prenom:     { type: "string", example: "Jean" },
            email:      { type: "string", format: "email", example: "jean@ecobank.cm" },
            telephone:  { type: "string", example: "699000001" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["nom", "prenom", "email", "motDePasse"],
          properties: {
            nom:        { type: "string", example: "Kamga" },
            prenom:     { type: "string", example: "Jean" },
            email:      { type: "string", format: "email", example: "jean@ecobank.cm" },
            motDePasse: { type: "string", example: "MotDePasse123!" },
            telephone:  { type: "string", example: "699000001" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "motDePasse"],
          properties: {
            email:      { type: "string", format: "email", example: "jean@ecobank.cm" },
            motDePasse: { type: "string", example: "MotDePasse123!" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token:  { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
            type:   { type: "string", example: "Bearer" },
            id:     { type: "string", format: "uuid" },
            nom:    { type: "string", example: "Kamga" },
            prenom: { type: "string", example: "Jean" },
            email:  { type: "string", example: "jean@ecobank.cm" },
          },
        },
        // ── Compte ───────────────────────────────────────────────────────
        CompteResponse: {
          type: "object",
          properties: {
            id:            { type: "string", format: "uuid" },
            user_id:       { type: "string", format: "uuid" },
            numero_compte: { type: "string", example: "ECO8058415907" },
            type_compte:   { type: "string", enum: ["COURANT", "EPARGNE"] },
            banque:        { type: "string", enum: ["ECOBANK","CCA","UBA","AFRILAND","SGBC","BICEC","SCB","BGFI","NBC","ATLANTIC"] },
            solde:         { type: "number", example: 15000 },
            devise:        { type: "string", example: "XAF" },
            statut:        { type: "string", enum: ["ACTIF", "INACTIF", "BLOQUE"] },
            nom:           { type: "string", example: "Kamga" },
            prenom:        { type: "string", example: "Jean" },
            created_at:    { type: "string", format: "date-time" },
            updated_at:    { type: "string", format: "date-time" },
          },
        },
        CreateCompteRequest: {
          type: "object",
          required: ["utilisateurId", "typeCompte", "banque"],
          properties: {
            utilisateurId: { type: "string", format: "uuid" },
            typeCompte:    { type: "string", enum: ["COURANT", "EPARGNE"] },
            banque:        { type: "string", enum: ["ECOBANK","CCA","UBA","AFRILAND","SGBC","BICEC","SCB","BGFI","NBC","ATLANTIC"] },
            devise:        { type: "string", example: "XAF", default: "XAF" },
          },
        },
        // ── Transaction ──────────────────────────────────────────────────
        TransactionResponse: {
          type: "object",
          properties: {
            id:                    { type: "string", format: "uuid" },
            compteId:              { type: "string", format: "uuid" },
            numeroCompte:          { type: "string", example: "ECO8058415907" },
            typeTransaction:       { type: "string", enum: ["DEPOT","RETRAIT","TRANSFERT_EMIS","TRANSFERT_RECU"] },
            montant:               { type: "number", example: 5000 },
            frais:                 { type: "number", example: 500, description: "Frais inter-bancaires (0 si même banque)" },
            montantTotal:          { type: "number", example: 5500, description: "montant + frais" },
            soldeAvant:            { type: "number", example: 10000 },
            soldeApres:            { type: "number", example: 15000 },
            devise:                { type: "string", example: "XAF" },
            compteContrepartieId:  { type: "string", format: "uuid", nullable: true },
            description:           { type: "string", nullable: true },
            createdAt:             { type: "string", format: "date-time" },
          },
        },
        DepotRetraitRequest: {
          type: "object",
          required: ["compteId", "typeTransaction", "montant"],
          properties: {
            compteId:        { type: "string", format: "uuid" },
            typeTransaction: { type: "string", enum: ["DEPOT", "RETRAIT"],
              description: "DEPOT min 1 000 FCFA | RETRAIT min 1 000 000 FCFA" },
            montant:         { type: "number", example: 5000 },
            description:     { type: "string", example: "Salaire du mois" },
          },
        },
        TransfertRequest: {
          type: "object",
          required: ["compteSourceId", "compteDestinataireId", "montant"],
          properties: {
            compteSourceId:        { type: "string", format: "uuid" },
            compteDestinataireId:  { type: "string", format: "uuid" },
            montant:               { type: "number", example: 10000, description: "Minimum 1 000 FCFA" },
            description:           { type: "string", example: "Remboursement" },
          },
        },
        // ── Réponses génériques ──────────────────────────────────────────
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data:    { },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Message d'erreur" },
          },
        },
      },
    },
    // Toutes les routes sauf /auth nécessitent un Bearer token
    security: [{ bearerAuth: [] }],

    // ════════════════════════════════════════════════════════════════════
    //  PATHS (documentation de chaque endpoint)
    // ════════════════════════════════════════════════════════════════════
    paths: {
      // ── AUTH ───────────────────────────────────────────────────────────
      "/api/auth/register": {
        post: {
          tags: ["Authentification"],
          summary: "Créer un compte utilisateur",
          description: "Inscription publique — aucun token requis.",
          security: [],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } },
          },
          responses: {
            201: { description: "Utilisateur créé", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { properties: { data: { $ref: "#/components/schemas/UtilisateurResponse" } } }] } } } },
            400: { description: "Email déjà utilisé ou champs manquants", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Authentification"],
          summary: "Se connecter et obtenir un token JWT",
          description: "Retourne un token Bearer à utiliser dans le header `Authorization`.",
          security: [],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
          },
          responses: {
            200: { description: "Connexion réussie", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { properties: { data: { $ref: "#/components/schemas/AuthResponse" } } }] } } } },
            400: { description: "Email ou mot de passe incorrect", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          },
        },
      },
      // ── UTILISATEURS ───────────────────────────────────────────────────
      "/api/utilisateurs": {
        get: {
          tags: ["Utilisateurs"],
          summary: "Lister tous les utilisateurs",
          responses: { 200: { description: "Liste des utilisateurs" } },
        },
      },
      "/api/utilisateurs/{id}": {
        get: {
          tags: ["Utilisateurs"],
          summary: "Obtenir un utilisateur par son ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            200: { description: "Utilisateur trouvé" },
            404: { description: "Introuvable" },
          },
        },
        put: {
          tags: ["Utilisateurs"],
          summary: "Mettre à jour un utilisateur (champs optionnels)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: { "application/json": { schema: {
              properties: {
                nom:       { type: "string" },
                prenom:    { type: "string" },
                email:     { type: "string", format: "email" },
                telephone: { type: "string" },
              },
            } } },
          },
          responses: { 200: { description: "Mis à jour" }, 404: { description: "Introuvable" } },
        },
        delete: {
          tags: ["Utilisateurs"],
          summary: "Supprimer un utilisateur (et ses comptes)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Supprimé" }, 404: { description: "Introuvable" } },
        },
      },
      // ── COMPTES ────────────────────────────────────────────────────────
      "/api/comptes": {
        post: {
          tags: ["Comptes"],
          summary: "Créer un compte bancaire",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCompteRequest" } } },
          },
          responses: {
            201: { description: "Compte créé", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { properties: { data: { $ref: "#/components/schemas/CompteResponse" } } }] } } } },
            400: { description: "Données invalides" },
            404: { description: "Utilisateur introuvable" },
          },
        },
        get: {
          tags: ["Comptes"],
          summary: "Lister tous les comptes",
          responses: { 200: { description: "Liste des comptes" } },
        },
      },
      "/api/comptes/{id}": {
        get: {
          tags: ["Comptes"],
          summary: "Obtenir un compte par son ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Compte trouvé" }, 404: { description: "Introuvable" } },
        },
      },
      "/api/comptes/utilisateur/{utilisateurId}": {
        get: {
          tags: ["Comptes"],
          summary: "Lister les comptes d'un utilisateur",
          parameters: [{ name: "utilisateurId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Comptes de l'utilisateur" }, 404: { description: "Utilisateur introuvable" } },
        },
      },
      // ── TRANSACTIONS ───────────────────────────────────────────────────
      "/api/transactions": {
        post: {
          tags: ["Transactions"],
          summary: "Effectuer un dépôt ou un retrait",
          description: `
**Règles :**
- DEPOT : montant minimum **1 000 FCFA**
- RETRAIT : montant minimum **1 000 000 FCFA**
- Le compte doit être ACTIF
- Solde suffisant pour un retrait
          `,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/DepotRetraitRequest" } } },
          },
          responses: {
            201: { description: "Transaction effectuée", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { properties: { data: { $ref: "#/components/schemas/TransactionResponse" } } }] } } } },
            400: { description: "Montant invalide / solde insuffisant / compte inactif" },
            404: { description: "Compte introuvable" },
          },
        },
      },
      "/api/transactions/transferts": {
        post: {
          tags: ["Transactions"],
          summary: "Transférer de l'argent entre deux comptes",
          description: `
**Règles :**
- Montant minimum : **1 000 FCFA**
- **Même banque** → 0 frais
- **Banques différentes** → 1% du montant (minimum 500 FCFA)
- Retourne 2 transactions : TRANSFERT_EMIS + TRANSFERT_RECU
          `,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/TransfertRequest" } } },
          },
          responses: {
            201: { description: "Transfert effectué — retourne [TRANSFERT_EMIS, TRANSFERT_RECU]" },
            400: { description: "Solde insuffisant / montant invalide / même compte" },
            404: { description: "Compte source ou destinataire introuvable" },
          },
        },
      },
      "/api/transactions/compte/{compteId}": {
        get: {
          tags: ["Transactions"],
          summary: "Historique des transactions d'un compte",
          parameters: [{ name: "compteId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Liste des transactions triée par date" }, 404: { description: "Compte introuvable" } },
        },
      },
      "/api/transactions/{id}": {
        get: {
          tags: ["Transactions"],
          summary: "Détails d'une transaction",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Transaction trouvée" }, 404: { description: "Introuvable" } },
        },
      },
    },
  },
  apis: [], // on utilise la définition inline ci-dessus
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
