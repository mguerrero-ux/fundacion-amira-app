// netlify/functions/leads.js
// POST: crear lead | GET: listar leads del usuario
const { getDb, getUser, calcTax, generateFolio, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  const userId = parseInt(event.headers['x-user-id']);
  if (!userId) return cors({ error: 'No autorizado' }, 401);

  const user = await getUser(userId);
  if (!user) return cors({ error: 'Usuario no encontrado' }, 404);

  const sql = getDb();

  if (event.httpMethod === 'POST') {
    try {
      const { nom, dir, mon, prio, desc } = JSON.parse(event.body || '{}');
      if (!nom || !dir || !mon) return cors({ error: 'Datos incompletos' }, 400);

      const { tax, neto } = calcTax(parseFloat(mon));
      const folio = generateFolio();

      const rows = await sql`
        INSERT INTO leads (created_by, nom, dir, mon, tax, neto, prio, desc, folio)
        VALUES (${userId}, ${nom}, ${dir}, ${parseFloat(mon)}, ${tax}, ${neto}, ${prio||''}, ${desc||''}, ${folio})
        RETURNING *
      `;

      return cors({ lead: {
        id: rows[0].id, nom, dir,
        mon: parseFloat(mon), tax, neto,
        prio: prio||'', desc: desc||'', folio
      }});
    } catch(e) {
      console.error('leads POST error:', e);
      return cors({ error: 'Error al crear lead' }, 500);
    }
  }

  return cors({ error: 'Método no permitido' }, 405);
};
