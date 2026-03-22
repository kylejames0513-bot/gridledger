/**
 * ═══════════════════════════════════════════════════════════════
 * GRIDLEDGER — SPOTRAC SCRAPER v4
 * ═══════════════════════════════════════════════════════════════
 *
 * FIXES from v3:
 *   1. Section detection reads ACTUAL header text above each table
 *      ("Active Roster", "Dead/Traded/Released", "Practice Squad", etc.)
 *      instead of guessing by table size/order
 *   2. Dollar→millions conversion happens PER PLAYER before summing
 *   3. Summary table (rollover, adjusted cap, cap space) parsed properly
 *   4. roster_status set correctly: active, practice_squad, reserve, dead
 *   5. Practice squad is correctly empty pre-season (not a bug)
 *
 * Usage:
 *   node scrape.js                  (all 32 teams + FA + TX + NEWS)
 *   node scrape.js DAL              (one team)
 *   node scrape.js DAL PHI KC       (multiple teams)
 *   node scrape.js FA               (free agents only)
 *   node scrape.js TX               (transactions only)
 *   node scrape.js NEWS             (news only)
 *
 * Requires: npm install puppeteer
 * ═══════════════════════════════════════════════════════════════
 */

// ─── YOUR CREDENTIALS ─────────────────────────────────────────
var SUPA_URL = 'https://vvfyueflpdjbphxolckn.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU';
// ──────────────────────────────────────────────────────────────

var CAP_2026 = 301.2; // millions

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

/**
 * Convert raw dollar amount to millions.
 * Handles both raw cents (26958130 → 26.96) and already-in-millions (26.96 → 26.96)
 */
function toM(raw) {
  if (!raw || raw === 0) return 0;
  var n = Math.abs(raw);
  var sign = raw < 0 ? -1 : 1;
  // If the number is > 50000, it's in raw dollars — convert to millions
  if (n > 50000) return Math.round((n / 1000000) * 100) / 100 * sign;
  // Otherwise it's already in millions or a small number
  return Math.round(raw * 100) / 100;
}


// ═══════════════════════════════════════════════════════════════
// SUPABASE HELPERS
// ═══════════════════════════════════════════════════════════════

async function del(path) {
  await fetch(SUPA_URL + '/rest/v1/' + path, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
  });
}

