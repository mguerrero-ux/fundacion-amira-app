// netlify/functions/auth-login.js
const { getDb, hashPin, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ error: 'Método no permitido' }, 405);

  try {
    const { pin } = JSON.parse(event.body || '{}');
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return cors({ error: 'PIN inválido' }, 400);
    }

    const pinHash = await hashPin(pin);
    const sql = getDb();

    const rows = await sql`
      SELECT id, name, role, invite_code, parent_id, created_at
      FROM users
      WHERE pin_hash = ${pinHash}
      LIMIT 1
    `;

    if (!rows.length) {
      return cors({ error: 'PIN incorrecto' }, 401);
    }

    const user = rows[0];
    return cors({
      user: {
        id:          user.id,
        name:        user.name,
        role:        user.role,
        invite_code: user.invite_code,
        parent_id:   user.parent_id,
      }
    });
  } catch (e) {
    console.error('auth-login error:', e);
    return cors({ error: 'Error interno del servidor' }, 500);
  }
};
