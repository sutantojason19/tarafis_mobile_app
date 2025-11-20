// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes); // all form endpoints centralized

// Static file access (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Server config
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // allow external access

app.listen(PORT, HOST, () => {
  console.log(`Server running at: http://${HOST}:${PORT}`);
});
