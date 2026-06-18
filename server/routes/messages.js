const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmailNotification } = require('../mailer');

const router = express.Router();

router.post('/contact', async (req, res) => {
  try {
    const db = await getDb();
    const { first_name, last_name, email, subject, message } = req.body;

    if (!first_name || !last_name || !email || !message) {
      return res.status(400).json({ error: 'Ad, soyad, e-posta ve mesaj gerekli' });
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO messages (first_name, last_name, email, subject, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 'contact', 0, ?)`,
      [first_name, last_name, email, subject || '', message, now]
    );

    sendEmailNotification({
      subject: `VHEORA - Yeni İletişim Mesajı: ${subject || 'Genel'}`,
      html: `
        <h2>Yeni İletişim Mesajı</h2>
        <p><strong>İsim:</strong> ${first_name} ${last_name}</p>
        <p><strong>E-posta:</strong> ${email}</p>
        <p><strong>Konu:</strong> ${subject || 'Genel'}</p>
        <p><strong>Mesaj:</strong></p>
        <p>${message}</p>
      `
    });

    res.json({ message: 'Mesajınız alındı, en kısa sürede dönüş yapacağız' });
  } catch (err) {
    console.error('[Contact Error]', err);
    res.status(500).json({ error: 'Mesaj gönderilirken hata oluştu' });
  }
});

router.post('/quote', async (req, res) => {
  try {
    const db = await getDb();
    const { phone, product_name } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Telefon numarası gerekli' });
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO messages (first_name, last_name, email, subject, message, type, product_name, phone, is_read, created_at)
       VALUES ('', '', ?, ?, ?, 'quote', ?, ?, 0, ?)`,
      ['', `Teklif Talebi: ${product_name || 'Belirtilmedi'}`, `Telefon: ${phone}`, product_name || '', phone, now]
    );

    sendEmailNotification({
      subject: `VHEORA - Yeni Teklif Talebi: ${product_name || 'Belirtilmedi'}`,
      html: `
        <h2>Yeni Teklif Talebi</h2>
        <p><strong>Ürün:</strong> ${product_name || 'Belirtilmedi'}</p>
        <p><strong>Telefon:</strong> ${phone}</p>
      `
    });

    res.json({ message: 'Teklif talebiniz alındı' });
  } catch (err) {
    console.error('[Quote Error]', err);
    res.status(500).json({ error: 'Teklif gönderilirken hata oluştu' });
  }
});

