const Database = require('better-sqlite3');
const db = new Database('server/vheora.db');

// Find the product
const products = db.prepare("SELECT id, name, category FROM products WHERE name LIKE '%Beyaz%' OR name LIKE '%V Beyaz%'").all();
console.log('Found products:', products);

if (products.length > 0) {
    products.forEach(p => {
        db.prepare("UPDATE products SET category = 'bileklik' WHERE id = ?").run(p.id);
        console.log(`Updated product ${p.id} (${p.name}) to category 'bileklik'`);
    });
} else {
    console.log('No matching product found');
}

// Verify
const updated = db.prepare("SELECT id, name, category FROM products").all();
console.log('\nAll products after update:');
updated.forEach(p => console.log(p.id + ' | ' + p.name + ' | ' + p.category));