async function api(path, method, body) {
  var opts = {
    method: method,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  var res = await fetch(SUPA_URL + '/rest/v1/' + path, opts);
  var text = await res.text();
  if (!res.ok) {
    // On conflict, try one-by-one
    if (res.status === 409 && Array.isArray(body)) {
      var ok = [];
      for (var i = 0; i < body.length; i++) {
        try {
          var r2 = await api(path, method, [body[i]]);
          if (r2 && r2.length) ok.push(r2[0]);
        } catch(e) {}
      }
      return ok;
    }
    return null;
  }
  try { return JSON.parse(text); } catch(e) { return null; }
}


// ═══════════════════════════════════════════════════════════════
// PAGE EXTRACTION — runs inside Puppeteer browser context
// ═══════════════════════════════════════════════════════════════

/**
 * This function runs in the browser via page.evaluate().
 * It extracts ALL players, picks, and summary data from a Spotrac cap page.
 *
 * KEY FIX: getSection() walks UP the DOM from each table to find the
 * nearest section header text, correctly identifying:
 *   - "active roster" → active
 *   - "injured reserve" → ir
 *   - "physically unable" / "pup" → pup
 *   - "practice squad" → ps
 *   - "dead" / "traded" / "released" → dead
 *   - "did not report" → holdout (treated as dead)
 *   - "draft" / "projected" → draft
 */
var EXTRACT_PAGE = function() {

  // ── Dollar parser ──
  function $(t) {
    if (!t) return 0;
    t = t.trim();
    if (t === '-' || t === '' || t === '$-' || t === '$0') return 0;
    var neg = t.indexOf('(') >= 0;
    var c = t.replace(/[^0-9.]/g, '');
    if (!c) return 0;
    return neg ? -parseFloat(c) : parseFloat(c);
  }

  // Negative-aware parser for summary table
  function $neg(t) {
    if (!t) return 0;
    t = t.trim();
    if (t === '-' || t === '' || t === '$-') return 0;
    var isNeg = t.indexOf('(') >= 0 || (t.indexOf('-') >= 0 && t.indexOf('$') >= 0);
    var c = t.replace(/[^0-9.]/g, '');
    if (!c) return 0;
    return isNeg ? -parseFloat(c) : parseFloat(c);
  }

  // ── SECTION DETECTION (THE KEY FIX) ──
  // Walk up/back from a table element looking for header text
  function getSection(table) {
    var el = table;
    // Walk up to 15 previous siblings and parent siblings
    for (var i = 0; i < 15; i++) {
      el = el.previousElementSibling || (el.parentElement ? el.parentElement.previousElementSibling : null);
      if (!el) break;

      // Check this element and its children for header text
      var candidates = [el];
      // Also check h1-h6, div, span children
      var kids = el.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, a, th');
      for (var k = 0; k < kids.length; k++) candidates.push(kids[k]);

      for (var j = 0; j < candidates.length; j++) {
        var t = (candidates[j].textContent || '').toLowerCase().substring(0, 300);

        // Order matters — check more specific patterns first
        if (t.includes('practice squad'))                              return 'ps';
        if (t.includes('injured reserve'))                             return 'ir';
        if (t.includes('physically unable') || t.includes('pup'))      return 'pup';
        if (t.includes('did not report'))                              return 'holdout';
        if (t.includes('dead') || t.includes('traded') || t.includes('released')) return 'dead';
        if (t.includes('draft') || t.includes('projected'))            return 'draft';
        if (t.includes('active roster') || t.includes('active cap'))   return 'active';
      }
    }
    // Last resort: if we couldn't find a header, DON'T default to active.
    // Return 'unknown' so we can handle it explicitly.
    return 'unknown';
  }

  // ── EXTRACT ALL TABLES ──
  var players = [];
  var picks = [];
  var tableLog = [];
  var tables = document.querySelectorAll('table');

  tables.forEach(function(table, tableIdx) {
    var rows = table.querySelectorAll('tbody tr');
    if (rows.length < 1) return;

    var section = getSection(table);
    tableLog.push(tableIdx + ':' + section + '(' + rows.length + ')');

    // Skip unknown tiny tables (navigation, ads, etc.)
    if (section === 'unknown' && rows.length < 5) return;
    // If unknown but has many rows, it's probably active roster
    if (section === 'unknown' && rows.length >= 15) section = 'active';
    // Still unknown with medium rows — skip to be safe
    if (section === 'unknown') return;

    // ── Read column headers ──
    var hdrs = [];
    table.querySelectorAll('thead th, thead td').forEach(function(th) {
      hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g, ' '));
    });

    var c = {};
    hdrs.forEach(function(h, i) {
      if (i === 0) c.name = 0;
      if (h === 'pos' || h === 'pos.') c.pos = i;
      if (h === 'age') c.age = i;
      if ((h.includes('cap hit') || h === 'cap') && !h.includes('pct') && !h.includes('%') && c.cap === undefined) c.cap = i;
      if ((h.includes('cap hit pct') || h.includes('cap hit %') || h.includes('cap %')) && c.capPct === undefined) c.capPct = i;
      if (h.includes('dead') && !h.includes('deadline')) c.dead = i;
      if (h.includes('base') || h.includes('p5 sal')) c.base = i;
      if (h.includes('signing')) c.sign = i;
      if (h.includes('roster') && h.includes('bon')) c.rost = i;
      if (h.includes('cash')) c.cash = i;
      if (h.includes('free agent') || h.includes('fa year') || h.includes('contract status')) c.faYear = i;
      if (h.includes('round')) c.round = i;
    });
    if (c.pos === undefined) c.pos = 1;
    if (c.age === undefined) c.age = 2;

    // ── Parse rows ──
    rows.forEach(function(row) {
      var td = row.querySelectorAll('td');
      if (td.length < 3) return;

      var nc = td[c.name || 0];
      var lk = nc ? nc.querySelector('a') : null;
      var nm = (lk ? lk.textContent : (nc ? nc.textContent : '')).trim()
        .replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();
      if (!nm || nm.length < 3) return;
      if (/^(total|cap |salary|active|player|dead money|top 51|league|team|offense|defense|special)/i.test(nm)) return;

      var pos = c.pos < td.length ? td[c.pos].textContent.trim() : '';
      if (pos.length > 5) pos = '';

      var age = null;
      if (c.age < td.length) {
        var av = parseInt(td[c.age].textContent.trim());
        if (av >= 18 && av <= 50) age = av;
      }

      // Draft picks
      if (section === 'draft') {
        var roundCell = c.round !== undefined && c.round < td.length ? td[c.round].textContent.trim() : nm;
        var capVal = c.cap !== undefined && c.cap < td.length ? $(td[c.cap].textContent) : 0;
        var digitMatch = roundCell.match(/(\d)/);
        var roundNum = digitMatch ? parseInt(digitMatch[1]) : 0;
        if (roundNum >= 1 && roundNum <= 7) picks.push({ round: roundNum, cap: capVal });
        return;
      }

      // Skip draft pick placeholder rows that leaked into other sections
      if (/^R\d+[,\s]/.test(nm)) return;

      // Parse dollar values
      function g(k) { return c[k] !== undefined && c[k] < td.length ? $(td[c[k]].textContent) : 0; }

      var faYear = 0;
      if (c.faYear !== undefined && c.faYear < td.length) {
        var fy = td[c.faYear].textContent.trim().match(/(\d{4})/);
        if (fy) faYear = parseInt(fy[1]);
      }

      var cashVal = 0;
      if (c.cash !== undefined && c.cash < td.length) cashVal = $(td[c.cash].textContent);

      var capPct = '';
      if (c.capPct !== undefined && c.capPct < td.length) capPct = td[c.capPct].textContent.trim();

      players.push({
        nm: nm,
        pos: pos || 'UNK',
        age: age,
        sec: section,          // <-- THIS is now correctly set by getSection()
        cap: g('cap'),
        dead: g('dead'),
        base: g('base'),
        sign: g('sign'),
        rost: g('rost'),
        cash: cashVal,
        faYear: faYear,
        capPct: capPct,
      });
    });
  });

  // Filter out zero-value junk rows
  players = players.filter(function(p) {
    return p.cap !== 0 || p.base !== 0 || p.dead !== 0;
  });

  // ── PARSE SUMMARY TABLE ──
  // Look for the small table with "Salary Cap", "Rollover", "Cap Space" etc.
  var summary = { rollover: 0, adjustment: 0, adjustedCap: 0, capSpace: 0, activeRoster: 0, deadMoney: 0 };

  for (var si = 0; si < tables.length; si++) {
    var st = tables[si];
    var srows = st.querySelectorAll('tbody tr, tr');
    if (srows.length < 3 || srows.length > 25) continue;
    var firstCell = srows[0] ? srows[0].querySelector('td') : null;
    if (!firstCell) continue;
    var fc = firstCell.textContent.trim().toLowerCase();
    if (!fc.includes('salary cap') && !fc.includes('nfl') && !fc.includes('cap ceiling')) continue;

    srows.forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      var label = cells[0].textContent.trim().toLowerCase();
      var rawVal = cells[cells.length - 1].textContent.trim(); // Last cell has the value

      if (label.includes('rollover'))                                    summary.rollover = $(rawVal);
      else if (label.includes('adjustment') && !label.includes('adjusted')) summary.adjustment = $neg(rawVal);
      else if (label.includes('adjusted') && label.includes('cap'))      summary.adjustedCap = $(rawVal);
      else if (label.includes('cap space') || label.includes('top 51'))  summary.capSpace = $neg(rawVal);
      else if (label.includes('active roster'))                          summary.activeRoster = $(rawVal);
      else if (label.includes('dead money') || label.includes('dead cap')) summary.deadMoney = $(rawVal);
    });
    break;
  }

  return { players: players, picks: picks, tables: tableLog, summary: summary };
};