router.post('/testimonial', async (req, res) => {
  try {
    const db = await getDb();
    const { name, location, text, rating } = req.body;

    if (!name || !text) {
      return res.status(400).json({ error: 'Ad ve yorum gerekli' });
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO testimonials (name, location, text, rating, is_approved, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [name, location || '', text, rating || 5, now]
    );

    sendEmailNotification({
      subject: `VHEORA - Yeni Yorum: ${name}`,
      html: `
        <h2>Yeni Müşteri Yorumu</h2>
        <p><strong>İsim:</strong> ${name}</p>
        <p><strong>Lokasyon:</strong> ${location || '-'}</p>
        <p><strong>Puan:</strong> ${'★'.repeat(rating || 5)}</p>
        <p><strong>Yorum:</strong></p>
        <p>${text}</p>
        <p><a href="https://vheora.co/admin/testimonials.html">Yorumu onaylamak için tıklayın</a></p>
      `
    });

    res.json({ message: 'Yorumunuz alındı, onaydan sonra yayınlanacaktır' });
  } catch (err) {
    console.error('[Testimonial Error]', err);
    res.status(500).json({ error: 'Yorum gönderilirken hata oluştu' });
  }
});

const testimonialPool = [
  { n: 'Elif Yılmaz', l: 'İstanbul, Nişantaşı', t: 'Nişan yüzüğümüzü buradan aldık, parmağımdaki ışıltısı her gün beni mutlu ediyor. İşçilik gerçekten çok ince, her detay düşünülmüş.' },
  { n: 'Mehmet Çelik', l: 'Antalya, Lara', t: 'Annem için özel bir hediye yaptırdık, kutusunu açtığı anki mutluluğu paha biçilemezdi. Gerçekten işinin ehli bir ekip.' },
  { n: 'Zeynep Demir', l: 'Ankara, Çankaya', t: 'Eşim için yaptırdığım bileklik tam zamanında yetişti. Zarif ve modern duruşuyla her kıyafete uyum sağlıyor.' },
  { n: 'Ayşe Kaya', l: 'İzmir, Alsancak', t: 'Uzun süredir aradığım kolyeyi sonunda VHEORA\'da buldum. Teslimat çok hızlıydı, ürün fotoğraflardan bile daha güzel.' },
  { n: 'Mustafa Aydın', l: 'Bursa, Nilüfer', t: 'Doğum günü hediyesi olarak sipariş ettiğim saat tam bir sanat eseri. Her baktığımda kalitesini hissediyorum.' },
  { n: 'Selin Korkmaz', l: 'İstanbul, Beşiktaş', t: 'Düğün alışverişimizin yarısını VHEORA\'dan yaptık. Yüzükler, bilezikler derken kendimizi alamadık. Herkese tavsiye ederim.' },
  { n: 'Ali Öztürk', l: 'Ankara, Kızılay', t: 'Özel tasarım yüzük sipariş ettim, hayal ettiğimden daha güzeldi. İlgi ve alakaları da mükemmeldi.' },
  { n: 'Cemre Şahin', l: 'İstanbul, Kadıköy', t: 'Küpe setini gördüğüm an aşık oldum. Canlıda daha da parlak ve zarif. Kesinlikle tavsiye ederim.' },
  { n: 'Burak Yıldız', l: 'Muğla, Bodrum', t: 'Sevgilime sürpriz yapmak istedim, VHEORA ekibi harika bir yönlendirme yaptı. Yüzük tam isabet oldu.' },
  { n: 'İrem Polat', l: 'İzmir, Karşıyaka', t: 'Pırlanta yüzük aldım, fiyat-performans açısından piyasadaki en iyi seçenek. Sıradaki hedef kolye seti.' },
  { n: 'Hakan Güneş', l: 'İstanbul, Etiler', t: 'Yıllardır güvendiğim bir marka, her ürün ayrı bir özenle hazırlanıyor. Fiyatlar da kaliteye göre oldukça makul.' },
  { n: 'Deniz Ateş', l: 'Antalya, Kemer', t: 'Yurt dışından sipariş verdim, vergi ve kargo süreciyle ilgili çok yardımcı oldular. Ürün elime ulaştığında büyülendim.' },
  { n: 'Ebru Aslan', l: 'Ankara, Çayyolu', t: 'Arkadaşımın tavsiyesiyle geldim, iyi ki gelmişim. Bileklikteki taş işçiliği gerçekten usta ellerden çıkmış.' },
  { n: 'Fatih Kılıç', l: 'İstanbul, Üsküdar', t: 'Eşime 10. yıl hediyesi olarak bir gerdanlık aldım. Tasarımı o kadar özel ki her ortamda iltifat alıyor.' },
  { n: 'Gizem Yalçın', l: 'Bursa, Görükle', t: 'İlk defa online kuyumculuk deniyordum, tereddütlerim vardı ama VHEORA güven verdi. Süreç boyunca her an bilgilendirildim.' },
  { n: 'Özge Çelik', l: 'İstanbul, Bakırköy', t: 'Annemin yadigarı bir taşı modern bir yüzüğe dönüştürdüler. Duygusal değeri olan bir parçayı bu kadar güzel tasarladıkları için minnettarım.' },
  { n: 'Yusuf Aksoy', l: 'Kocaeli, İzmit', t: 'Sade, şık bir alyans arıyorduk, tam istediğimiz gibi oldu. İşçilik kalitesi ve hijyen konusunda çok titizler.' },
  { n: 'Dilara Eren', l: 'İstanbul, Sarıyer', t: 'Herkes nereden aldığımı soruyor, VHEORA\'nın farkı gerçekten belli oluyor.' },
  { n: 'Sarah Anderson', l: 'London, Chelsea', t: 'The craftsmanship is simply breathtaking. My engagement ring is a true masterpiece.' },
  { n: 'James Wilson', l: 'New York, Manhattan', t: 'Exceptional quality and fast global shipping. Highly recommend VHEORA.' },
  { n: 'Emily Thompson', l: 'Paris, Le Marais', t: 'I\'ve never seen such attention to detail. The necklace I ordered is absolutely stunning.' },
  { n: 'Michael Davis', l: 'Dubai, Marina', t: 'Premium quality that speaks for itself. My wife absolutely loves her diamond earrings.' },
  { n: 'Jessica Brown', l: 'Los Angeles, Beverly Hills', t: 'VHEORA pieces are genuinely unique. I get compliments everywhere I go.' },
  { n: 'Oliver Taylor', l: 'Berlin, Mitte', t: 'The design perfectly balances modern aesthetics with timeless elegance. Perfection.' },
  { n: 'Amanda Clark', l: 'Rome, Trastevere', t: 'I ordered a custom ring and the team brought my vision to life perfectly.' },
  { n: 'Chris Evans', l: 'Miami Beach', t: 'Fast delivery, beautiful packaging, and the product exceeded my expectations.' },
  { n: 'Sophie Miller', l: 'Barcelona, Gothic Quarter', t: 'The attention to detail is incredible. Worth every penny for such quality.' },
  { n: 'Daniel Brown', l: 'Singapore, Orchard', t: 'Outstanding service and impeccable quality. My bracelet arrived in perfect condition.' },
  { n: 'Rachel Green', l: 'Melbourne, South Yarra', t: 'Absolutely in love with my new pendant. The gold finish is flawless.' },
  { n: 'Thomas Wright', l: 'Toronto, Yorkville', t: 'Been a returning customer for years — they never disappoint. Consistent excellence.' },
  { n: 'Isabella Carter', l: 'Sydney, Bondi', t: 'The ring I bought is beyond beautiful. True artistry in every curve and detail.' },
  { n: 'Sophie Müller', l: 'München, Schwabing', t: 'Die Handwerkskunst ist einfach atemberaubend. Ein wahres Meisterwerk.' },
  { n: 'Hans Weber', l: 'Wien, Innere Stadt', t: 'Hervorragende Qualität und pünktliche Lieferung. Absolut empfehlenswert.' },
  { n: 'Marie Dubois', l: 'Lyon, Presqu\'île', t: 'Une expérience d\'achat exceptionnelle. Les bijoux sont encore plus beaux en vrai.' },
  { n: 'Lena Schmidt', l: 'Hamburg, Altona', t: 'Meine Verlobte war überglücklich. Der Ring sitzt perfekt und funkelt wunderschön.' },
  { n: 'Klaus Richter', l: 'Zürich, Niederdorf', t: 'Top Qualität aus der Türkei. Ich bin begeistert von der Verarbeitung.' },
  { n: 'Nora Al-Saud', l: 'Riyadh, Olaya', t: 'أجملقطعة مجوهرات رأيتها في حياتي. التصميم والدقة في التفاصيل لا يُضاهى.' },
  { n: 'Ahmed Al-Maktoum', l: 'Dubai, Palm Jumeirah', t: 'منتج فاخر بخدمة عالمية. زوجتي سعيدة جداً بالقلادة.' },
  { n: 'Layla Hassan', l: 'Doha, The Pearl', t: 'جودة استثنائية وتصميم فريد. سأطلب المزيد قريباً.' },
  { n: 'Omar Farouk', l: 'Kuwait City, Salmiya', t: 'تعاملت معهم عن بُعد وكانت التجربة ممتازة. التوصيل كان سريعاً جداً.' },
  { n: 'Yuki Tanaka', l: 'Tokyo, Ginza', t: 'The precision and delicacy of VHEORA jewelry is unlike anything I\'ve seen in Japan.' },
  { n: 'Katarina Petrov', l: 'Moscow, Arbat', t: 'Изысканное качество. Кольцо превзошло все мои ожидания.' },
  { n: 'Maria Santos', l: 'São Paulo, Jardins', t: 'Simplesmente encantadora cada peça. O colar é uma obra de arte.' },
  { n: 'Elena Rossi', l: 'Milan, Brera', t: 'Gioielli che raccontano una storia. La qualità artigianale è eccellente.' },
  { n: 'Priya Sharma', l: 'Mumbai, Bandra', t: 'Absolutely delighted with my custom bangle. The craftsmanship is world-class.' },
  { n: 'Ahmet Yılmaz', l: 'Berlin, Kreuzberg', t: 'Almanya\'dan sipariş verdim, 3 günde elime ulaştı. Herkese gösteriyorum, herkes çok beğeniyor.' },
  { n: 'Merve Aksu', l: 'Amsterdam, Centrum', t: 'Hollanda\'dan aileme hediye göndermek istedim, çok memnun kaldılar. Teşekkürler VHEORA.' },
  { n: 'Can Özdemir', l: 'London, Camden', t: 'Londra\'da yaşayan bir Türk olarak memleket kalitesini özlemiştim. İşte bu.' },
  { n: 'Duygu Şen', l: 'Paris, Champs-Élysées', t: 'Paris\'te bile bu kaliteyi bulamazsınız. Gerçekten gurur duyulacak bir marka.' },
];

const getRandomTestimonials = (count = 6) => {
  const shuffled = [...testimonialPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item, i) => ({
    id: i + 1,
    name: item.n,
    location: item.l,
    text: item.t,
    rating: Math.random() < 0.85 ? 5 : 4,
    created_at: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
  }));
};

