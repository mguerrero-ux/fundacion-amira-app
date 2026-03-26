// netlify/functions/settings.js
const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ error: 'Método no permitido' }, 405);

  const userId = parseInt(event.headers['x-user-id']);
  if (!userId) return cors({ error: 'No autorizado' }, 401);

  try {
    const { signer } = JSON.parse(event.body || '{}');
    if (!signer) return cors({ error: 'Signer requerido' }, 400);

    const sql = getDb();
    await sql`
      INSERT INTO user_settings (user_id, signer, updated_at)
      VALUES (${userId}, ${signer}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET signer = EXCLUDED.signer, updated_at = NOW()
    `;

    return cors({ ok: true });
  } catch(e) {
    console.error('settings error:', e);
    return cors({ error: 'Error interno' }, 500);
  }
};
