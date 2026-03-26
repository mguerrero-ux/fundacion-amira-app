// netlify/functions/_db.js
// Helper compartido para conectarse a Neon PostgreSQL

const { neon } = require('@neondatabase/serverless');

let _sql = null;

function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL no configurada en variables de entorno de Netlify');
    _sql = neon(url);
  }
  return _sql;
}

// Hashear PIN con SHA-256 (sin dependencias extras)
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generar código de invitación único
function generateInviteCode(name) {
  const prefix = name.split(' ')[0].toUpperCase().slice(0, 4).padEnd(4, 'X');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AMIRA-${prefix}-${suffix}`;
}

// Respuesta CORS estándar
function cors(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    },
    body: JSON.stringify(body),
  };
}

// Verificar que el usuario existe en DB
async function getUser(userId) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE id = ${parseInt(userId)} LIMIT 1`;
  return rows[0] || null;
}

// Calcular impuesto
function calcTax(mon) {
  const rate = mon > 50000 ? 0.03 : 0.02;
  const tax  = parseFloat((mon * rate).toFixed(2));
  const neto = parseFloat((mon - tax).toFixed(2));
  return { rate, tax, neto };
}

// Generar folio único
function generateFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2,5).toUpperCase();
  return `AMD-${ts}-${rnd}`;
}

module.exports = { getDb, hashPin, generateInviteCode, cors, getUser, calcTax, generateFolio };