router.get('/testimonials', async (req, res) => {
  try {
    const db = await getDb();
    const approved = await db.all('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC');
    if (approved.length >= 3) {
      return res.json(approved.map(t => ({ id: t.id, name: t.name, location: t.location || '', text: t.text, rating: t.rating || 5, created_at: t.created_at })));
    }
  } catch (_) {}
  res.json(getRandomTestimonials());
});

router.get('/admin/messages', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { type } = req.query;
    let sql = 'SELECT * FROM messages';
    const params = [];

    if (type === 'unread') {
      sql += ' WHERE is_read = 0';
    } else if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY created_at DESC';

    const messages = await db.all(sql, params);
    res.json(messages);
  } catch (err) {
    console.error('[Messages Error]', err);
    res.status(500).json({ error: 'Mesajlar yüklenirken hata oluştu' });
  }
});

router.put('/admin/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Okundu olarak işaretlendi' });
  } catch (err) {
    console.error('[Messages Error]', err);
    res.status(500).json({ error: 'Mesaj güncellenirken hata oluştu' });
  }
});

router.delete('/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM messages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mesaj silindi' });
  } catch (err) {
    console.error('[Messages Error]', err);
    res.status(500).json({ error: 'Mesaj silinirken hata oluştu' });
  }
});