// ═══════════════════════════════════════════════════════════════
// CONTRACTS PAGE EXTRACTION
// ═══════════════════════════════════════════════════════════════

var EXTRACT_CONTRACTS = function() {
  function $(t) {
    if (!t) return 0; t = t.trim();
    if (t === '-' || t === '' || t === '$-') return 0;
    var n = t.indexOf('(') >= 0;
    var c = t.replace(/[^0-9.]/g, '');
    if (!c) return 0;
    return n ? -parseFloat(c) : parseFloat(c);
  }

  var contracts = {};
  var tables = Array.from(document.querySelectorAll('table'));

  tables.forEach(function(table) {
    var hdrs = [];
    table.querySelectorAll('thead th, thead td').forEach(function(th) {
      hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g, ' '));
    });

    var c = {};
    hdrs.forEach(function(h, i) {
      if (i === 0) c.name = 0;
      if (h === 'pos' || h === 'pos.') c.pos = i;
      if (h.includes('years')) c.years = i;
      if (h.includes('value') || h.includes('total')) c.value = i;
      if ((h.includes('avg') || h.includes('aav') || h.includes('apy')) && c.avg === undefined) c.avg = i;
      if (h.includes('guaranteed') || h.includes('gtd') || h.includes('guar')) c.guar = i;
      if (h.includes('free agent') || h.includes('fa year') || h.includes('expir')) c.faYear = i;
    });

    table.querySelectorAll('tbody tr').forEach(function(row) {
      var td = row.querySelectorAll('td');
      if (td.length < 3) return;

      var nc = td[c.name || 0];
      var lk = nc ? nc.querySelector('a') : null;
      var nm = (lk ? lk.textContent : (nc ? nc.textContent : '')).trim()
        .replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();
      if (!nm || nm.length < 3) return;
      if (/^(total|cap|salary|active|player|team)/i.test(nm)) return;

      var years = c.years !== undefined && c.years < td.length ? parseInt(td[c.years].textContent.trim()) || 1 : 1;
      var totalVal = c.value !== undefined && c.value < td.length ? $(td[c.value].textContent) : 0;
      var guaranteed = c.guar !== undefined && c.guar < td.length ? $(td[c.guar].textContent) : 0;
      var faYear = 0;
      if (c.faYear !== undefined && c.faYear < td.length) {
        var fy = td[c.faYear].textContent.trim().match(/(\d{4})/);
        if (fy) faYear = parseInt(fy[1]);
      }

      contracts[nm.toLowerCase()] = {
        years: years,
        totalValue: totalVal,
        guaranteed: guaranteed,
        faYear: faYear,
      };
    });
  });

  return contracts;
};


