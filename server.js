// server.js (Updated and runnable)

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs'); // File System module for directory creation
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Setup ---
const DB_DIR = path.join(__dirname, 'database'); // Database directory
const DB_PATH = path.join(DB_DIR, 'creature_breeder.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
    try {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`Database directory created at ${DB_DIR}`);
    } catch (dirError) {
        console.error(`Error creating database directory ${DB_DIR}:`, dirError);
        process.exit(1); // Exit if we can't create the DB directory
    }
}

let db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        // Decide if you want to exit or try to run without DB
        // For now, we'll log and continue, but API calls might fail.
    } else {
        console.log(`Connected to the SQLite database at ${DB_PATH}`);
        db.run(`CREATE TABLE IF NOT EXISTS saved_games (
            username TEXT PRIMARY KEY,
            game_state TEXT,
            last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (tableErr) => {
            if (tableErr) {
                console.error("Error creating 'saved_games' table:", tableErr.message);
            } else {
                console.log("Table 'saved_games' is ready.");
            }
        });
    }
});

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static files from the project root directory
// This assumes your index.html and client-side JS/CSS are in the same directory as server.js
// If they are in a 'public' subfolder, change to: app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
console.log(`Serving static files from: ${__dirname}`);


// --- API Routes ---

// Get list of saved game usernames
app.get('/api/games', (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available." });
    db.all("SELECT username FROM saved_games ORDER BY last_saved DESC", [], (err, rows) => {
        if (err) {
            console.error("/api/games error:", err.message);
            res.status(500).json({ error: "Failed to retrieve saved games." });
            return;
        }
        const usernames = rows.map(r => r.username);
        res.json(usernames);
    });
});

// Load a game state
app.get('/api/load/:username', (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available." });
    const username = req.params.username;
    db.get("SELECT game_state FROM saved_games WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error(`/api/load/${username} error:`, err.message);
            res.status(500).json({ error: "Failed to load game state." });
            return;
        }
        if (row) {
            try {
                const gameState = JSON.parse(row.game_state);
                res.json(gameState);
            } catch (parseError) {
                console.error("Error parsing game state for user:", username, parseError);
                res.status(500).json({ error: "Failed to parse game state from database." });
            }
        } else {
            res.status(404).json({ message: "No save game found for this user." });
        }
    });
});

// Save a game state
app.post('/api/save', (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available." });
    const { username, gameState } = req.body;
    if (!username || !gameState) {
        return res.status(400).json({ error: "Username and gameState are required." });
    }
    const gameStateString = JSON.stringify(gameState);

    const stmt = `INSERT OR REPLACE INTO saved_games (username, game_state, last_saved)
                  VALUES (?, ?, CURRENT_TIMESTAMP)`;
    db.run(stmt, [username, gameStateString], function(err) {
        if (err) {
            console.error("/api/save error:", err.message);
            res.status(500).json({ error: "Failed to save game." });
            return;
        }
        console.log(`Game saved/updated for ${username}. Rows affected: ${this.changes}`);
        res.status(200).json({ message: "Game saved successfully." });
    });
});

// Optional: Delete a save game
app.delete('/api/delete/:username', (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available." });
    const username = req.params.username;
    db.run("DELETE FROM saved_games WHERE username = ?", [username], function(err) {
        if (err) {
            console.error(`/api/delete/${username} error:`, err.message);
            res.status(500).json({ error: "Failed to delete game." });
            return;
        }
        if (this.changes > 0) {
            res.status(200).json({ message: `Save game for ${username} deleted.` });
        } else {
            res.status(404).json({ message: `No save game found for ${username} to delete.` });
        }
    });
});

// --- Serve the main HTML file for any other GET requests (SPA behavior) ---
// This ensures that if a user refreshes on a client-side route, index.html is still served.
// app.get('*', (req, res, next) => {
//     // Check if the request is for an API route, if so, don't serve index.html
//     if (req.path.startsWith('/api/')) {
//         return next();
//     }
//     const indexPath = path.join(__dirname, 'index.html');
//     fs.access(indexPath, fs.constants.F_OK, (err) => {
//         if (err) {
//             console.warn(`index.html not found at ${indexPath}. Ensure it's in the project root or adjust static path.`);
//             res.status(404).send("Client entry point (index.html) not found.");
//         } else {
//             res.sendFile(indexPath);
//         }
//     });
// });


// --- Start Server ---
// This MUST be the last major step for the server to stay running.
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("If the server starts and then immediately stops, check for errors above this message.");
    console.log("Ensure all 'require' statements at the top are for correctly installed packages.");
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server and DB connection.');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error("Error closing database:", err.message);
            } else {
                console.log('SQLite database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error:', err);
  // Optionally, you might want to exit the process for uncaught exceptions
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally, you might want to exit the process
  // process.exit(1);
});