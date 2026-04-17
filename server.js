const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
const dbPath = path.join(__dirname, 'urls.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table initialized');
    }
  });

  // Create urls table with user_id
  db.run(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      short_code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      clicks INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating urls table:', err);
    } else {
      console.log('URLs table initialized');
    }
  });
}

// Helper function to generate short code
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// =================== AUTH ROUTES ===================

// POST - Register new user
app.post('/api/auth/register', async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  // Validations
  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.run(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: users.email')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          if (err.message.includes('UNIQUE constraint failed: users.username')) {
            return res.status(400).json({ error: 'Username already taken' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }

        // Create token
        const token = jwt.sign(
          { id: this.lastID, username, email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Account created successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });
});

// GET - Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// =================== URL ROUTES ===================

// GET home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST - Create shortened URL (requires authentication)
app.post('/api/shorten', authenticateToken, (req, res) => {
  const { url, customCode } = req.body;
  const userId = req.user.id;

  // Validate URL
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  // Generate or validate custom code
  let shortCode = customCode;
  
  if (!shortCode) {
    shortCode = generateShortCode();
  } else {
    // Validate custom code format (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9]{3,20}$/.test(shortCode)) {
      return res.status(400).json({ error: 'Custom code must be alphanumeric, 3-20 characters' });
    }
  }

  // Check if code already exists
  db.get('SELECT * FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      return res.status(400).json({ error: 'This code is already taken' });
    }

    // Insert into database
    db.run(
      'INSERT INTO urls (user_id, short_code, original_url) VALUES (?, ?, ?)',
      [userId, shortCode, url],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create shortened URL' });
        }

        res.json({
          shortCode,
          shortUrl: `http://localhost:${PORT}/${shortCode}`,
          originalUrl: url
        });
      }
    );
  });
});

// GET - Redirect to original URL
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  db.get('SELECT * FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }

    // Increment click count
    db.run('UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?', [shortCode]);

    // Redirect to original URL
    res.redirect(row.original_url);
  });
});

// GET - Get URL analytics
app.get('/api/stats/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  db.get('SELECT * FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({
      shortCode: row.short_code,
      originalUrl: row.original_url,
      clicks: row.clicks,
      createdAt: row.created_at
    });
  });
});

// GET - Get user's URLs (requires authentication)
app.get('/api/urls/user', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT * FROM urls WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows || []);
  });
});

// GET - Get all public URLs (for public page)
app.get('/api/urls/all', (req, res) => {
  db.all('SELECT * FROM urls ORDER BY created_at DESC LIMIT 100', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// DELETE - Remove a shortened URL (requires authentication)
app.delete('/api/urls/:shortCode', authenticateToken, (req, res) => {
  const { shortCode } = req.params;
  const userId = req.user.id;

  // Check if URL belongs to user
  db.get('SELECT * FROM urls WHERE short_code = ? AND user_id = ?', [shortCode, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'URL not found or not owned by you' });
    }

    db.run('DELETE FROM urls WHERE short_code = ?', [shortCode], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ message: 'URL deleted successfully' });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`URL Shortener server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
