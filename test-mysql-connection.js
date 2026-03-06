const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: '209.50.241.46',
      user: 'root',
      database: 'hotelsewa',
      port: 3306
    });
    
    console.log('✅ Connected to MySQL database');
    
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
