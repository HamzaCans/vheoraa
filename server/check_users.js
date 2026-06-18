const { getDb } = require('./db');

async function checkUsers() {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, username, email FROM users');
    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('--------------');
    process.exit(0);
  } catch (err) {
    console.error('Error checking users:', err);
    process.exit(1);
  }
}

checkUsers();
