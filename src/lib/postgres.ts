import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.User,
  password: process.env.mypassword,
  database: process.env.lednadb,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => {
  console.log("Postgres connected");
});

pool.on("error", (err) => {
  console.error("Postgres pool error", err);
});

export default pool;