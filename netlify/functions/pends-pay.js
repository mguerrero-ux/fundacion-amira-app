const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});
  const userId = parseInt(event.headers['x-user-id']);
  const pendId = parseInt(event.queryStringParameters?.id);

  try {
    const sql = getDb();
    const pends = await sql`SELECT * FROM pendings WHERE id = ${pendId} LIMIT 1`;
    if (!pends.length) return cors({ error: 'Pendiente no encontrado' }, 404);
    const pend = pends[0];

    const hist = await sql`
      INSERT INTO history (created_by, nom, dir, mon, tax, neto, prio, notas, folio)
      VALUES (${pend.created_by}, ${pend.nom}, ${pend.dir}, ${pend.mon}, ${pend.tax}, ${pend.neto},
              ${pend.prio}, ${pend.notas}, ${pend.folio})
      RETURNING *
    `;

    await sql`DELETE FROM pendings WHERE id = ${pendId}`;
    return cors({ ok: true });
  } catch (e) {
    return cors({ error: 'Error al pagar: ' + e.message }, 500);
  }
};
