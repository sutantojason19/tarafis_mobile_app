/**
 * Database connection module
 * ---------------------------
 * Creates and exports a MariaDB connection pool using environment variables.
 *
 * Why a connection pool?
 * - Reuses database connections → improves performance & reduces overhead.
 * - Automatically handles waiting requests during high load.
 * - Prevents "too many connections" errors by limiting active connections.
 *
 * Environment variables required:
 *   DB_HOST       → Database hostname or IP address
 *   DB_USER       → Database username
 *   DB_PASSWORD   → Password for the DB user
 *   DB_NAME       → Default database/schema
 *
 * This file should be imported anywhere the backend needs DB access:
 *   const pool = require('../db');
 *
 * DO NOT hardcode credentials in source code — keep all sensitive values in .env.
 */

const mariadb = require('mariadb');
require('dotenv').config();

/**
 * Create a connection pool.
 *
 * connectionLimit:
 *   - Maximum number of open simultaneous DB connections.
 *   - Tune based on backend traffic and DB server capacity.
 */
const pool = mariadb.createPool({
  host: process.env.DB_HOST,         // e.g., "localhost" or production DB server address
  user: process.env.DB_USER,         // MySQL/MariaDB username
  password: process.env.DB_PASSWORD, // Password (DO NOT hardcode; use .env)
  database: process.env.DB_NAME,     // Database/schema name
  connectionLimit: 5,                // Adjust based on expected server load
});

module.exports = pool;

