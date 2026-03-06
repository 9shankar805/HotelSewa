const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: 'postgresql://hotelsewa_user:p0XnOl8h8eM7Hh67aQyl4TmPlqy6QhtY@dpg-d6lkp995pdvs73813je0-a.singapore-postgres.render.com/hotelsewa',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    const res = await client.query('SELECT version()');
    console.log('📋 PostgreSQL version:', res.rows[0].version);
    
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('📋 Tables:', tables.rows);
    
    await client.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
