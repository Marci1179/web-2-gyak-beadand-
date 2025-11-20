const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 4029;

// ---------- Adatbázis kapcsolat ----------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'studb029',
  password: 'abc123',
  database: 'db029',
  charset: 'utf8_hungarian_ci'
});

db.connect(err => {
  if (err) {
    console.error('❌ Hiba az adatbázis kapcsolódásnál:', err);
  } else {
    console.log('✅ Sikeres adatbázis kapcsolat.');
  }
});

// ---------- Middlewarek ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'nagyon-titkos-kulcs-029',
    resave: false,
    saveUninitialized: false,
  })
);

// statikus fájlok
app.use('/app029', express.static(path.join(__dirname, 'public')));

// SHA-256 hash
function genPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// csak bejelentkezett user
function ensureLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/app029/login');
  }
  next();
}

// csak admin
function ensureAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Nincs jogosultságod az admin oldalhoz.');
  }
  next();
}

// ---------- Auth állapot a navbarhoz ----------
app.get('/app029/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }
  res.json({
    loggedIn: true,
    user: {
      id: req.session.user.id,
      name: req.session.user.name,
      email: req.session.user.email,
      role: req.session.user.role
    }
  });
});

// ---------- OLDALAK ----------

// Főoldal – szabadon nézhető
app.get(['/app029', '/app029/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login / Register oldalak
app.get('/app029/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/app029/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Adatbázis / Kapcsolat / CRUD – MIND SZABADON
app.get('/app029/adatbazis', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adatbazis.html'));
});

app.get('/app029/kapcsolat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kapcsolat.html'));
});

app.get('/app029/crud', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crud.html'));
});

// Üzenetek oldal – CSAK BEJELENTKEZVE
app.get('/app029/uzenetek', ensureLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uzenetek.html'));
});

// Admin oldal – CSAK ADMIN
app.get('/app029/admin', ensureAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- AUTH: login / register / logout ----------

// LOGIN
app.post('/app029/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
  db.query(sql, [email], (err, rows) => {
    if (err) {
      console.error('❌ Hiba bejelentkezéskor:', err);
      return res.status(500).send('Hiba történt a bejelentkezés során.');
    }

    if (rows.length === 0) {
      return res.redirect('/app029/login?error=1');
    }

    const user = rows[0];

    let ok = false;

    // 1) Régi (Laravel) bcrypt jelszó – $2y$..., $2a$..., $2b$...
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
      ok = bcrypt.compareSync(password, user.password);
    } 
    // 2) Új, most regisztrált SHA-256-os jelszó
    else {
      const hashed = genPassword(password);
      ok = (user.password === hashed);
    }

    if (!ok) {
      return res.redirect('/app029/login?error=1');
    }

    // sikeres login → session-be rakjuk
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role  // 'admin' vagy 'user'
    };

    if (user.role === 'admin') {
      return res.redirect('/app029/admin');
    }
    return res.redirect('/app029/');
  });
});

// REGISTER
app.post('/app029/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('Hiányzó adatok a regisztrációhoz.');
  }

  const checkSql = 'SELECT id FROM users WHERE email = ?';
  db.query(checkSql, [email], (err, rows) => {
    if (err) {
      console.error('❌ Hiba a regisztrációnál (ellenőrzés):', err);
      return res.status(500).send('Hiba történt a regisztráció során.');
    }

    if (rows.length > 0) {
      return res.redirect('/app029/register?exists=1');
    }

    const hashed = genPassword(password);
    const insertSql = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES (?, ?, ?, 'user', NOW(), NOW())
    `;

    db.query(insertSql, [name, email, hashed], err2 => {
      if (err2) {
        console.error('❌ Hiba a regisztrációnál (INSERT):', err2);
        return res.status(500).send('Hiba történt a regisztráció során.');
      }
      res.redirect('/app029/login?regok=1');
    });
  });
});

// LOGOUT
app.get('/app029/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/app029/login');
  });
});

// ---------- Kapcsolat – üzenet mentése (nyitott) ----------
app.post('/app029/kapcsolat', (req, res) => {
  const { name, email, subject, message } = req.body;

  const sql = `
    INSERT INTO messages (name, email, subject, message, created_at, updated_at)
    VALUES (?, ?, ?, ?, NOW(), NOW())
  `;

  db.query(sql, [name, email, subject || null, message], err => {
    if (err) {
      console.error('❌ Hiba az üzenet mentésekor:', err);
      return res.status(500).send('Hiba történt az üzenet mentésekor.');
    }
    res.redirect('/app029/kapcsolat?siker=1');
  });
});

// ---------- API-k ----------

// Adatbázis menü – 3 tábla JOIN (nyitott)
app.get('/app029/api/adatbazis', (req, res) => {
  const sql = `
    SELECT
      gp.\`date\`       AS race_date,
      gp.\`name\`       AS grand_prix_name,
      gp.\`location\`   AS location,
      p.\`name\`        AS pilot_name,
      p.\`nationality\` AS nationality,
      r.\`team\`        AS team,
      COALESCE(r.\`engine\`, r.\`chassis\`) AS engine,
      r.\`place\`       AS place
    FROM \`results\` r
    JOIN \`pilots\` p
      ON r.\`pilot_id\` = p.\`id\`
    JOIN \`grands_prix\` gp
      ON r.\`grand_prix_id\` = gp.\`id\`
    ORDER BY gp.\`date\`, r.\`place\`
    LIMIT 200;
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Hiba az összevont lekérdezésnél:', err);
      return res.status(500).json({ error: 'Hiba az adatok lekérdezésekor.' });
    }
    res.json(rows);
  });
});

// Üzenetek lista – CSAK BEJELENTKEZVE (regisztrált látogató + admin)
app.get('/app029/api/messages', ensureLoggedIn, (req, res) => {
  const sql = `
    SELECT id, name, email, subject, message, created_at
    FROM messages
    ORDER BY created_at DESC, id DESC;
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Hiba az üzenetek lekérdezésekor:', err);
      return res.status(500).json({ error: 'Hiba az üzenetek lekérdezésekor.' });
    }
    res.json(rows);
  });
});

