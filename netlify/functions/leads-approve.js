// netlify/functions/leads-approve.js
// POST /.netlify/functions/leads-approve?id=X
const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  if (event.httpMethod !== 'POST') return cors({ error: 'Método no permitido' }, 405);

  const userId = parseInt(event.headers['x-user-id']);
  if (!userId) return cors({ error: 'No autorizado' }, 401);

  const leadId = parseInt(event.queryStringParameters?.id);
  if (!leadId) return cors({ error: 'ID requerido' }, 400);

  try {
    const sql = getDb();
    const user = await getUser(userId);
    if (!user) return cors({ error: 'Usuario no encontrado' }, 404);

    // Traer el lead
    const leads = await sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`;
    if (!leads.length) return cors({ error: 'Lead no encontrado' }, 404);
    const lead = leads[0];

    // Solo el creador o admin puede aprobar
    if (lead.created_by !== userId && user.role !== 'admin') {
      return cors({ error: 'Sin permiso para aprobar' }, 403);
    }

    // Mover a pendings
    const pend = await sql`
      INSERT INTO pendings (created_by, nom, dir, mon, tax, neto, prio, desc, folio)
      VALUES (${lead.created_by}, ${lead.nom}, ${lead.dir}, ${lead.mon}, ${lead.tax}, ${lead.neto},
              ${lead.prio}, ${lead.desc}, ${lead.folio})
      RETURNING *
    `;

    // Eliminar de leads
    await sql`DELETE FROM leads WHERE id = ${leadId}`;

    return cors({ pend: {
      id:         pend[0].id,
      nom:        pend[0].nom,
      dir:        pend[0].dir,
      mon:        parseFloat(pend[0].mon),
      tax:        parseFloat(pend[0].tax),
      neto:       parseFloat(pend[0].neto),
      prio:       pend[0].prio,
      desc:       pend[0].desc,
      folio:      pend[0].folio,
      approvedAt: new Date(pend[0].approved_at).toLocaleDateString('es-DO'),
    }});
  } catch(e) {
    console.error('leads-approve error:', e);
    return cors({ error: 'Error interno' }, 500);
  }
};
