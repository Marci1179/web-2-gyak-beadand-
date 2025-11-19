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

// 🔹 Body parser – JSON és urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 statikus fájlok /app029 alól
app.use('/app029', express.static(path.join(__dirname, 'public')));

// 🔹 Főoldal
app.get(['/app029', '/app029/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔹 Adatbázis menü
app.get('/app029/adatbazis', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adatbazis.html'));
});

// 🔹 Kapcsolat menü (GET)
app.get('/app029/kapcsolat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kapcsolat.html'));
});

// 🔹 Kapcsolat menü (POST) – üzenet mentése a messages táblába
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

    // siker: vissza a kapcsolat oldalra egy jelzővel
    res.redirect('/app029/kapcsolat?siker=1');
  });
});

// 🔹 Üzenetek menü
app.get('/app029/uzenetek', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uzenetek.html'));
});

// 🔹 CRUD menü
app.get('/app029/crud', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crud.html'));
});

// 🔹 API – 3 tábla JOIN, 1 listában visszaadva (Adatbázis menü)
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

// 🔹 API – ÜZENETEK LISTÁJA (Üzenetek menü)
app.get('/app029/api/messages', (req, res) => {
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


// 🔹 PILÓTÁK CRUD API

// Lista (READ)
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

// Új pilóta felvitele (CREATE)
app.post('/app029/api/pilots', (req, res) => {
  let { legacy_id, name, gender, birth_date, nationality } = req.body;

  // Üres mezőkből legyen NULL
  legacy_id = legacy_id === '' || legacy_id === null ? null : legacy_id;
  birth_date = birth_date === '' || birth_date === null ? null : birth_date;

  const sql = `
    INSERT INTO pilots (legacy_id, name, gender, birth_date, nationality)
    VALUES (?, ?, ?, ?, ?);
  `;

  db.query(
    sql,
    [legacy_id, name, gender, birth_date, nationality],
    (err, result) => {
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
    }
  );
});

// Pilóta módosítása (UPDATE)
app.put('/app029/api/pilots/:id', (req, res) => {
  const id = req.params.id;
  let { legacy_id, name, gender, birth_date, nationality } = req.body;

  legacy_id = legacy_id === '' || legacy_id === null ? null : legacy_id;
  birth_date = birth_date === '' || birth_date === null ? null : birth_date;

  const sql = `
    UPDATE pilots
    SET legacy_id = ?, name = ?, gender = ?, birth_date = ?, nationality = ?
    WHERE id = ?;
  `;

  db.query(
    sql,
    [legacy_id, name, gender, birth_date, nationality, id],
    (err, result) => {
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
    }
  );
});

// Pilóta törlése (DELETE)
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


// 🔹 Szerver indítása
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
