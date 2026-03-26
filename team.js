// netlify/functions/team.js
// GET /.netlify/functions/team
// Devuelve el árbol de afiliados según la jerarquía del usuario
const { getDb, getUser, cors } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({});

  const userId = parseInt(event.headers['x-user-id']);
  if (!userId) return cors({ error: 'No autorizado' }, 401);

  try {
    const user = await getUser(userId);
    if (!user) return cors({ error: 'Usuario no encontrado' }, 404);

    const sql = getDb();

    // Si es admin, ver todo el árbol desde la raíz
    // Si es miembro, ver su árbol personal
    const rootId = userId;

    const flatRows = await sql`
      SELECT id, name, invite_code, parent_id, created_at
      FROM get_user_tree(${rootId})
      ORDER BY depth, name
    `;

    // Convertir flat list → árbol anidado
    const tree = buildTree(flatRows, userId);

    return cors({ tree });
  } catch(e) {
    console.error('team error:', e);
    return cors({ error: 'Error interno' }, 500);
  }
};

function buildTree(rows, rootId) {
  // Crear mapa id → nodo
  const map = {};
  rows.forEach(r => {
    map[r.id] = {
      id:          r.id,
      name:        r.name,
      invite_code: r.invite_code,
      parent_id:   r.parent_id,
      joined:      new Date(r.created_at).toLocaleDateString('es-DO'),
      children:    [],
      team_count:  0,
    };
  });

  // Armar árbol
  const roots = [];
  rows.forEach(r => {
    const node = map[r.id];
    if (r.parent_id === rootId || !map[r.parent_id]) {
      // Hijo directo del usuario root
      roots.push(node);
    } else if (map[r.parent_id]) {
      map[r.parent_id].children.push(node);
    }
  });

  // Calcular team_count recursivo
  function countChildren(node) {
    node.team_count = node.children.length;
    node.children.forEach(c => {
      countChildren(c);
      node.team_count += c.team_count;
    });
  }
  roots.forEach(countChildren);

  return roots;
}
