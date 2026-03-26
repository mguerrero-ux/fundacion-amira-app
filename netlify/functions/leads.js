const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const data = JSON.parse(event.body);
    
    // Validar que los datos básicos existan
    if (!data.nom || !data.folio || !data.userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan campos obligatorios (Nombre, Folio o ID de usuario)' })
      };
    }

    await client.connect();

    // Query corregida usando "descripcion" en lugar de "desc"
    const query = `
      INSERT INTO leads (
        created_by, 
        nom, 
        dir, 
        mon, 
        tax, 
        neto, 
        prio, 
        descripcion, 
        folio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.userId,
      data.nom,
      data.dir || '',
      data.mon || 0,
      data.tax || 0,
      data.neto || 0,
      data.prio || 'Normal',
      data.desc || '', // Aquí recibimos "desc" del formulario pero lo guardamos en "descripcion"
      data.folio
    ];

    const res = await client.query(query, values);
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res.rows[0])
    };

  } catch (err) {
    console.error('ERROR EN LEADS:', err);
    
    // Si el error es por Folio duplicado
    if (err.code === '23505') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El número de Folio ya existe. Usa uno diferente.' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor', details: err.message })
    };
  } finally {
    await client.end();
  }
};
