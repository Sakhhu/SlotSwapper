/**
 * Minimal SlotSwapper backend
 * - SQLite DB (file)
 * - JWT auth (Bearer)
 * - Endpoints: signup, login, events CRUD, swappable slots, swap-request, swap-response
 *
 * Note: For production, improve validation, password hashing salt rounds, error handling, and CORS restrictions.
 */
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const DB_FILE = process.env.DB_FILE || './data/database.sqlite';

// ensure data dir
fs.mkdirSync('./data', { recursive: true });

const db = new sqlite3.Database(DB_FILE);

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());

// Initialize DB schema
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    ownerId TEXT,
    title TEXT,
    startTime INTEGER,
    endTime INTEGER,
    status TEXT, -- BUSY | SWAPPABLE | SWAP_PENDING
    FOREIGN KEY(ownerId) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS swap_requests (
    id TEXT PRIMARY KEY,
    requesterId TEXT,
    responderId TEXT,
    mySlotId TEXT,
    theirSlotId TEXT,
    status TEXT, -- PENDING | ACCEPTED | REJECTED
    createdAt INTEGER,
    FOREIGN KEY(requesterId) REFERENCES users(id),
    FOREIGN KEY(responderId) REFERENCES users(id)
  )`);
});

// Helpers
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const hashed = await bcrypt.hash(password, 8);
  const id = uuidv4();
  db.run('INSERT INTO users (id,name,email,password) VALUES (?,?,?,?)', [id,name,email,hashed], function(err) {
    if (err) return res.status(400).json({ error: 'Email already exists' });
    const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email } });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: row.id, email: row.email, name: row.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: row.id, name: row.name, email: row.email } });
  });
});

// CRUD for events (only owner can modify)
app.get('/api/events', authMiddleware, (req, res) => {
  db.all('SELECT * FROM events WHERE ownerId = ? ORDER BY startTime', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.post('/api/events', authMiddleware, (req, res) => {
  const { title, startTime, endTime } = req.body;
  if (!title || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  const status = 'BUSY';
  db.run('INSERT INTO events (id,ownerId,title,startTime,endTime,status) VALUES (?,?,?,?,?,?)',
    [id, req.user.id, title, Number(startTime), Number(endTime), status],
    function(err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => res.json(row));
    });
});

app.put('/api/events/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const { title, startTime, endTime, status } = req.body;
  db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Event not found' });
    if (row.ownerId !== req.user.id) return res.status(403).json({ error: 'Not owner' });
    const newTitle = title || row.title;
    const newStart = (startTime===undefined)? row.startTime : Number(startTime);
    const newEnd = (endTime===undefined)? row.endTime : Number(endTime);
    const newStatus = status || row.status;
    db.run('UPDATE events SET title=?, startTime=?, endTime=?, status=? WHERE id=?',
      [newTitle, newStart, newEnd, newStatus, id], function(err2) {
        if (err2) return res.status(500).json({ error: 'DB error' });
        db.get('SELECT * FROM events WHERE id = ?', [id], (err3, updated) => res.json(updated));
      });
  });
});

app.delete('/api/events/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM events WHERE id = ?', [id], (err,row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Event not found' });
    if (row.ownerId !== req.user.id) return res.status(403).json({ error: 'Not owner' });
    db.run('DELETE FROM events WHERE id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    });
  });
});

// Marketplace: get swappable slots from other users
app.get('/api/swappable-slots', authMiddleware, (req, res) => {
  db.all('SELECT events.*, users.name as ownerName FROM events JOIN users ON events.ownerId = users.id WHERE events.status = ? AND events.ownerId != ? ORDER BY startTime', ['SWAPPABLE', req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Create swap request
app.post('/api/swap-request', authMiddleware, (req, res) => {
  const { mySlotId, theirSlotId } = req.body;
  if (!mySlotId || !theirSlotId) return res.status(400).json({ error: 'Missing fields' });
  // Validate slots and their status
  db.serialize(() => {
    db.get('SELECT * FROM events WHERE id = ?', [mySlotId], (err, mySlot) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!mySlot) return res.status(404).json({ error: 'My slot not found' });
      if (mySlot.ownerId !== req.user.id) return res.status(403).json({ error: 'Not owner of mySlot' });
      if (mySlot.status !== 'SWAPPABLE') return res.status(400).json({ error: 'My slot not SWAPPABLE' });
      db.get('SELECT * FROM events WHERE id = ?', [theirSlotId], (err2, theirSlot) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        if (!theirSlot) return res.status(404).json({ error: 'Their slot not found' });
        if (theirSlot.status !== 'SWAPPABLE') return res.status(400).json({ error: 'Their slot not SWAPPABLE' });
        if (theirSlot.ownerId === req.user.id) return res.status(400).json({ error: 'Cannot swap with yourself' });
        // Create swap request and set both to SWAP_PENDING in a transaction
        const reqId = uuidv4();
        const now = Date.now();
        db.run('BEGIN TRANSACTION');
        db.run('INSERT INTO swap_requests (id,requesterId,responderId,mySlotId,theirSlotId,status,createdAt) VALUES (?,?,?,?,?,?,?)',
          [reqId, req.user.id, theirSlot.ownerId, mySlotId, theirSlotId, 'PENDING', now], function(err3) {
            if (err3) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'DB error' });
            }
            db.run('UPDATE events SET status = ? WHERE id IN (?,?)', ['SWAP_PENDING', mySlotId, theirSlotId], function(err4) {
              if (err4) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'DB error' });
              }
              db.run('COMMIT');
              db.get('SELECT * FROM swap_requests WHERE id = ?', [reqId], (err5, row) => res.json(row));
            });
          });
      });
    });
  });
});

// Respond to swap request (accept/reject)
app.post('/api/swap-response/:requestId', authMiddleware, (req, res) => {
  const requestId = req.params.requestId;
  const { accept } = req.body;
  if (accept === undefined) return res.status(400).json({ error: 'Missing accept flag' });
  db.get('SELECT * FROM swap_requests WHERE id = ?', [requestId], (err, requestRow) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!requestRow) return res.status(404).json({ error: 'Request not found' });
    // Only responder can accept/reject
    if (requestRow.responderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (requestRow.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });
    if (!accept) {
      // Reject: set REJECTED and set both slots back to SWAPPABLE
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('UPDATE swap_requests SET status = ? WHERE id = ?', ['REJECTED', requestId]);
        db.run('UPDATE events SET status = ? WHERE id IN (?,?)', ['SWAPPABLE', requestRow.mySlotId, requestRow.theirSlotId], function(err2) {
          if (err2) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'DB error' });
          }
          db.run('COMMIT');
          res.json({ success: true, status: 'REJECTED' });
        });
      });
    } else {
      // Accept: swap owners of the two events and set status back to BUSY. Mark request ACCEPTED.
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        // fetch slots to re-check owners and status
        db.get('SELECT * FROM events WHERE id = ?', [requestRow.mySlotId], (err3, mySlot) => {
          if (err3) { db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
          db.get('SELECT * FROM events WHERE id = ?', [requestRow.theirSlotId], (err4, theirSlot) => {
            if (err4) { db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
            // final checks
            if (!mySlot || !theirSlot) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Slot missing' }); }
            if (mySlot.status !== 'SWAP_PENDING' || theirSlot.status !== 'SWAP_PENDING') { db.run('ROLLBACK'); return res.status(400).json({ error: 'Slots not in SWAP_PENDING' }); }
            // perform owner swap
            const ownerA = mySlot.ownerId;
            const ownerB = theirSlot.ownerId;
            db.run('UPDATE events SET ownerId = ?, status = ? WHERE id = ?', [ownerB, 'BUSY', mySlot.id]);
            db.run('UPDATE events SET ownerId = ?, status = ? WHERE id = ?', [ownerA, 'BUSY', theirSlot.id]);
            db.run('UPDATE swap_requests SET status = ? WHERE id = ?', ['ACCEPTED', requestId]);
            db.run('COMMIT');
            res.json({ success: true, status: 'ACCEPTED' });
          });
        });
      });
    }
  });
});

// Get incoming/outgoing requests for user
app.get('/api/requests', authMiddleware, (req, res) => {
  const uid = req.user.id;
  db.all('SELECT sr.*, u1.name as requesterName, u2.name as responderName FROM swap_requests sr JOIN users u1 ON sr.requesterId = u1.id JOIN users u2 ON sr.responderId = u2.id WHERE sr.requesterId = ? OR sr.responderId = ? ORDER BY createdAt DESC', [uid, uid], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// start
app.listen(PORT, () => {
  console.log('SlotSwapper backend listening on', PORT);
  console.log('DB file:', DB_FILE);
});
