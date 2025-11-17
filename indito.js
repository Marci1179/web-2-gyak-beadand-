const express = require('express');
const path = require('path');

const app = express();
const PORT = 4029;

// Statikus fájlok a /app029 alatt
app.use('/app029', express.static(path.join(__dirname, 'public')));

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

// Szerver indítása
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
