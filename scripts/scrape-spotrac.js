/**
 * GRIDLEDGER — SPOTRAC SCRAPER v3
 * Complete rewrite. Verbose logging. Bulletproof inserts.
 */

// ─── YOUR CREDENTIALS ────────────────────────────────────────
var SUPA_URL = 'https://vvfyueflpdjbphxolckn.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4\_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU'; // <── PASTE KEY HERE
// ──────────────────────────────────────────────────────────────

var TEAMS = [
  { id: 'ARI', slug: 'arizona-cardinals' },
  { id: 'ATL', slug: 'atlanta-falcons' },
  { id: 'BAL', slug: 'baltimore-ravens' },
  { id: 'BUF', slug: 'buffalo-bills' },
  { id: 'CAR', slug: 'carolina-panthers' },
  { id: 'CHI', slug: 'chicago-bears' },
  { id: 'CIN', slug: 'cincinnati-bengals' },
  { id: 'CLE', slug: 'cleveland-browns' },
  { id: 'DAL', slug: 'dallas-cowboys' },
  { id: 'DEN', slug: 'denver-broncos' },
  { id: 'DET', slug: 'detroit-lions' },
  { id: 'GB',  slug: 'green-bay-packers' },
  { id: 'HOU', slug: 'houston-texans' },
  { id: 'IND', slug: 'indianapolis-colts' },
  { id: 'JAX', slug: 'jacksonville-jaguars' },
  { id: 'KC',  slug: 'kansas-city-chiefs' },
  { id: 'LAC', slug: 'los-angeles-chargers' },
  { id: 'LAR', slug: 'los-angeles-rams' },
  { id: 'LV',  slug: 'las-vegas-raiders' },
  { id: 'MIA', slug: 'miami-dolphins' },
  { id: 'MIN', slug: 'minnesota-vikings' },
  { id: 'NE',  slug: 'new-england-patriots' },
  { id: 'NO',  slug: 'new-orleans-saints' },
  { id: 'NYG', slug: 'new-york-giants' },
  { id: 'NYJ', slug: 'new-york-jets' },
  { id: 'PHI', slug: 'philadelphia-eagles' },
  { id: 'PIT', slug: 'pittsburgh-steelers' },
  { id: 'SEA', slug: 'seattle-seahawks' },
  { id: 'SF',  slug: 'san-francisco-49ers' },
  { id: 'TB',  slug: 'tampa-bay-buccaneers' },
  { id: 'TEN', slug: 'tennessee-titans' },
  { id: 'WAS', slug: 'washington-commanders' },
];

function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function toM(raw) {
  if (!raw || raw === 0) return 0;
  var n = Math.abs(raw);
  if (n > 50000) return Math.round(raw / 10000) / 100;
  return Math.round(raw * 100) / 100;
}

// ─── SUPABASE: Simple fetch wrappers with full logging ────────

async function supaDelete(table, filter) {
  var res = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + filter, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
  });
  return res.ok;
}

