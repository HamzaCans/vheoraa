const { getDb } = require('./db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const db = await getDb();
    const newPassword = 'Vh_12345678';
    const hashed = bcrypt.hashSync(newPassword, 10);
    
    await db.run('UPDATE users SET password = ? WHERE username = ?', [hashed, 'Hamzbkadmin']);
    console.log('Password for Hamzbkadmin has been reset to: ' + newPassword);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  }
}

resetPassword();