// ---------- Admin API – users CRUD (csak admin) ----------

// lista
app.get('/app029/api/users', ensureAdmin, (req, res) => {
  const sql = `
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id;
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Hiba a felhasználók lekérdezésekor:', err);
      return res.status(500).json({ error: 'Hiba az adatok lekérdezésekor.' });
    }
    res.json(rows);
  });
});

// módosítás
app.put('/app029/api/users/:id', ensureAdmin, (req, res) => {
  const id = req.params.id;
  const { name, email, role } = req.body;

  const sql = `
    UPDATE users
    SET name = ?, email = ?, role = ?, updated_at = NOW()
    WHERE id = ?;
  `;

  db.query(sql, [name, email, role, id], (err, result) => {
    if (err) {
      console.error('❌ Hiba a felhasználó módosításakor:', err);
      return res.status(500).json({ error: 'Hiba a módosítás során.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Nincs ilyen felhasználó.' });
    }

    db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [id],
      (err2, rows) => {
        if (err2) {
          console.error('❌ Hiba a frissített felhasználó visszaolvasásakor:', err2);
          return res.status(500).json({ error: 'Hiba a módosítás után.' });
        }
        res.json(rows[0]);
      }
    );
  });
});

// törlés
app.delete('/app029/api/users/:id', ensureAdmin, (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('❌ Hiba a felhasználó törlésekor:', err);
      return res.status(500).json({ error: 'Hiba a törlés során.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Nincs ilyen felhasználó.' });
    }
    res.json({ success: true });
  });
});

// ---------- Pilóták CRUD API ----------

// lista
app.get('/app029/api/pilots', (req, res) => {
  const sql = `
    SELECT id, legacy_id, name, gender, birth_date, nationality
    FROM pilots
    ORDER BY id;
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Hiba a pilóták lekérdezésénél:', err);
      return res.status(500).json({ error: 'Hiba az adatok lekérdezésekor.' });
    }
    res.json(rows);
  });
});

// beszúrás
app.post('/app029/api/pilots', (req, res) => {
  let { legacy_id, name, gender, birth_date, nationality } = req.body;

  legacy_id = legacy_id || null;
  birth_date = birth_date || null;

  const sql = `
    INSERT INTO pilots (legacy_id, name, gender, birth_date, nationality)
    VALUES (?, ?, ?, ?, ?);
  `;

  db.query(sql, [legacy_id, name, gender, birth_date, nationality], (err, result) => {
    if (err) {
      console.error('Hiba az új pilóta beszúrásakor:', err);
      return res.status(500).json({ error: 'Hiba a beszúrás során.' });
    }

    const newId = result.insertId;
    db.query(
      'SELECT id, legacy_id, name, gender, birth_date, nationality FROM pilots WHERE id = ?',
      [newId],
      (err2, rows) => {
        if (err2) {
          console.error('Hiba az új pilóta visszaolvasásakor:', err2);
          return res.status(500).json({ error: 'Hiba a beszúrás után.' });
        }
        res.status(201).json(rows[0]);
      }
    );
  });
});

// módosítás
app.put('/app029/api/pilots/:id', (req, res) => {
  const id = req.params.id;
  let { legacy_id, name, gender, birth_date, nationality } = req.body;

  legacy_id = legacy_id || null;
  birth_date = birth_date || null;

  const sql = `
    UPDATE pilots
    SET legacy_id = ?, name = ?, gender = ?, birth_date = ?, nationality = ?
    WHERE id = ?;
  `;

  db.query(sql, [legacy_id, name, gender, birth_date, nationality, id], (err, result) => {
    if (err) {
      console.error('Hiba a pilóta módosításakor:', err);
      return res.status(500).json({ error: 'Hiba a módosítás során.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Nincs ilyen azonosítójú pilóta.' });
    }

    db.query(
      'SELECT id, legacy_id, name, gender, birth_date, nationality FROM pilots WHERE id = ?',
      [id],
      (err2, rows) => {
        if (err2) {
          console.error('Hiba a frissített pilóta visszaolvasásakor:', err2);
          return res.status(500).json({ error: 'Hiba a módosítás után.' });
        }
        res.json(rows[0]);
      }
    );
  });
});

// törlés
app.delete('/app029/api/pilots/:id', (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM pilots WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Hiba a pilóta törlésekor:', err);
      return res.status(500).json({ error: 'Hiba a törlés során.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Nincs ilyen azonosítójú pilóta.' });
    }
    res.json({ success: true });
  });
});

// ---------- Szerver ----------
app.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}/app029`);
});