async function supaInsert(table, rows) {
  var res = await fetch(SUPA_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  var body = await res.text();
  if (!res.ok) {
    console.log('    INSERT ERROR ' + table + ': ' + res.status + ' ' + body.substring(0, 150));
    return null;
  }
  try { return JSON.parse(body); } catch(e) { return null; }
}

async function supaSelect(table, filter) {
  var res = await fetch(SUPA_URL + '/rest/v1/' + table + '?select=*&' + filter, {
    method: 'GET',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
  });
  var body = await res.text();
  if (!res.ok) return [];
  try { return JSON.parse(body); } catch(e) { return []; }
}

async function supaPatch(table, filter, data) {
  await fetch(SUPA_URL + '/rest/v1/' + table + '?' + filter, {
    method: 'PATCH',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// ─── SCRAPE ───────────────────────────────────────────────────

async function scrapeTeam(browser, team) {
  var page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('https://www.spotrac.com/nfl/' + team.slug + '/cap/_/year/2026', {
      waitUntil: 'networkidle2', timeout: 45000,
    });
  } catch(e) {
    try {
      await page.goto('https://www.spotrac.com/nfl/' + team.slug + '/cap', {
        waitUntil: 'networkidle2', timeout: 45000,
      });
    } catch(e2) {
      await page.close();
      throw new Error('Page timeout');
    }
  }

  await wait(4000);
  await page.mouse.wheel({ deltaY: 2000 });
  await wait(1000);
  await page.mouse.wheel({ deltaY: 4000 });
  await wait(1500);
  await page.mouse.wheel({ deltaY: 6000 });
  await wait(2000);
  await page.mouse.wheel({ deltaY: -15000 });
  await wait(1000);

  var data = await page.evaluate(function() {
    function parseDollar(text) {
      if (!text) return 0;
      text = text.trim();
      if (text === '-' || text === '' || text === '$-') return 0;
      var neg = text.indexOf('(') >= 0;
      var c = text.replace(/[^0-9.]/g, '');
      if (!c) return 0;
      return neg ? -parseFloat(c) : parseFloat(c);
    }

    function getSection(table) {
      var el = table;
      for (var i = 0; i < 10; i++) {
        el = el.previousElementSibling || (el.parentElement ? el.parentElement.previousElementSibling : null);
        if (!el) break;
        var t = (el.textContent || '').toLowerCase().substring(0, 200);
        if (t.includes('active roster')) return 'active';
        if (t.includes('injured reserve')) return 'ir';
        if (t.includes('pup') || t.includes('physically unable')) return 'pup';
        if (t.includes('practice squad')) return 'ps';
        if (t.includes('dead') || t.includes('traded') || t.includes('released')) return 'dead';
        if (t.includes('draft') || t.includes('projected')) return 'draft';
        if (t.includes('did not report')) return 'holdout';
      }
      return 'active';
    }

    var allPlayers = [];
    var allPicks = [];
    var tables = document.querySelectorAll('table');

    tables.forEach(function(table) {
      var section = getSection(table);

      // Read header names
      var hdrs = [];
      table.querySelectorAll('thead th, thead td').forEach(function(th) {
        hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g, ' '));
      });

      // Map columns
      var ci = {}; // column indices
      hdrs.forEach(function(h, idx) {
        if (idx === 0) ci.name = 0;
        if (h === 'pos' || h === 'pos.') ci.pos = idx;
        if (h === 'age') ci.age = idx;
        if ((h.includes('cap hit') || h === 'cap') && !h.includes('pct') && !h.includes('%') && ci.capHit === undefined) ci.capHit = idx;
        if (h.includes('dead')) ci.deadCap = idx;
        if (h.includes('base') || h.includes('p5 sal')) ci.base = idx;
        if (h.includes('signing')) ci.signing = idx;
        if (h.includes('roster') && h.includes('bon')) ci.roster = idx;
        if (h.includes('option')) ci.option = idx;
        if (h.includes('round')) ci.round = idx;
      });

      // Defaults
      if (ci.pos === undefined) ci.pos = 1;
      if (ci.age === undefined) ci.age = 2;

      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(row) {
        var cells = row.querySelectorAll('td');
        if (cells.length < 3) return;

        var nameCell = cells[ci.name || 0];
        var link = nameCell ? nameCell.querySelector('a') : null;
        var name = (link ? link.textContent : (nameCell ? nameCell.textContent : '')).trim();
        name = name.replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();

        if (!name || name.length < 3) return;
        if (/^(total|cap |salary|active|player|dead money|top 51|league|team)/i.test(name)) return;

        var pos = ci.pos < cells.length ? cells[ci.pos].textContent.trim() : '';
        if (pos.length > 5) pos = '';

        var age = null;
        if (ci.age < cells.length) {
          var av = parseInt(cells[ci.age].textContent.trim());
          if (av >= 18 && av <= 50) age = av;
        }

        // Draft picks
        if (section === 'draft') {
          var rnd = ci.round !== undefined && ci.round < cells.length ? cells[ci.round].textContent.trim() : name;
          var capVal = ci.capHit !== undefined && ci.capHit < cells.length ? parseDollar(cells[ci.capHit].textContent) : 0;
          allPicks.push({ round: rnd, cap: capVal });
          return;
        }

        var capHit = ci.capHit !== undefined && ci.capHit < cells.length ? parseDollar(cells[ci.capHit].textContent) : 0;
        var deadCap = ci.deadCap !== undefined && ci.deadCap < cells.length ? parseDollar(cells[ci.deadCap].textContent) : 0;
        var baseSal = ci.base !== undefined && ci.base < cells.length ? parseDollar(cells[ci.base].textContent) : 0;
        var signBon = ci.signing !== undefined && ci.signing < cells.length ? parseDollar(cells[ci.signing].textContent) : 0;
        var rostBon = ci.roster !== undefined && ci.roster < cells.length ? parseDollar(cells[ci.roster].textContent) : 0;

        allPlayers.push({
          name: name,
          pos: pos || 'UNK',
          age: age,
          sec: section,
          capHit: capHit,
          deadCap: deadCap,
          base: baseSal,
          signBonus: signBon,
          rostBonus: rostBon,
        });
      });
    });

    return { players: allPlayers, picks: allPicks };
  });

  await page.close();
  return data;
}