// ═══════════════════════════════════════════════════════════════
// SCRAPE + SYNC ONE TEAM
// ═══════════════════════════════════════════════════════════════

async function run(browser, team) {
  var page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });

  // ── Load cap page ──
  try {
    await page.goto('https://www.spotrac.com/nfl/' + team.slug + '/cap/_/year/2026', {
      waitUntil: 'networkidle2', timeout: 45000,
    });
  } catch(e) {
    try {
      await page.goto('https://www.spotrac.com/nfl/' + team.slug + '/cap', {
        waitUntil: 'networkidle2', timeout: 45000,
      });
    } catch(e2) { await page.close(); throw new Error('Cap page timeout'); }
  }

  // Scroll to load all lazy content
  await wait(3000);
  for (var scroll = 0; scroll < 5; scroll++) {
    await page.mouse.wheel({ deltaY: 2000 });
    await wait(800);
  }
  await page.mouse.wheel({ deltaY: -20000 });
  await wait(1500);

  var data = await page.evaluate(EXTRACT_PAGE);

  // ── Load contracts page for years/guaranteed ──
  var contractData = {};
  try {
    await page.goto('https://www.spotrac.com/nfl/' + team.slug + '/contracts', {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await wait(2000);
    for (var s2 = 0; s2 < 3; s2++) { await page.mouse.wheel({ deltaY: 2000 }); await wait(600); }
    contractData = await page.evaluate(EXTRACT_CONTRACTS);
  } catch(e) { /* contracts page optional */ }

  await page.close();

  // ── Filter valid players ──
  var validPlayers = data.players.filter(function(p) {
    if (/^R\d+[,\s]/.test(p.nm)) return false;
    return true;
  });

  if (validPlayers.length === 0) throw new Error('No players found');

  // ── Compute section counts ──
  var counts = { active: 0, ir: 0, pup: 0, ps: 0, dead: 0, holdout: 0 };
  validPlayers.forEach(function(p) {
    if (counts[p.sec] !== undefined) counts[p.sec]++;
    else counts.active++; // fallback
  });

  var countStr = validPlayers.length + 'p(' +
    counts.active + 'A/' + counts.ir + 'IR/' +
    counts.ps + 'PS/' + counts.dead + 'D';
  if (counts.pup) countStr += '/' + counts.pup + 'PUP';
  if (counts.holdout) countStr += '/' + counts.holdout + 'HO';
  countStr += ')';
  if (data.picks.length) countStr += ' ' + data.picks.length + 'pk';
  process.stdout.write(countStr + '\n');
  console.log('         tables: ' + data.tables.join(', '));

  // ── Compute cap numbers (convert EACH player to M first, THEN sum) ──
  var sum = data.summary;
  var rolloverM = toM(sum.rollover);
  var adjustmentM = toM(sum.adjustment);

  var activeCapM = 0, deadCapM = 0;
  validPlayers.forEach(function(p) {
    var hitM = toM(p.cap);
    if (p.sec === 'dead' || p.sec === 'holdout') {
      deadCapM += Math.abs(hitM);
    } else if (p.sec !== 'draft') {
      activeCapM += hitM;
    }
  });
  activeCapM = Math.round(activeCapM * 100) / 100;
  deadCapM = Math.round(deadCapM * 100) / 100;

  // Use Spotrac's summary if available, otherwise calculate
  var adjustedCapM = toM(sum.adjustedCap);
  if (adjustedCapM < 200) adjustedCapM = Math.round((CAP_2026 + rolloverM + adjustmentM) * 100) / 100;

  var top51SpaceM = toM(sum.capSpace);
  var usedM, spaceM;

  if (top51SpaceM !== 0) {
    // Spotrac gave us the real cap space — use it
    spaceM = top51SpaceM;
    usedM = Math.round((adjustedCapM - spaceM) * 100) / 100;
  } else {
    // Calculate manually
    usedM = Math.round((activeCapM + deadCapM) * 100) / 100;
    spaceM = Math.round((adjustedCapM - usedM) * 100) / 100;
  }

  console.log('         cap: active=$' + activeCapM + 'M dead=$' + deadCapM + 'M');
  console.log('         spotrac: rollover=$' + rolloverM + 'M adj=$' + adjustmentM +
    'M adjCap=$' + adjustedCapM + 'M space=$' + spaceM + 'M');

  // ── CLEAR OLD DATA ──
  await del('contracts?team_id=eq.' + team.id);
  await del('players?team_id=eq.' + team.id);
  await del('draft_picks?current_owner=eq.' + team.id);

  // ── INSERT PLAYERS with correct roster_status ──
  var playerRows = validPlayers.map(function(p) {
    var rs = 'active', st = 'active';
    if (p.sec === 'ps')                            { rs = 'practice_squad'; st = 'active'; }
    if (p.sec === 'ir')                            { rs = 'reserve'; st = 'injured_reserve'; }
    if (p.sec === 'pup')                           { rs = 'reserve'; st = 'pup'; }
    if (p.sec === 'dead' || p.sec === 'holdout')   { rs = 'dead'; st = 'free_agent'; }
    return {
      team_id: team.id,
      name: p.nm,
      position: p.pos,
      age: p.age,
      status: st,
      roster_status: rs,
      experience: 0,
    };
  });

  var ic = 0;
  for (var i = 0; i < playerRows.length; i += 20) {
    var batch = playerRows.slice(i, i + 20);
    var r = await api('players', 'POST', batch);
    if (r && r.length) ic += r.length;
    else {
      for (var j = 0; j < batch.length; j++) {
        var s = await api('players', 'POST', [batch[j]]);
        if (s && s.length) ic++;
      }
    }
  }

  // ── READ BACK IDs ──
  var dbp = await api('players?team_id=eq.' + team.id + '&select=id,name&order=name', 'GET');
  if (!dbp || !dbp.length) return { p: ic, c: 0, pk: 0 };

  // ── INSERT CONTRACTS ──
  var cc = 0;
  for (var k = 0; k < validPlayers.length; k++) {
    var p = validPlayers[k];
    var m = dbp.find(function(x) { return x.name.toLowerCase() === p.nm.toLowerCase(); });
    if (!m) continue;

    // Merge contract details from contracts page
    var cd = contractData[p.nm.toLowerCase()] || {};
    var years = cd.years || 1;
    var totalVal = cd.totalValue || 0;
    var guaranteed = cd.guaranteed || 0;
    var faYear = p.faYear || cd.faYear || null;

    var cr = await api('contracts', 'POST', [{
      player_id: m.id,
      team_id: team.id,
      base_salary: toM(p.base),
      cap_hit: toM(p.cap),
      dead_cap: toM(p.dead),
      signing_bonus: toM(p.sign),
      roster_bonus: toM(p.rost),
      guaranteed: toM(guaranteed),
      total_value: toM(totalVal),
      cash_total: toM(p.cash),
      years: years,
      year_expires: faYear,
      is_current: true,
    }]);
    if (cr && cr.length) cc++;
  }

  // ── INSERT DRAFT PICKS ──
  var pc = 0;
  var tradeValues = { 1: 3000, 2: 1800, 3: 1100, 4: 600, 5: 300, 6: 180, 7: 80 };
  for (var d = 0; d < data.picks.length; d++) {
    var rn = data.picks[d].round;
    if (!rn || rn < 1 || rn > 7) continue;
    var pr = await api('draft_picks', 'POST', [{
      original_team: team.id,
      current_owner: team.id,
      round: rn,
      year: 2026,
      trade_value: tradeValues[rn] || 0,
    }]);
    if (pr && pr.length) pc++;
  }

  // ── UPDATE TEAM RECORD ──
  await fetch(SUPA_URL + '/rest/v1/teams?id=eq.' + team.id, {
    method: 'PATCH',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      cap_total: adjustedCapM > 200 ? adjustedCapM : CAP_2026,
      cap_used: usedM,
      cap_space: spaceM,
      dead_money: deadCapM,
    }),
  });

  console.log('         -> ' + ic + 'p ' + cc + 'c ' + pc + 'pk | used=$' + usedM + 'M space=$' + spaceM + 'M');
  return { p: ic, c: cc, pk: pc };
}


