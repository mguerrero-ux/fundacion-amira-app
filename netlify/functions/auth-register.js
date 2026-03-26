// netlify/functions/auth-register.js
const { getDb, hashPin, generateInviteCode, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ error: 'Método no permitido' }, 405);

  try {
    const { name, invite_code, pin } = JSON.parse(event.body || '{}');

    if (!name?.trim()) return cors({ error: 'Nombre requerido' }, 400);
    if (!invite_code?.trim()) return cors({ error: 'Código de invitación requerido' }, 400);
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return cors({ error: 'PIN debe ser 4 dígitos' }, 400);
    }

    const sql = getDb();

    // Buscar el usuario que tiene ese código de invitación (el sponsor)
    const sponsors = await sql`
      SELECT id FROM users WHERE invite_code = ${invite_code.toUpperCase()} LIMIT 1
    `;

    if (!sponsors.length) {
      return cors({ error: 'Código de invitación inválido' }, 404);
    }

    const sponsorId = sponsors[0].id;
    const pinHash   = await hashPin(pin);

    // Verificar que el PIN no esté ya en uso
    const existingPin = await sql`
      SELECT id FROM users WHERE pin_hash = ${pinHash} LIMIT 1
    `;
    if (existingPin.length) {
      return cors({ error: 'Ese PIN ya está en uso. Elige otro.' }, 409);
    }

    // Generar código de invitación único para el nuevo usuario
    let newCode = generateInviteCode(name);
    // Asegurar que sea único
    let attempts = 0;
    while (attempts < 5) {
      const conflict = await sql`SELECT id FROM users WHERE invite_code = ${newCode} LIMIT 1`;
      if (!conflict.length) break;
      newCode = generateInviteCode(name + attempts);
      attempts++;
    }

    // Crear usuario
    const newUser = await sql`
      INSERT INTO users (name, pin_hash, role, invite_code, parent_id)
      VALUES (${name.trim()}, ${pinHash}, 'member', ${newCode}, ${sponsorId})
      RETURNING id, name, role, invite_code, parent_id
    `;

    // Crear settings por default
    await sql`
      INSERT INTO user_settings (user_id, signer)
      VALUES (${newUser[0].id}, 'AMIRA AL DAHAB')
      ON CONFLICT DO NOTHING
    `;

    return cors({
      user: {
        id:          newUser[0].id,
        name:        newUser[0].name,
        role:        newUser[0].role,
        invite_code: newUser[0].invite_code,
        parent_id:   newUser[0].parent_id,
      }
    });
  } catch (e) {
    console.error('auth-register error:', e);
    return cors({ error: 'Error interno del servidor' }, 500);
  }
};
