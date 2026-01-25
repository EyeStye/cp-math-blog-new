const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set("trust proxy", 1); // ADD THIS LINE

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static("public"));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-this-in-production",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  }),
);

// Initialize SQLite database
const db = new sqlite3.Database("./blog.db", (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database");
    initDatabase();
  }
});

// Create tables if they don't exist
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      updated INTEGER NOT NULL
    )
  `);

  // db.run(`
  //   CREATE TABLE IF NOT EXISTS settings (
  //     key TEXT PRIMARY KEY,
  //     value TEXT NOT NULL
  //   )
  // `);
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ===== AUTH ROUTES =====

// Check if password is set
app.get("/api/auth/check", (req, res) => {
  db.get("SELECT id FROM admin LIMIT 1", (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({
      hasPassword: !!row,
      isAuthenticated: !!req.session.isAuthenticated,
    });
  });
});

// Set initial password
app.post("/api/auth/setup", async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res
      .status(400)
      .json({ error: "Password must be at least 4 characters" });
  }

  // Check if password already exists
  db.get("SELECT id FROM admin LIMIT 1", async (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (row) {
      return res.status(400).json({ error: "Password already set" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO admin (password) VALUES (?)",
      [hashedPassword],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to set password" });
        }
        req.session.isAuthenticated = true;
        res.json({ success: true });
      },
    );
  });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;

  db.get("SELECT password FROM admin LIMIT 1", async (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(400).json({ error: "No password set" });
    }

    const match = await bcrypt.compare(password, row.password);
    if (match) {
      req.session.isAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Incorrect password" });
    }
  });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ===== POST ROUTES =====

// Get all posts
app.get("/api/posts", (req, res) => {
  db.all("SELECT * FROM posts ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    const posts = rows.map((row) => ({
      ...row,
      tags: JSON.parse(row.tags),
    }));

    res.json(posts);
  });
});

// Get single post
app.get("/api/posts/:id", (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      ...row,
      tags: JSON.parse(row.tags),
    });
  });
});

// Create post (requires auth)
app.post("/api/posts", isAuthenticated, (req, res) => {
  const {
    id,
    title,
    description,
    content,
    category,
    tags,
    difficulty,
    timestamp,
    updated,
  } = req.body;

  if (!title || !description || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `INSERT INTO posts (id, title, description, content, category, tags, difficulty, timestamp, updated) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      description,
      content,
      category,
      JSON.stringify(tags),
      difficulty,
      timestamp,
      updated,
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create post" });
      }
      res.json({ success: true });
    },
  );
});

// Update post (requires auth)
app.put("/api/posts/:id", isAuthenticated, (req, res) => {
  const { title, description, content, category, tags, difficulty, updated } =
    req.body;

  db.run(
    `UPDATE posts 
     SET title = ?, description = ?, content = ?, category = ?, tags = ?, difficulty = ?, updated = ?
     WHERE id = ?`,
    [
      title,
      description,
      content,
      category,
      JSON.stringify(tags),
      difficulty,
      updated,
      req.params.id,
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to update post" });
      }
      res.json({ success: true });
    },
  );
});

// Delete post (requires auth)
app.delete("/api/posts/:id", isAuthenticated, (req, res) => {
  db.run("DELETE FROM posts WHERE id = ?", [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete post" });
    }
    res.json({ success: true });
  });
});

// ===== SETTINGS ROUTES =====

// Get setting
// app.get("/api/settings/:key", (req, res) => {
//   db.get(
//     "SELECT value FROM settings WHERE key = ?",
//     [req.params.key],
//     (err, row) => {
//       if (err) {
//         return res.status(500).json({ error: "Database error" });
//       }
//       res.json({ value: row ? row.value : null });
//     },
//   );
// });

// Set setting
// app.post("/api/settings/:key", (req, res) => {
//   const { value } = req.body;

//   db.run(
//     `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
//     [req.params.key, value],
//     (err) => {
//       if (err) {
//         return res.status(500).json({ error: "Failed to save setting" });
//       }
//       res.json({ success: true });
//     },
//   );
// });

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err);
    }
    console.log("Database connection closed");
    process.exit(0);
  });
});
