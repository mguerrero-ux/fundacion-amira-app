// netlify/functions/dashboard.js
// Devuelve pends, history, leads y settings según la jerarquía del usuario
const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  try {
    const userId = parseInt(event.headers['x-user-id']);
    if (!userId) return cors({ error: 'No autorizado' }, 401);

    const user = await getUser(userId);
    if (!user) return cors({ error: 'Usuario no encontrado' }, 404);

    const sql = getDb();

    // Obtener IDs visibles: el propio usuario + todos sus descendientes
    let visibleIds = [userId];

    if (user.role === 'admin') {
      // Admin ve TODOS
      const allUsers = await sql`SELECT id FROM users`;
      visibleIds = allUsers.map(u => u.id);
    } else {
      // Miembro: ver solo su propia rama (él + descendientes)
      const descendants = await sql`SELECT id FROM get_user_tree(${userId})`;
      visibleIds = [userId, ...descendants.map(d => d.id)];
    }

    // Obtener datos del día de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pends, todayHistory, leads, settings] = await Promise.all([
      sql`
        SELECT p.*, u.name as created_by_name
        FROM pendings p
        JOIN users u ON p.created_by = u.id
        WHERE p.created_by = ANY(${visibleIds}::int[])
        ORDER BY p.approved_at DESC
        LIMIT 100
      `,
      sql`
        SELECT h.*, u.name as created_by_name
        FROM history h
        JOIN users u ON h.created_by = u.id
        WHERE h.created_by = ANY(${visibleIds}::int[])
          AND h.executed_at >= ${today.toISOString()}
        ORDER BY h.executed_at DESC
        LIMIT 100
      `,
      sql`
        SELECT l.*, u.name as created_by_name
        FROM leads l
        JOIN users u ON l.created_by = u.id
        WHERE l.created_by = ANY(${visibleIds}::int[])
        ORDER BY l.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT signer FROM user_settings WHERE user_id = ${userId} LIMIT 1
      `
    ]);

    return cors({
      pends:   pends.map(formatPend),
      history: todayHistory.map(formatHistory),
      leads:   leads.map(formatLead),
      signer:  settings[0]?.signer || 'AMIRA AL DAHAB'
    });
  } catch (e) {
    console.error('dashboard error:', e);
    return cors({ error: 'Error interno' }, 500);
  }
};

function formatPend(p) {
  return {
    id:         p.id,
    nom:        p.nom,
    dir:        p.dir,
    mon:        parseFloat(p.mon),
    tax:        parseFloat(p.tax),
    neto:       parseFloat(p.neto),
    prio:       p.prio,
    desc:       p.desc,
    folio:      p.folio,
    approvedAt: new Date(p.approved_at).toLocaleDateString('es-DO'),
    createdBy:  p.created_by_name,
  };
}

function formatHistory(h) {
  return {
    id:         h.id,
    nom:        h.nom,
    dir:        h.dir,
    mon:        parseFloat(h.mon),
    tax:        parseFloat(h.tax),
    neto:       parseFloat(h.neto),
    folio:      h.folio,
    executedAt: h.executed_at,
    createdBy:  h.created_by_name,
  };
}

function formatLead(l) {
  return {
    id:        l.id,
    nom:       l.nom,
    dir:       l.dir,
    mon:       parseFloat(l.mon),
    tax:       parseFloat(l.tax),
    neto:      parseFloat(l.neto),
    prio:      l.prio,
    desc:      l.desc,
    folio:     l.folio,
    createdBy: l.created_by_name,
  };
}
