const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  const userId = parseInt(event.headers['x-user-id']);
  const leadId = parseInt(event.queryStringParameters?.id);

  try {
    const sql = getDb();
    const leads = await sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`;
    if (!leads.length) return cors({ error: 'Lead no encontrado' }, 404);
    const lead = leads[0];

    const pend = await sql`
      INSERT INTO pendings (created_by, nom, dir, mon, tax, neto, prio, notas, folio)
      VALUES (${lead.created_by}, ${lead.nom}, ${lead.dir}, ${lead.mon}, ${lead.tax}, ${lead.neto},
              ${lead.prio}, ${lead.notas}, ${lead.folio})
      RETURNING *
    `;

    await sql`DELETE FROM leads WHERE id = ${leadId}`;
    return cors({ ok: true });
  } catch (e) {
    return cors({ error: 'Error al aprobar: ' + e.message }, 500);
  }
};
