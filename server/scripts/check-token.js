const https = require('https');
const token = process.argv[2];
function api(method, url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: {
        'Authorization': 'Bearer ' + token, 'User-Agent': 'v',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  let r = await api('GET', 'https://api.github.com/user');
  console.log('User:', r.data.login, r.data.name);
  console.log('Repos URL:', r.data.repos_url);
  let repos = await api('GET', r.data.repos_url + '?per_page=5&sort=created');
  console.log('Recent repos:');
  for (const repo of repos.data) {
    console.log(' -', repo.full_name, '(default branch:', repo.default_branch + ')');
  }
})();
