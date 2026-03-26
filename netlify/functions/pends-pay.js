// netlify/functions/pends-pay.js
// POST /.netlify/functions/pends-pay?id=X
const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ error: 'Método no permitido' }, 405);

  const userId = parseInt(event.headers['x-user-id']);
  if (!userId) return cors({ error: 'No autorizado' }, 401);

  const pendId = parseInt(event.queryStringParameters?.id);
  if (!pendId) return cors({ error: 'ID requerido' }, 400);

  try {
    const sql = getDb();
    const user = await getUser(userId);
    if (!user) return cors({ error: 'Usuario no encontrado' }, 404);

    const pends = await sql`SELECT * FROM pendings WHERE id = ${pendId} LIMIT 1`;
    if (!pends.length) return cors({ error: 'Pending no encontrado' }, 404);
    const pend = pends[0];

    // Solo el creador o admin puede ejecutar pago
    if (pend.created_by !== userId && user.role !== 'admin') {
      return cors({ error: 'Sin permiso para ejecutar' }, 403);
    }

    // Mover a history
    const hist = await sql`
      INSERT INTO history (created_by, nom, dir, mon, tax, neto, prio, desc, folio)
      VALUES (${pend.created_by}, ${pend.nom}, ${pend.dir}, ${pend.mon}, ${pend.tax}, ${pend.neto},
              ${pend.prio}, ${pend.desc}, ${pend.folio})
      RETURNING *
    `;

    await sql`DELETE FROM pendings WHERE id = ${pendId}`;

    return cors({ history: {
      id:         hist[0].id,
      nom:        hist[0].nom,
      dir:        hist[0].dir,
      mon:        parseFloat(hist[0].mon),
      tax:        parseFloat(hist[0].tax),
      neto:       parseFloat(hist[0].neto),
      folio:      hist[0].folio,
      executedAt: hist[0].executed_at,
    }});
  } catch(e) {
    console.error('pends-pay error:', e);
    return cors({ error: 'Error interno' }, 500);
  }
};
