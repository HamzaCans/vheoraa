const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.argv[2];
if (!TOKEN) { console.error('Usage: node deploy.js <token>'); process.exit(1); }

const OWNER = 'HamzaCans';
const REPO = 'vheora';
const ROOT = path.join(__dirname, '..', '..');
const API = 'https://api.github.com';

function api(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vheora',
        'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json'
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (e.name === 'node_modules' || e.name === '.git' || rel.startsWith('server/scripts/') || rel === 'server/.env' || rel === 'server/vheora.db' || rel.endsWith('.db-shm') || rel.endsWith('.db-wal') || rel.endsWith('.log') || rel.startsWith('.') || e.name === 'server-test.log') continue;
    if (e.isDirectory()) walk(full);
    else files.push(rel);
  }
}
walk(ROOT);

async function main() {
  console.log('Creating repo...');
  const create = await api('POST', API + '/user/repos', {
    name: REPO, description: 'VHEORA Jewelry Website',
    private: false, auto_init: true
  });
  if (create.status === 201) console.log('Repo created.');
  else if (create.status === 422) console.log('Repo exists.');
  else { console.error('Repo error:', create.status); return; }

  console.log('Getting latest commit...');
  await new Promise(r => setTimeout(r, 2000));

  const ref = await api('GET', API + '/repos/' + OWNER + '/' + REPO + '/git/refs/heads/main');
  if (ref.status !== 200) { console.error('No main branch'); return; }

  const latestSha = ref.data.object.sha;
  console.log('Latest commit:', latestSha.slice(0, 7));

  const commit = await api('GET', API + '/repos/' + OWNER + '/' + REPO + '/git/commits/' + latestSha);
  const baseTreeSha = commit.data.tree.sha;
  console.log('Base tree:', baseTreeSha.slice(0, 7));

  console.log('Creating blobs for ' + files.length + ' files...');
  const entries = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const content = fs.readFileSync(path.join(ROOT, f));
    const base64 = content.toString('base64');
    const blob = await api('POST', API + '/repos/' + OWNER + '/' + REPO + '/git/blobs', {
      content: base64, encoding: 'base64'
    });
    if (blob.status !== 201) {
      console.log('  BLOB FAIL: ' + f + ' - ' + (blob.data?.message || blob.data));
      continue;
    }
    entries.push({ path: f, mode: '100644', type: 'blob', sha: blob.data.sha });
    process.stdout.write('\r  ' + (i + 1) + '/' + files.length);
  }
  console.log();

  console.log('Creating tree...');
  const tree = await api('POST', API + '/repos/' + OWNER + '/' + REPO + '/git/trees', {
    base_tree: baseTreeSha, tree: entries
  });
  if (tree.status !== 201) { console.error('Tree failed:', tree.data); return; }

  console.log('Creating commit...');
  const newCommit = await api('POST', API + '/repos/' + OWNER + '/' + REPO + '/git/commits', {
    message: 'Initial VHEORA deployment',
    tree: tree.data.sha, parents: [latestSha]
  });
  if (newCommit.status !== 201) { console.error('Commit failed:', newCommit.data); return; }

  console.log('Updating main branch...');
  const update = await api('PATCH', API + '/repos/' + OWNER + '/' + REPO + '/git/refs/heads/main', {
    sha: newCommit.data.sha, force: true
  });
  if (update.status !== 200) { console.error('Branch update failed:', update.data); return; }

  console.log('\nDone! ' + entries.length + ' files committed.');
  console.log('Repo: https://github.com/' + OWNER + '/' + REPO);
  console.log('');
  console.log('NEXT STEP:');
  console.log('1. Go to https://render.com');
  console.log('2. Sign in with GitHub (use your GitHub account)');
  console.log('3. Click "New +" -> "Blueprint"');
  console.log('4. Select the "' + REPO + '" repository');
  console.log('5. Click "Apply" - Render handles the rest!');
}

main().catch(e => console.error(e.message || e));