router.get('/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const testimonials = await db.all('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(testimonials);
  } catch (err) {
    console.error('[Testimonials Error]', err);
    res.status(500).json({ error: 'Yorumlar yüklenirken hata oluştu' });
  }
});

router.put('/admin/testimonials/:id/approve', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE testimonials SET is_approved = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Yorum onaylandı' });
  } catch (err) {
    console.error('[Testimonials Error]', err);
    res.status(500).json({ error: 'Yorum onaylanırken hata oluştu' });
  }
});

router.delete('/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Yorum silindi' });
  } catch (err) {
    console.error('[Testimonials Error]', err);
    res.status(500).json({ error: 'Yorum silinirken hata oluştu' });
  }
});

router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();

    const productCount = (await db.get('SELECT COUNT(*) as c FROM products')).c;
    const messageCount = (await db.get('SELECT COUNT(*) as c FROM messages')).c;
    const testimonialCount = (await db.get('SELECT COUNT(*) as c FROM testimonials')).c;
    const approvedCount = (await db.get('SELECT COUNT(*) as c FROM testimonials WHERE is_approved = 1')).c;
    const unreadCount = (await db.get('SELECT COUNT(*) as c FROM messages WHERE is_read = 0')).c;
    const contactCount = (await db.get("SELECT COUNT(*) as c FROM messages WHERE type = 'contact'")).c;
    const quoteCount = (await db.get("SELECT COUNT(*) as c FROM messages WHERE type = 'quote'")).c;

    const monthlyMessages = await db.all(`
      SELECT ${process.env.DATABASE_URL ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)"} as month, COUNT(*) as count
      FROM messages
      WHERE created_at >= ${process.env.DATABASE_URL ? "NOW() - INTERVAL '6 months'" : "date('now', '-6 months')"}
      GROUP BY month ORDER BY month
    `);

    const monthlyTestimonials = await db.all(`
      SELECT ${process.env.DATABASE_URL ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)"} as month, COUNT(*) as count
      FROM testimonials
      WHERE created_at >= ${process.env.DATABASE_URL ? "NOW() - INTERVAL '6 months'" : "date('now', '-6 months')"}
      GROUP BY month ORDER BY month
    `);

    res.json({
      products: parseInt(productCount),
      messages: parseInt(messageCount),
      testimonials: parseInt(testimonialCount),
      approved_testimonials: parseInt(approvedCount),
      unread_messages: parseInt(unreadCount),
      contact_messages: parseInt(contactCount),
      quote_requests: parseInt(quoteCount),
      monthly_messages: monthlyMessages,
      monthly_testimonials: monthlyTestimonials
    });
  } catch (err) {
    console.error('[Stats Error]', err);
    res.status(500).json({ error: 'İstatistikler yüklenirken hata oluştu' });
  }
});

module.exports = router;
