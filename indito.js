const express = require('express');
const path = require('path');
const mysql = require('mysql');

const app = express();

// A tanártól kapott port az app029-hoz
const PORT = 4029;

// 🔹 ADATBÁZIS KAPCSOLAT
const db = mysql.createConnection({
  host: 'localhost',
  user: 'studb029',
  password: 'abc123',
  database: 'db029',
  charset: 'utf8_hungarian_ci'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Hiba az adatbázis kapcsolódásnál:', err);
  } else {
    console.log('✅ Sikeres adatbázis kapcsolat.');
  }
});

// 🔹 Body parser a POST formokhoz
app.use(express.urlencoded({ extended: true }));

// 🔹 statikus fájlok /app029 alól
app.use('/app029', express.static(path.join(__dirname, 'public')));

// ------------------------
//       OLDALAK
// ------------------------

// Főoldal
app.get(['/app029', '/app029/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Adatbázis menü
app.get('/app029/adatbazis', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adatbazis.html'));
});

// Kapcsolat menü
app.get('/app029/kapcsolat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kapcsolat.html'));
});

// Üzenetek menü
app.get('/app029/uzenetek', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uzenetek.html'));
});

// CRUD menü
app.get('/app029/crud', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crud.html'));
});

// ------------------------
//   KAPCSOLAT – ÜZENET MENTÉS
// ------------------------

app.post('/app029/kapcsolat', (req, res) => {
  const { name, email, subject, message } = req.body;

  const sql = `
    INSERT INTO messages (name, email, subject, message, created_at, updated_at)
    VALUES (?, ?, ?, ?, NOW(), NOW())
  `;

  db.query(sql, [name, email, subject || null, message], (err) => {
    if (err) {
      console.error('❌ Hiba az üzenet mentésekor:', err);
      return res.status(500).send('Hiba történt az üzenet mentésekor.');
    }

    res.redirect('/app029/kapcsolat?siker=1');
  });
});

// ------------------------
//   API – F1 ADATBÁZIS MENÜ
// ------------------------

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

// ------------------------
//   API – ÜZENETEK LISTÁJA
// ------------------------

app.get('/app029/api/messages', (req, res) => {
  const sql = `
    SELECT id, name, email, subject, message, created_at
    FROM messages
    ORDER BY created_at DESC, id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Hiba az üzenetek lekérdezésekor:', err);
      return res.status(500).json({ error: 'Hiba az üzenetek lekérdezésekor.' });
    }
    res.json(rows);
  });
});

// ------------------------
// Szerver indítása
// ------------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
