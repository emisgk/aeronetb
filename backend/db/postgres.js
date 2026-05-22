const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.PG_HOST     || 'localhost',
        port:     parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'aeronetb',
        user:     process.env.PG_USER     || 'aeronetb_user',
        password: process.env.PG_PASSWORD || '',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Force search_path on every new connection
pool.on('connect', (client) => {
  client.query('SET search_path TO aeronetb');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO aeronetb');
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
