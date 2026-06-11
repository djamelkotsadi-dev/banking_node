import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const isLocal = process.env.DATABASE_URL?.includes("localhost") ||
                process.env.DATABASE_URL?.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function initDB() {
  // Activer l'extension uuid-ossp pour gen_random_uuid()
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nom         VARCHAR(100) NOT NULL,
      prenom      VARCHAR(100) NOT NULL,
      email       VARCHAR(150) NOT NULL UNIQUE,
      telephone   VARCHAR(25),
      mot_de_passe TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comptes (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id        UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      numero_compte  VARCHAR(25) NOT NULL UNIQUE,
      type_compte    VARCHAR(20) NOT NULL CHECK (type_compte IN ('COURANT','EPARGNE')),
      banque         VARCHAR(30) NOT NULL,
      solde          NUMERIC(15,2) DEFAULT 0,
      devise         VARCHAR(5)  DEFAULT 'XAF',
      statut         VARCHAR(20) DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF','INACTIF','BLOQUE')),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      compte_id               UUID NOT NULL REFERENCES comptes(id),
      type_transaction        VARCHAR(30) NOT NULL CHECK (type_transaction IN ('DEPOT','RETRAIT','TRANSFERT_EMIS','TRANSFERT_RECU')),
      montant                 NUMERIC(15,2) NOT NULL,
      frais                   NUMERIC(15,2) DEFAULT 0,
      solde_avant             NUMERIC(15,2) NOT NULL,
      solde_apres             NUMERIC(15,2) NOT NULL,
      compte_contrepartie_id  UUID,
      description             TEXT,
      created_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ Tables vérifiées / créées.");
}