// ═══════════════════════════════════════════════════════════════
// FREE AGENTS
// ═══════════════════════════════════════════════════════════════

var EXTRACT_FA = function() {
  function $(t) {
    if (!t) return 0; t = t.trim();
    if (t === '-' || t === '' || t === '$-') return 0;
    var n = t.indexOf('(') >= 0;
    var c = t.replace(/[^0-9.]/g, '');
    if (!c) return 0;
    return n ? -parseFloat(c) : parseFloat(c);
  }

  var fas = [];
  document.querySelectorAll('table tbody tr').forEach(function(row) {
    var td = row.querySelectorAll('td');
    if (td.length < 4) return;
    var lk = td[0].querySelector('a');
    var nm = lk ? lk.textContent.trim() : td[0].textContent.trim();
    nm = nm.replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();
    if (!nm || nm.length < 3 || /^(total|player|cap)/i.test(nm)) return;

    var pos = td.length > 1 ? td[1].textContent.trim() : '';
    if (pos.length > 5) pos = '';
    var age = td.length > 2 ? parseInt(td[2].textContent.trim()) || null : null;

    // Find tag/status
    var tag = '';
    for (var i = 0; i < td.length; i++) {
      var ct = td[i].textContent.trim().toLowerCase();
      if (ct.includes('ufa') || ct.includes('rfa') || ct.includes('erfa')) { tag = ct.toUpperCase(); break; }
    }

    // Previous salary
    var prevSalary = 0;
    for (var j = td.length - 1; j >= 3; j--) {
      var v = $(td[j].textContent);
      if (v > 0) { prevSalary = v; break; }
    }

    var team = '';
    for (var t2 = 0; t2 < td.length; t2++) {
      var img = td[t2].querySelector('img');
      if (img) {
        var src = img.getAttribute('src') || '';
        var tmatch = src.match(/\/([a-z]{2,3})\.png/i);
        if (tmatch) { team = tmatch[1].toUpperCase(); break; }
      }
    }

    fas.push({ nm: nm, pos: pos, age: age, tag: tag, prevSalary: prevSalary, team: team });
  });
  return fas;
};

async function scrapeFreeAgents(browser) {
  console.log('  Scraping free agents...');
  var page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('https://www.spotrac.com/nfl/free-agents/_/year/2026', {
      waitUntil: 'networkidle2', timeout: 45000,
    });
  } catch(e) { await page.close(); console.log('    FA page failed'); return 0; }

  await wait(3000);
  for (var s = 0; s < 8; s++) { await page.mouse.wheel({ deltaY: 3000 }); await wait(600); }

  var fas = await page.evaluate(EXTRACT_FA);
  await page.close();
  console.log('    Found ' + fas.length + ' free agents');
  if (!fas.length) return 0;

  // Clear old FAs
  await del('free_agents?id=gt.0');

  var ic = 0;
  for (var i = 0; i < fas.length; i += 20) {
    var batch = fas.slice(i, i + 20).map(function(fa) {
      return {
        name: fa.nm,
        position: fa.pos,
        age: fa.age,
        previous_team: fa.team || null,
        tag: fa.tag || 'UFA',
        previous_salary: toM(fa.prevSalary),
      };
    });
    var r = await api('free_agents', 'POST', batch);
    if (r && r.length) ic += r.length;
  }
  console.log('    Inserted ' + ic + ' free agents');
  return ic;
}


// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS (NFL.com)
// ═══════════════════════════════════════════════════════════════

async function scrapeTransactions(browser) {
  console.log('  Scraping transactions...');
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;

  var types = ['trades', 'signings', 'reserve-list', 'waivers', 'terminations', 'other'];
  var allTx = [];

  for (var t = 0; t < types.length; t++) {
    var page = await browser.newPage();
    try {
      var url = 'https://www.nfl.com/transactions/league/' + types[t] + '/' + year + '/' + month;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await wait(2000);

      var items = await page.evaluate(function(txType) {
        var results = [];
        document.querySelectorAll('tr, .nfl-o-roster-transactions__item, [class*=transaction]').forEach(function(el) {
          var text = el.textContent.trim();
          if (text.length < 10 || text.length > 500) return;
          if (/^(date|transaction|player|team)/i.test(text)) return;

          var dateMatch = text.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2})/i);
          var cells = el.querySelectorAll('td');
          var date = '', team = '', detail = '';

          if (cells.length >= 3) {
            date = cells[0].textContent.trim();
            team = cells[1].textContent.trim().substring(0, 50);
            detail = Array.from(cells).slice(2).map(function(c) { return c.textContent.trim(); }).join(' ').substring(0, 300);
          } else {
            if (dateMatch) date = dateMatch[1];
            detail = text.substring(0, 300);
          }

          if (detail.length > 5) {
            results.push({ date: date, team: team, detail: detail, type: txType });
          }
        });
        return results;
      }, types[t]);

      allTx = allTx.concat(items);
    } catch(e) {}
    await page.close();
    await wait(1500);
  }

  console.log('    Found ' + allTx.length + ' transactions');
  if (!allTx.length) return 0;

  var today = year + '-' + String(month).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

  var ic = 0;
  for (var i = 0; i < allTx.length; i++) {
    var item = allTx[i];
    var txDate = today;
    try {
      if (item.date) {
        var named = item.date.match(/([A-Za-z]+)\.?\s+(\d{1,2})/i);
        if (named) {
          var mkey = named[1].toLowerCase().substring(0, 3);
          var mm = months[mkey] || '01';
          txDate = year + '-' + mm + '-' + String(parseInt(named[2])).padStart(2, '0');
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate)) txDate = today;
    } catch(e) { txDate = today; }

    var typeMap = { trades: 'trade', signings: 'signing', 'reserve-list': 'reserve',
      waivers: 'waiver', terminations: 'release', other: 'other' };

    var r = await api('transactions', 'POST', [{
      player_name: item.detail.substring(0, 100),
      type: typeMap[item.type] || 'other',
      details: item.detail,
      transaction_date: txDate,
      source: 'nfl.com',
      created_at: new Date().toISOString(),
    }]);
    if (r && r.length) ic++;
  }
  console.log('    Inserted ' + ic + ' transactions');
  return ic;
}


// ═══════════════════════════════════════════════════════════════
// NEWS (ESPN RSS)
// ═══════════════════════════════════════════════════════════════

async function scrapeNews(browser) {
  console.log('  Scraping news...');
  var page = await browser.newPage();
  try {
    await page.goto('https://www.espn.com/espn/rss/nfl/news', { waitUntil: 'networkidle2', timeout: 20000 });
    await wait(1500);

    var items = await page.evaluate(function() {
      var results = [];
      document.querySelectorAll('item').forEach(function(item) {
        var title = (item.querySelector('title') || {}).textContent || '';
        var link = (item.querySelector('link') || {}).textContent || '';
        var desc = (item.querySelector('description') || {}).textContent || '';
        var date = (item.querySelector('pubDate') || {}).textContent || '';
        if (title.length > 5) results.push({ title: title, link: link, desc: desc.substring(0, 300), date: date });
      });
      return results;
    });
    await page.close();

    console.log('    Found ' + items.length + ' articles');
    if (!items.length) return 0;

    var ic = 0;
    for (var i = 0; i < Math.min(items.length, 30); i++) {
      var r = await api('news', 'POST', [{
        title: items[i].title,
        summary: items[i].desc || items[i].title,
        source: 'ESPN',
        url: items[i].link,
        published_at: items[i].date ? new Date(items[i].date).toISOString() : new Date().toISOString(),
      }]);
      if (r && r.length) ic++;
    }
    console.log('    Inserted ' + ic + ' news articles');
    return ic;
  } catch(e) {
    await page.close();
    console.log('    News failed: ' + e.message);
    return 0;
  }
}


// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║  GRIDLEDGER SCRAPER v4                ║');
  console.log('  ║  Fixed section detection + dead cap   ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');

  // Validate key
  if (SUPA_KEY.includes('YOUR_SERVICE') || SUPA_KEY.length < 50) {
    console.log('  ERROR: Paste your Supabase service_role key on line 33');
    process.exit(1);
  }

  // Test connection
  var tr = await fetch(SUPA_URL + '/rest/v1/teams?select=id&limit=1', {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
  });
  if (!tr.ok) { console.log('  DB connection failed: ' + tr.status); process.exit(1); }
  console.log('  DB connected');

  // Parse args
  var args = process.argv.slice(2).map(function(a) { return a.toUpperCase(); });
  var faOnly = args.indexOf('FA') >= 0;
  var txOnly = args.indexOf('TX') >= 0;
  var newsOnly = args.indexOf('NEWS') >= 0;
  args = args.filter(function(a) { return a !== 'FA' && a !== 'NEWS' && a !== 'TX'; });

  var q = args.length > 0
    ? TEAMS.filter(function(t) { return args.indexOf(t.id) >= 0; })
    : ((faOnly || txOnly || newsOnly) ? [] : TEAMS);

  var puppeteer = require('puppeteer');
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  var tot = { p: 0, c: 0, pk: 0, ok: 0, fa: 0, tx: 0, news: 0 };

  // ── Team scraping ──
  if (q.length > 0) {
    console.log('  Scraping ' + q.length + ' team(s)...');
    console.log('');

    for (var i = 0; i < q.length; i++) {
      process.stdout.write('  [' + (i + 1) + '/' + q.length + '] ' + q[i].id.padEnd(4) + ' ');
      try {
        var r = await run(browser, q[i]);
        tot.p += r.p; tot.c += r.c; tot.pk += r.pk; tot.ok++;
      } catch(e) {
        console.log('FAIL: ' + e.message);
      }
      // Rate limit between teams
      if (i < q.length - 1) await wait(4000 + Math.floor(Math.random() * 2000));
    }
  }

  // ── Free agents ──
  if (faOnly || (args.length === 0 && !txOnly && !newsOnly)) {
    console.log('');
    tot.fa = await scrapeFreeAgents(browser);
  }

  // ── Transactions ──
  if (txOnly || (args.length === 0 && !faOnly && !newsOnly)) {
    console.log('');
    tot.tx = await scrapeTransactions(browser);
  }

  // ── News ──
  if (newsOnly || (args.length === 0 && !faOnly && !txOnly)) {
    console.log('');
    tot.news = await scrapeNews(browser);
  }

  await browser.close();

  // ── Summary ──
  console.log('');
  console.log('  ═══════════════════════════════════════');
  var summary = '  DONE: ';
  if (q.length > 0) summary += tot.ok + '/' + q.length + ' teams | ' + tot.p + 'p ' + tot.c + 'c ' + tot.pk + 'pk';
  if (tot.fa) summary += ' | ' + tot.fa + ' FAs';
  if (tot.tx) summary += ' | ' + tot.tx + ' tx';
  if (tot.news) summary += ' | ' + tot.news + ' news';
  console.log(summary);
  console.log('  ═══════════════════════════════════════');
  console.log('');
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });