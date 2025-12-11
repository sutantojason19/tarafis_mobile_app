/**
 * Main application entry point.
 * ------------------------------
 * Responsibilities:
 * - Initialize Express application
 * - Load environment variables
 * - Configure global middleware (CORS, JSON parsing)
 * - Register route modules (users, forms)
 * - Serve static uploaded files
 * - Start the HTTP server
 *
 * Runs as the root of the backend system.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Route modules
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');

// Load .env variables BEFORE using process.env
dotenv.config();

const app = express();

/* ------------------------------------------------------------------
 * GLOBAL MIDDLEWARE
 * ------------------------------------------------------------------
 */

/**
 * Enable Cross-Origin Resource Sharing.
 * Allows your React Native frontend to access backend resources.
 */
app.use(cors());

/**
 * Parse JSON request bodies.
 * Needed for POST/PUT/PATCH routes that send JSON.
 */
app.use(express.json());

/* ------------------------------------------------------------------
 * ROUTE REGISTRATION
 * ------------------------------------------------------------------
 * All API endpoints should be grouped by feature/module.
 * For example:
 * - /api/users handled by userRoutes
 * - /api/forms handled by formRoutes
 */

app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes); // centralized form endpoints

/* ------------------------------------------------------------------
 * STATIC FILE SERVING
 * ------------------------------------------------------------------
 * Exposes uploaded images under:
 *    http://<host>:<port>/uploads/<filename>
 *
 * NOTE: Files are stored in /uploads by multer (in formRoutes).
 */

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ------------------------------------------------------------------
 * SERVER STARTUP
 * ------------------------------------------------------------------
 */

const PORT = process.env.PORT || 3000;

/**
 * Bind to 0.0.0.0 so the server is accessible from:
 * - Local network (phones running the app)
 * - Android emulator
 * - Other machines
 *
 * If you use 'localhost', external devices cannot connect.
 */
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✓ Server running at http://${HOST}:${PORT}`);
});