// ─── SYNC TO DB ───────────────────────────────────────────────

async function syncTeam(team, data) {
  var players = data.players.filter(function(p) {
    if (!p.name || p.name.length < 3) return false;
    if (/^R\d+[,\s]/.test(p.name)) return false;
    return p.capHit !== 0 || p.base !== 0 || p.deadCap !== 0;
  });

  if (players.length === 0) return { players: 0, contracts: 0, picks: 0, breakdown: {} };

  // ─── STEP 1: Delete old data ───
  await supaDelete('contracts', 'team_id=eq.' + team.id);
  await supaDelete('players', 'team_id=eq.' + team.id);
  await supaDelete('draft_picks', 'current_owner=eq.' + team.id);

  // ─── STEP 2: Insert players one batch, then read back ───
  var playerRows = players.map(function(p) {
    var rs = 'active';
    var st = 'active';
    if (p.sec === 'ps') rs = 'practice_squad';
    if (p.sec === 'ir') { rs = 'reserve'; st = 'injured_reserve'; }
    if (p.sec === 'pup') { rs = 'reserve'; st = 'pup'; }
    if (p.sec === 'dead' || p.sec === 'holdout') { rs = 'dead'; st = 'free_agent'; }
    return {
      team_id: team.id,
      name: p.name,
      position: p.pos,
      age: p.age,
      status: st,
      roster_status: rs,
      experience: 0,
    };
  });

  // Insert in small batches
  var insertOk = 0;
  for (var i = 0; i < playerRows.length; i += 20) {
    var batch = playerRows.slice(i, i + 20);
    var res = await supaInsert('players', batch);
    if (res && res.length) {
      insertOk += res.length;
    } else {
      // Try singles
      for (var j = 0; j < batch.length; j++) {
        var sr = await supaInsert('players', [batch[j]]);
        if (sr && sr.length) insertOk++;
      }
    }
  }

  // ─── STEP 3: Read back ALL players to get their IDs ───
  var dbPlayers = await supaSelect('players', 'team_id=eq.' + team.id + '&order=name');

  // ─── STEP 4: Insert contracts by matching name ───
  var contractCount = 0;
  for (var k = 0; k < players.length; k++) {
    var p = players[k];
    // Find matching DB player by name
    var match = dbPlayers.find(function(dbp) {
      return dbp.name.toLowerCase() === p.name.toLowerCase();
    });
    if (!match) continue;

    var contractRow = {
      player_id: match.id,
      team_id: team.id,
      base_salary: toM(p.base),
      cap_hit: toM(p.capHit),
      dead_cap: toM(p.deadCap),
      signing_bonus: toM(p.signBonus),
      roster_bonus: toM(p.rostBonus),
      is_current: true,
    };

    var cr = await supaInsert('contracts', [contractRow]);
    if (cr && cr.length) contractCount++;
  }

  // ─── STEP 5: Draft picks ───
  var pickCount = 0;
  var tradeVals = { 1: 3000, 2: 1800, 3: 1100, 4: 600, 5: 300, 6: 180, 7: 80 };
  for (var d = 0; d < data.picks.length; d++) {
    var pk = data.picks[d];
    var rn = parseInt((pk.round || '').replace(/[^0-9]/g, ''));
    if (!rn || rn < 1 || rn > 7) continue;
    var pr = await supaInsert('draft_picks', [{
      original_team: team.id,
      current_owner: team.id,
      round: rn,
      year: 2026,
      trade_value: tradeVals[rn] || 0,
    }]);
    if (pr && pr.length) pickCount++;
  }

  // ─── STEP 6: Update team totals ───
  var totalCap = players.reduce(function(s, p) { return s + p.capHit; }, 0);
  var totalDead = players.filter(function(p) { return p.sec === 'dead'; })
    .reduce(function(s, p) { return s + Math.abs(p.deadCap || p.capHit); }, 0);

  await supaPatch('teams', 'id=eq.' + team.id, {
    cap_total: 301.2,
    cap_used: toM(totalCap),
    cap_space: toM(301200000 - totalCap),
    dead_money: toM(totalDead),
  });

  // Breakdown
  var br = { active: 0, ir: 0, ps: 0, dead: 0 };
  players.forEach(function(p) {
    if (p.sec === 'active') br.active++;
    else if (p.sec === 'ir' || p.sec === 'pup') br.ir++;
    else if (p.sec === 'ps') br.ps++;
    else if (p.sec === 'dead' || p.sec === 'holdout') br.dead++;
  });

  return { players: insertOk, contracts: contractCount, picks: pickCount, breakdown: br };
}

// ─── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('  GRIDLEDGER — SPOTRAC SCRAPER v3');
  console.log('  ═══════════════════════════════════════');
  console.log('');

  if (SUPA_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('  Paste your key on line 8');
    process.exit(1);
  }

  // Quick connection test
  console.log('  Testing Supabase...');
  var testRes = await fetch(SUPA_URL + '/rest/v1/teams?select=id&limit=1', {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
  });
  if (!testRes.ok) {
    console.log('  FAILED: ' + testRes.status + ' ' + (await testRes.text()).substring(0, 100));
    process.exit(1);
  }
  console.log('  Connected!');
  console.log('');

  var args = process.argv.slice(2).map(function(a) { return a.toUpperCase(); });
  var queue = args.length > 0 ? TEAMS.filter(function(t) { return args.indexOf(t.id) >= 0; }) : TEAMS;

  if (queue.length === 0) {
    console.log('  No matching teams. Use: DAL PHI KC');
    process.exit(1);
  }

  console.log('  ' + queue.length + ' team(s) queued');
  console.log('  ───────────────────────────────────────');
  console.log('');

  var puppeteer = require('puppeteer');
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  var tot = { p: 0, c: 0, dk: 0, t: 0 };

  for (var i = 0; i < queue.length; i++) {
    var team = queue[i];
    process.stdout.write('  [' + (i + 1) + '/' + queue.length + '] ' + team.id.padEnd(4));

    try {
      var data = await scrapeTeam(browser, team);

      if (data.players.length === 0) {
        console.log(' ⚠  No data scraped');
        continue;
      }

      console.log(' scraped ' + data.players.length + ' players, ' + data.picks.length + ' picks');
      process.stdout.write('               ');

      var r = await syncTeam(team, data);
      var b = r.breakdown;

      tot.p += r.players;
      tot.c += r.contracts;
      tot.dk += r.picks;
      tot.t++;

      console.log('→ DB: ' + r.players + ' players, ' + r.contracts + ' contracts, ' + r.picks + ' picks' +
        ' (' + b.active + 'A/' + b.ir + 'IR/' + b.ps + 'PS/' + b.dead + 'D)');

      if (i < queue.length - 1) await wait(3000 + Math.floor(Math.random() * 2000));
    } catch(err) {
      console.log(' ✗ ' + err.message);
    }
  }

  await browser.close();

  console.log('');
  console.log('  ═══════════════════════════════════════');
  console.log('  DONE: ' + tot.t + '/' + queue.length + ' teams');
  console.log('  ' + tot.p + ' players | ' + tot.c + ' contracts | ' + tot.dk + ' picks');
  console.log('  ═══════════════════════════════════════');
  console.log('');
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });