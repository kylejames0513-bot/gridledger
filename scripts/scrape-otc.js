/**
 * ═══════════════════════════════════════════════════════════════
 * GRIDLEDGER — OVER THE CAP SCRAPER
 * ═══════════════════════════════════════════════════════════════
 *
 * Pure Cheerio. No Playwright. No headless browser. Runs anywhere.
 *
 * OTC serves all salary cap data as static HTML — every player,
 * every bonus, every dead money scenario, right in the page source.
 *
 * Data extracted per team:
 *   • Team summary (total cap, top 51, cap space, O/D/ST split)
 *   • Active roster with full contract breakdown:
 *     - Base salary, prorated bonus, roster bonus, workout, other
 *     - Guaranteed salary, cap number
 *     - Dead money + cap savings for: cut, post-June 1 cut,
 *       trade, post-June 1 trade, restructure, extension
 *   • Dead money charges (released/traded players)
 *
 * Usage:
 *   node scrape-otc.js                (all 32 teams)
 *   node scrape-otc.js DAL            (one team)
 *   node scrape-otc.js DAL PHI KC     (multiple teams)
 *   node scrape-otc.js SUMMARY        (cap space summary only — fast)
 *   node scrape-otc.js TX             (NFL.com transactions)
 *   node scrape-otc.js NEWS           (ESPN RSS news)
 *
 * Requires: npm install cheerio node-fetch@2
 * ═══════════════════════════════════════════════════════════════
 */

// ─── CREDENTIALS ──────────────────────────────────────────────
var SUPA_URL = 'https://vvfyueflpdjbphxolckn.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU';
// ──────────────────────────────────────────────────────────────

var CAP_2026 = 301.2;

var TEAMS = [
  { id: 'ARI', slug: 'arizona-cardinals', name: 'Cardinals', espn: 22 },
  { id: 'ATL', slug: 'atlanta-falcons', name: 'Falcons', espn: 1 },
  { id: 'BAL', slug: 'baltimore-ravens', name: 'Ravens', espn: 33 },
  { id: 'BUF', slug: 'buffalo-bills', name: 'Bills', espn: 2 },
  { id: 'CAR', slug: 'carolina-panthers', name: 'Panthers', espn: 29 },
  { id: 'CHI', slug: 'chicago-bears', name: 'Bears', espn: 3 },
  { id: 'CIN', slug: 'cincinnati-bengals', name: 'Bengals', espn: 4 },
  { id: 'CLE', slug: 'cleveland-browns', name: 'Browns', espn: 5 },
  { id: 'DAL', slug: 'dallas-cowboys', name: 'Cowboys', espn: 6 },
  { id: 'DEN', slug: 'denver-broncos', name: 'Broncos', espn: 7 },
  { id: 'DET', slug: 'detroit-lions', name: 'Lions', espn: 8 },
  { id: 'GB',  slug: 'green-bay-packers', name: 'Packers', espn: 9 },
  { id: 'HOU', slug: 'houston-texans', name: 'Texans', espn: 34 },
  { id: 'IND', slug: 'indianapolis-colts', name: 'Colts', espn: 11 },
  { id: 'JAX', slug: 'jacksonville-jaguars', name: 'Jaguars', espn: 30 },
  { id: 'KC',  slug: 'kansas-city-chiefs', name: 'Chiefs', espn: 12 },
  { id: 'LAC', slug: 'los-angeles-chargers', name: 'Chargers', espn: 24 },
  { id: 'LAR', slug: 'los-angeles-rams', name: 'Rams', espn: 14 },
  { id: 'LV',  slug: 'las-vegas-raiders', name: 'Raiders', espn: 13 },
  { id: 'MIA', slug: 'miami-dolphins', name: 'Dolphins', espn: 15 },
  { id: 'MIN', slug: 'minnesota-vikings', name: 'Vikings', espn: 16 },
  { id: 'NE',  slug: 'new-england-patriots', name: 'Patriots', espn: 17 },
  { id: 'NO',  slug: 'new-orleans-saints', name: 'Saints', espn: 18 },
  { id: 'NYG', slug: 'new-york-giants', name: 'Giants', espn: 19 },
  { id: 'NYJ', slug: 'new-york-jets', name: 'Jets', espn: 20 },
  { id: 'PHI', slug: 'philadelphia-eagles', name: 'Eagles', espn: 21 },
  { id: 'PIT', slug: 'pittsburgh-steelers', name: 'Steelers', espn: 23 },
  { id: 'SEA', slug: 'seattle-seahawks', name: 'Seahawks', espn: 26 },
  { id: 'SF',  slug: 'san-francisco-49ers', name: '49ers', espn: 25 },
  { id: 'TB',  slug: 'tampa-bay-buccaneers', name: 'Buccaneers', espn: 27 },
  { id: 'TEN', slug: 'tennessee-titans', name: 'Titans', espn: 10 },
  { id: 'WAS', slug: 'washington-commanders', name: 'Commanders', espn: 28 },
];

// Map OTC sidebar names to team IDs
var NAME_TO_ID = {};
TEAMS.forEach(function(t) {
  NAME_TO_ID[t.name.toLowerCase()] = t.id;
  NAME_TO_ID[t.slug.replace(/-/g, ' ')] = t.id;
});

var fetch = require('node-fetch');
var cheerio = require('cheerio');

function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// ─── Dollar parser ────────────────────────────────────────────
function parseDollar(text) {
  if (!text) return 0;
  text = text.trim();
  if (text === '-' || text === '' || text === '$-' || text === '$0' || text === 'Void') return 0;
  var isNeg = text.indexOf('(') >= 0 || (text.startsWith('-') && text.includes('$'));
  var clean = text.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  var val = parseFloat(clean);
  return isNeg ? -val : val;
}

// Convert raw dollars to millions
function toM(raw) {
  if (!raw || raw === 0) return 0;
  var sign = raw < 0 ? -1 : 1;
  var n = Math.abs(raw);
  if (n > 50000) return Math.round((n / 1000000) * 100) / 100 * sign;
  return Math.round(raw * 100) / 100;
}

// ─── HTTP fetch with retries ──────────────────────────────────
async function fetchPage(url, retries) {
  retries = retries || 3;
  for (var i = 0; i < retries; i++) {
    try {
      var res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch(e) {
      if (i === retries - 1) throw e;
      await wait(2000 * (i + 1));
    }
  }
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
    if (res.status === 409 && Array.isArray(body)) {
      var ok = [];
      for (var i = 0; i < body.length; i++) {
        try { var r2 = await api(path, method, [body[i]]); if (r2 && r2.length) ok.push(r2[0]); } catch(e) {}
      }
      return ok;
    }
    return null;
  }
  try { return JSON.parse(text); } catch(e) { return null; }
}


// ═══════════════════════════════════════════════════════════════
// STEP 1: SCRAPE SUMMARY PAGE (all 32 teams, one request)
// ═══════════════════════════════════════════════════════════════

async function scrapeSummary() {
  console.log('  Fetching OTC cap space summary...');
  var html = await fetchPage('https://overthecap.com/salary-cap-space');
  var $ = cheerio.load(html);

  var teams = [];

  // The first table on the page is the 2026 data
  $('table').first().find('tbody tr').each(function() {
    var cells = $(this).find('td');
    if (cells.length < 5) return;

    // Column 0 has the team name as a link
    var teamLink = $(cells[0]).find('a');
    var teamName = teamLink.text().trim();
    if (!teamName) return;

    // Match to our team ID
    var teamId = null;
    TEAMS.forEach(function(t) {
      if (teamName.toLowerCase().includes(t.name.toLowerCase()) ||
          teamName.toLowerCase().includes(t.slug.split('-').pop())) {
        teamId = t.id;
      }
    });
    if (!teamId) {
      // Try matching by slug in the href
      var href = teamLink.attr('href') || '';
      TEAMS.forEach(function(t) {
        if (href.includes(t.slug)) teamId = t.id;
      });
    }
    if (!teamId) return;

    teams.push({
      id: teamId,
      cap_space: parseDollar($(cells[1]).text()),
      effective_cap_space: parseDollar($(cells[2]).text()),
      roster_count: parseInt($(cells[3]).text().trim()) || 0,
      active_cap: parseDollar($(cells[4]).text()),
      dead_money: parseDollar($(cells[5]).text()),
    });
  });

  console.log('    Found ' + teams.length + ' teams');
  return teams;
}

async function syncSummary(teams) {
  var updated = 0;
  for (var i = 0; i < teams.length; i++) {
    var t = teams[i];
    var capUsed = toM(t.active_cap + t.dead_money);
    var adjustedCap = toM(t.active_cap + t.dead_money + t.cap_space);

    var res = await fetch(SUPA_URL + '/rest/v1/teams?id=eq.' + t.id, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        cap_total: adjustedCap > 200 ? adjustedCap : CAP_2026,
        cap_used: capUsed,
        cap_space: toM(t.cap_space),
        dead_money: toM(t.dead_money),
      }),
    });
    if (res.ok) updated++;
  }
  console.log('    Updated ' + updated + '/32 team cap numbers');
  return updated;
}


// ═══════════════════════════════════════════════════════════════
// STEP 2: SCRAPE INDIVIDUAL TEAM PAGE
// ═══════════════════════════════════════════════════════════════

async function scrapeTeam(team) {
  var url = 'https://overthecap.com/salary-cap/' + team.slug;
  var html = await fetchPage(url);
  var $ = cheerio.load(html);

  // Get the 2026 container
  var y2026 = $('#y2026');
  if (!y2026.length) {
    // Fallback: try first salary-cap-container
    y2026 = $('.salary-cap-container').first();
  }

  // ─── Team summary ───
  var totalCapText = y2026.find('.total-cap-number span').first().text();
  var totalCap = parseDollar(totalCapText.replace(/.*:\s*/, ''));

  var summaryLis = y2026.find('.total-cap-number li');
  var top51 = parseDollar(summaryLis.eq(0).text().replace(/.*:\s*/, ''));
  var capSpace = parseDollar(summaryLis.eq(1).text().replace(/.*:\s*/, ''));

  var posLis = y2026.find('.positional-cap-number li span');
  var offense = parseDollar((posLis.eq(0).text() || '').replace(/.*:\s*/, ''));
  var defense = parseDollar((posLis.eq(1).text() || '').replace(/.*:\s*/, ''));
  var special = parseDollar((posLis.eq(2).text() || '').replace(/.*:\s*/, ''));

  var summary = {
    totalCap: totalCap,
    top51: top51,
    capSpace: capSpace,
    offense: offense,
    defense: defense,
    special: special,
  };

  // ─── Active roster players ───
  var activePlayers = [];
  var activeTable = y2026.find('table.contracted-players').first();

  activeTable.find('tbody tr').each(function() {
    var row = $(this);

    // Skip "Top 51 Cutoff" rows and total rows
    if (row.find('td[colspan]').length) return;

    var playerLink = row.find('td.player-information a');
    if (!playerLink.length) return;

    var name = playerLink.text().trim();
    if (!name || name.length < 2) return;

    // Extract OTC player URL for linking
    var playerHref = playerLink.attr('href') || '';

    var cells = row.find('td');
    // OTC column layout (confirmed from HTML):
    // [0] player name
    // [1] base salary
    // [2] prorated signing bonus
    // [3] prorated option bonus
    // [4] roster regular bonus
    // [5] roster per game bonus
    // [6] workout bonus
    // [7] other bonus
    // [8] spacer
    // [9] guaranteed salary
    // [10] spacer
    // [11] cap number
    // [12] spacer
    // [13] dead money (with div.cut, div.june_1_cut, etc.)
    // [14] cap savings (with div.cut, div.june_1_cut, etc.)

    var baseSalary = parseDollar($(cells[1]).text());
    var proratedSigning = parseDollar($(cells[2]).text());
    var proratedOption = parseDollar($(cells[3]).text());
    var rosterRegular = parseDollar($(cells[4]).text());
    var rosterPerGame = parseDollar($(cells[5]).text());
    var workoutBonus = parseDollar($(cells[6]).text());
    var otherBonus = parseDollar($(cells[7]).text());
    var guaranteedSalary = parseDollar($(cells[9]).text());
    var capNumber = parseDollar($(cells[11]).text());

    // Dead money & cap savings for each transaction type
    var deadMoneyCell = $(cells[13]);
    var capSavingsCell = $(cells[14]);

    var deadMoney = {
      cut: parseDollar(deadMoneyCell.find('.cut').text()),
      june1Cut: parseDollar(deadMoneyCell.find('.june_1_cut').text()),
      trade: parseDollar(deadMoneyCell.find('.trade').text()),
      june1Trade: parseDollar(deadMoneyCell.find('.june_1_trade').text()),
      restructure: parseDollar(deadMoneyCell.find('.restructure').text()),
      extension: parseDollar(deadMoneyCell.find('.extension').text()),
    };

    var capSavings = {
      cut: parseDollar(capSavingsCell.find('.cut').text()),
      june1Cut: parseDollar(capSavingsCell.find('.june_1_cut').text()),
      trade: parseDollar(capSavingsCell.find('.trade').text()),
      june1Trade: parseDollar(capSavingsCell.find('.june_1_trade').text()),
      restructure: parseDollar(capSavingsCell.find('.restructure').text()),
      extension: parseDollar(capSavingsCell.find('.extension').text()),
    };

    activePlayers.push({
      name: name,
      href: playerHref,
      section: 'active',
      baseSalary: baseSalary,
      proratedBonus: proratedSigning + proratedOption,
      signingBonus: proratedSigning,
      rosterBonus: rosterRegular + rosterPerGame,
      workoutBonus: workoutBonus,
      otherBonus: otherBonus,
      guaranteedSalary: guaranteedSalary,
      capHit: capNumber,
      deadMoney: deadMoney,
      capSavings: capSavings,
    });
  });

  // ─── Dead money players ───
  var deadPlayers = [];
  y2026.find('table.non-active').each(function() {
    $(this).find('tbody tr').each(function() {
      var cells = $(this).find('td');
      var firstText = $(cells[0]).text().trim();

      // Skip TOTAL row
      if (firstText.toUpperCase().includes('TOTAL')) return;

      var playerLink = $(this).find('td.player-information a');
      if (!playerLink.length) return;

      var name = playerLink.text().trim();
      var capNum = parseDollar($(cells[1]).text());

      if (name && name.length > 1 && capNum !== 0) {
        deadPlayers.push({
          name: name,
          href: playerLink.attr('href') || '',
          section: 'dead',
          capHit: capNum,
          baseSalary: 0,
          signingBonus: 0,
          rosterBonus: 0,
          workoutBonus: 0,
          guaranteedSalary: 0,
          proratedBonus: 0,
          otherBonus: 0,
          deadMoney: { cut: capNum, june1Cut: capNum, trade: capNum, june1Trade: capNum, restructure: 0, extension: 0 },
          capSavings: { cut: 0, june1Cut: 0, trade: 0, june1Trade: 0, restructure: 0, extension: 0 },
        });
      }
    });
  });

  return {
    summary: summary,
    active: activePlayers,
    dead: deadPlayers,
  };
}


// ═══════════════════════════════════════════════════════════════
// STEP 2b: SCRAPE CONTRACTS PAGE (positions + contract details)
// ═══════════════════════════════════════════════════════════════

async function scrapeContracts(team) {
  var url = 'https://overthecap.com/contracts/' + team.slug;
  var html = await fetchPage(url);
  var $ = cheerio.load(html);

  // OTC contracts table columns:
  // [0] Player  [1] Pos  [2] Team  [3] Total Value  [4] APY
  // [5] Total Guaranteed  [6] Avg Guarantee/Year  [7] % Guaranteed
  var contracts = {};

  $('table tbody tr').each(function() {
    var cells = $(this).find('td');
    if (cells.length < 6) return;

    // Player name
    var playerLink = $(cells[0]).find('a');
    var name = playerLink.length ? playerLink.text().trim() : $(cells[0]).text().trim();
    if (!name || name.length < 2) return;

    // Position
    var pos = $(cells[1]).text().trim();
    if (pos.length > 5) pos = '';

    // Money columns
    var totalValue = parseDollar($(cells[3]).text());
    var apy = parseDollar($(cells[4]).text());
    var guaranteed = parseDollar($(cells[5]).text());

    if (name && pos) {
      contracts[name.toLowerCase()] = {
        position: pos,
        totalValue: totalValue,
        apy: apy,
        guaranteed: guaranteed,
      };
    }
  });

  return contracts;
}


// ═══════════════════════════════════════════════════════════════
// STEP 3: SYNC TEAM DATA TO SUPABASE
// ═══════════════════════════════════════════════════════════════

async function syncTeam(team, data, contracts) {
  var allPlayers = data.active.concat(data.dead);
  if (allPlayers.length === 0) return { p: 0, c: 0 };

  // ─── Clear old data ───
  await del('contracts?team_id=eq.' + team.id);
  await del('players?team_id=eq.' + team.id);

  // ─── Insert players (with positions from contracts page) ───
  var playerRows = allPlayers.map(function(p) {
    // Look up position from contracts page
    var cd = contracts[p.name.toLowerCase()] || {};
    var pos = cd.position || 'UNK';

    return {
      team_id: team.id,
      name: p.name,
      position: pos,
      age: null,
      status: p.section === 'dead' ? 'free_agent' : 'active',
      roster_status: p.section === 'dead' ? 'dead' : 'active',
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

  // ─── Read back IDs ───
  var dbp = await api('players?team_id=eq.' + team.id + '&select=id,name&order=name', 'GET');
  if (!dbp || !dbp.length) return { p: ic, c: 0 };

  // ─── Insert contracts ───
  var cc = 0;
  for (var k = 0; k < allPlayers.length; k++) {
    var p = allPlayers[k];
    var match = dbp.find(function(x) { return x.name.toLowerCase() === p.name.toLowerCase(); });
    if (!match) continue;

    // Merge contract details from contracts page
    var cd = contracts[p.name.toLowerCase()] || {};

    // Estimate FA year from total value / APY
    var yearExpires = null;
    if (cd.totalValue > 0 && cd.apy > 0) {
      var totalYears = Math.round(cd.totalValue / cd.apy);
      // Cap page shows 2026 data, so remaining years = totalYears (rough estimate)
      // Most contracts we see are still active, so FA year ≈ 2026 + remaining - 1
      if (totalYears >= 1 && totalYears <= 10) {
        yearExpires = 2025 + totalYears;  // e.g. 4yr deal → FA in 2029
      }
    }

    var cr = await api('contracts', 'POST', [{
      player_id: match.id,
      team_id: team.id,
      base_salary: toM(p.baseSalary),
      cap_hit: toM(p.capHit),
      dead_cap: toM(p.deadMoney.cut),           // Dead money if cut pre-June 1
      signing_bonus: toM(p.signingBonus),
      roster_bonus: toM(p.rosterBonus),
      guaranteed: toM(cd.guaranteed || p.guaranteedSalary),
      total_value: toM(cd.totalValue || 0),
      cash_total: toM(cd.apy || 0),              // Store APY in cash_total field
      years: 1,
      year_expires: yearExpires,
      is_current: true,
    }]);
    if (cr && cr.length) cc++;
  }

  // ─── Update team record ───
  var sum = data.summary;
  var space = toM(sum.capSpace);
  var activeCapM = data.active.reduce(function(s, p) { return s + toM(p.capHit); }, 0);
  var deadCapM = data.dead.reduce(function(s, p) { return s + toM(p.capHit); }, 0);
  var capUsedM = Math.round((activeCapM + deadCapM) * 100) / 100;

  // Adjusted cap = spending + space (this includes rollover, just like OTC shows)
  var adjustedCap = Math.round((capUsedM + space) * 100) / 100;

  await fetch(SUPA_URL + '/rest/v1/teams?id=eq.' + team.id, {
    method: 'PATCH',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      cap_total: adjustedCap > 200 ? adjustedCap : CAP_2026,
      cap_used: capUsedM,
      cap_space: space,
      dead_money: Math.round(deadCapM * 100) / 100,
    }),
  });

  return { p: ic, c: cc };
}


// ═══════════════════════════════════════════════════════════════
// ESPN AGE SYNC — JSON API, no scraping
// ═══════════════════════════════════════════════════════════════

async function syncAges(team) {
  var url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/' + team.espn + '/roster';
  try {
    var res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
    if (!res.ok) return 0;
    var json = await res.json();

    // Normalize name: strip suffixes, periods, commas, extra spaces
    function norm(n) {
      return n.toLowerCase()
        .replace(/,/g, '')                             // "Runyan, Jr." → "Runyan Jr."
        .replace(/\s+(jr|sr|ii|iii|iv|v|2nd|3rd)\.?$/i, '')  // Strip suffixes
        .replace(/\./g, '')                            // T.J. → TJ
        .replace(/'/g, "'")                            // Smart quotes
        .replace(/-/g, ' ')                            // Hyphenated names
        .replace(/\s+/g, ' ')                          // Collapse spaces
        .trim();
    }

    // Build name→age map from ESPN (store original, normalized, AND short version)
    var ageMap = {};
    var ageMapNorm = {};
    var ageMapShort = {};  // first + last only (no middle names)
    (json.athletes || []).forEach(function(group) {
      (group.items || []).forEach(function(athlete) {
        if (athlete.fullName && athlete.age) {
          var full = athlete.fullName;
          ageMap[full.toLowerCase()] = athlete.age;
          ageMapNorm[norm(full)] = athlete.age;
          // Also store just first + last (skip middle names)
          var parts = norm(full).split(' ');
          if (parts.length >= 2) {
            ageMapShort[parts[0] + ' ' + parts[parts.length - 1]] = athlete.age;
          }
        }
      });
    });

    // Get current players from Supabase
    var dbp = await api('players?team_id=eq.' + team.id + '&select=id,name', 'GET');
    if (!dbp || !dbp.length) return 0;

    // Patch ages
    var updated = 0;
    for (var i = 0; i < dbp.length; i++) {
      var name = dbp[i].name;
      // Try exact match first, then normalized, then first+last only
      var age = ageMap[name.toLowerCase()]
        || ageMapNorm[norm(name)]
        || ageMapShort[norm(name)]
        || null;

      // Last resort: match by last name + first initial
      if (!age) {
        // Also try first+last from DB name
        var dbParts = norm(name).split(' ');
        if (dbParts.length >= 2) {
          var shortKey = dbParts[0] + ' ' + dbParts[dbParts.length - 1];
          age = ageMapShort[shortKey] || null;
        }
      }

      // Last resort: match by last name + first initial
      if (!age) {
        var dbParts = norm(name).split(' ');
        if (dbParts.length >= 2) {
          var firstInit = dbParts[0][0];
          var lastName = dbParts[dbParts.length - 1];
          var keys = Object.keys(ageMapNorm);
          for (var k = 0; k < keys.length; k++) {
            var eParts = keys[k].split(' ');
            if (eParts.length >= 2) {
              var eFirst = eParts[0][0];
              var eLast = eParts[eParts.length - 1];
              if (eFirst === firstInit && eLast === lastName) {
                age = ageMapNorm[keys[k]];
                break;
              }
            }
          }
        }
      }

      // Final fallback: last name only (if exactly one ESPN player shares that last name)
      if (!age) {
        var dbParts2 = norm(name).split(' ');
        var dbLast = dbParts2[dbParts2.length - 1];
        var lastNameMatches = [];
        var allNormKeys = Object.keys(ageMapNorm);
        for (var m = 0; m < allNormKeys.length; m++) {
          var mParts = allNormKeys[m].split(' ');
          if (mParts[mParts.length - 1] === dbLast) {
            lastNameMatches.push(ageMapNorm[allNormKeys[m]]);
          }
        }
        // Only use if exactly one player with that last name (avoids wrong matches)
        if (lastNameMatches.length === 1) {
          age = lastNameMatches[0];
        }
      }

      if (!age) continue;

      await fetch(SUPA_URL + '/rest/v1/players?id=eq.' + dbp[i].id, {
        method: 'PATCH',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': 'Bearer ' + SUPA_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ age: age }),
      });
      updated++;
    }
    return updated;
  } catch(e) {
    return 0;
  }
}


// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS (NFL.com) — same as before, no Playwright
// ═══════════════════════════════════════════════════════════════

async function scrapeTransactions() {
  console.log('  Scraping NFL.com transactions...');
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;

  var types = ['trades', 'signings', 'reserve-list', 'waivers', 'terminations', 'other'];
  var allTx = [];

  for (var t = 0; t < types.length; t++) {
    try {
      var url = 'https://www.nfl.com/transactions/league/' + types[t] + '/' + year + '/' + month;
      var html = await fetchPage(url);
      var $ = cheerio.load(html);

      $('tbody tr').each(function() {
        var cells = $(this).find('td');
        if (cells.length < 3) return;
        var date = $(cells[0]).text().trim();
        var teamText = $(cells[1]).text().trim().substring(0, 50);
        var detail = [];
        cells.each(function(idx) { if (idx >= 2) detail.push($(this).text().trim()); });
        var detailStr = detail.join(' ').substring(0, 300);
        if (detailStr.length > 5) {
          allTx.push({ date: date, team: teamText, detail: detailStr, type: types[t] });
        }
      });
    } catch(e) {
      console.log('    ' + types[t] + ' failed: ' + e.message);
    }
    await wait(1000);
  }

  console.log('    Found ' + allTx.length + ' transactions');
  if (!allTx.length) return 0;

  var today = year + '-' + String(month).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  var typeMap = { trades: 'trade', signings: 'signing', 'reserve-list': 'reserve',
    waivers: 'waiver', terminations: 'release', other: 'other' };

  var ic = 0;
  for (var i = 0; i < allTx.length; i++) {
    var item = allTx[i];
    var txDate = today;
    try {
      if (item.date) {
        var named = item.date.match(/([A-Za-z]+)\.?\s+(\d{1,2})/i);
        if (named) {
          var mkey = named[1].toLowerCase().substring(0, 3);
          txDate = year + '-' + (months[mkey] || '01') + '-' + String(parseInt(named[2])).padStart(2, '0');
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate)) txDate = today;
    } catch(e) { txDate = today; }

    var r = await api('transactions', 'POST', [{
      player_name: item.detail.substring(0, 100),
      type: typeMap[item.type] || 'other',
      details: item.detail,
      transaction_date: txDate,
      source_url: 'https://www.nfl.com/transactions',
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

async function scrapeNews() {
  console.log('  Scraping ESPN NFL news...');
  try {
    var html = await fetchPage('https://www.espn.com/espn/rss/nfl/news');
    var $ = cheerio.load(html, { xmlMode: true });
    var items = [];

    $('item').each(function() {
      var titleRaw = $(this).find('title').text().trim();
      var linkRaw = $(this).find('link').text().trim();
      var descRaw = $(this).find('description').text().trim();
      var pubDate = $(this).find('pubDate').text().trim();

      // Handle CDATA wrapped content
      var title = titleRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      var link = linkRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      var desc = descRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')  // Strip HTML tags from description
        .trim()
        .substring(0, 300);

      // Categorize from keywords in title
      var titleLower = (title + ' ' + desc).toLowerCase();
      var type = 'news';
      if (/trade[sd]?|traded|deal|swap|acquir/i.test(titleLower)) type = 'trade';
      else if (/sign[sed]?|agree|contract|deal|free.?agent|ink/i.test(titleLower)) type = 'signing';
      else if (/cut|release[sd]?|waive[sd]?|terminat|designat/i.test(titleLower)) type = 'cut';
      else if (/restructur|extend|extension|rework/i.test(titleLower)) type = 'restructure';
      else if (/injur|ir |reserve|out for|miss/i.test(titleLower)) type = 'injury';
      else if (/draft|pick|select|combine|mock/i.test(titleLower)) type = 'draft';

      if (title.length > 5) {
        items.push({ title: title, link: link, desc: desc, date: pubDate, type: type });
      }
    });

    // If ESPN RSS returned nothing, try NFL.com RSS as fallback
    if (items.length === 0) {
      console.log('    ESPN RSS empty, trying NFL.com...');
      try {
        var nflHtml = await fetchPage('https://www.nfl.com/feeds-rs/headlines.rss');
        var $n = cheerio.load(nflHtml, { xmlMode: true });
        $n('item').each(function() {
          var title = $n(this).find('title').text().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
          var link = $n(this).find('link').text().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
          var desc = $n(this).find('description').text().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim().substring(0, 300);
          var pubDate = $n(this).find('pubDate').text().trim();
          var titleLower = title.toLowerCase();
          var type = 'news';
          if (/trade/i.test(titleLower)) type = 'trade';
          else if (/sign|free.?agent|contract/i.test(titleLower)) type = 'signing';
          else if (/cut|release|waive/i.test(titleLower)) type = 'cut';
          if (title.length > 5) items.push({ title: title, link: link, desc: desc, date: pubDate, type: type });
        });
      } catch(e2) { console.log('    NFL.com RSS also failed'); }
    }

    console.log('    Found ' + items.length + ' articles');
    if (!items.length) return 0;

    var ic = 0;
    for (var i = 0; i < Math.min(items.length, 30); i++) {
      var r = await api('news', 'POST', [{
        headline: items[i].title,
        body: items[i].desc || items[i].title,
        source: 'ESPN',
        source_url: items[i].link,
        category: items[i].type || 'other',
        published_at: items[i].date ? new Date(items[i].date).toISOString() : new Date().toISOString(),
      }]);
      if (r && r.length) ic++;
    }
    console.log('    Inserted ' + ic + ' news articles');
    return ic;
  } catch(e) {
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
  console.log('  ║  GRIDLEDGER — OTC SCRAPER             ║');
  console.log('  ║  Cheerio only. No Playwright.         ║');
  console.log('  ║  Source: OverTheCap.com               ║');
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
  var summaryOnly = args.indexOf('SUMMARY') >= 0;
  var txOnly = args.indexOf('TX') >= 0;
  var newsOnly = args.indexOf('NEWS') >= 0;
  args = args.filter(function(a) { return a !== 'SUMMARY' && a !== 'TX' && a !== 'NEWS'; });

  var tot = { teams: 0, players: 0, contracts: 0, tx: 0, news: 0 };

  // ── SUMMARY: Quick cap space update for all 32 teams ──
  if (summaryOnly || (!txOnly && !newsOnly && args.length === 0)) {
    console.log('');
    var summaryData = await scrapeSummary();
    tot.teams = await syncSummary(summaryData);
  }

  // ── TEAM ROSTERS: Full player-level scrape ──
  if (!summaryOnly && !txOnly && !newsOnly) {
    var queue = args.length > 0
      ? TEAMS.filter(function(t) { return args.indexOf(t.id) >= 0; })
      : TEAMS;

    if (queue.length > 0) {
      console.log('');
      console.log('  Scraping ' + queue.length + ' team roster(s)...');
      console.log('');

      for (var i = 0; i < queue.length; i++) {
        var team = queue[i];
        process.stdout.write('  [' + (i + 1) + '/' + queue.length + '] ' + team.id.padEnd(4) + ' ');

        try {
          var data = await scrapeTeam(team);

          // Also fetch contracts page for positions + contract details
          var contracts = {};
          try {
            contracts = await scrapeContracts(team);
          } catch(e2) {
            // Contracts page is optional — positions will be UNK if it fails
          }

          var posCount = Object.keys(contracts).length;
          var countStr = (data.active.length + data.dead.length) + 'p(' +
            data.active.length + 'A/' + data.dead.length + 'D) ' +
            posCount + 'pos';
          process.stdout.write(countStr + ' ');

          var result = await syncTeam(team, data, contracts);
          tot.players += result.p;
          tot.contracts += result.c;

          // Sync ages from ESPN
          var ages = await syncAges(team);

          console.log('-> ' + result.p + 'p ' + result.c + 'c ' + ages + 'ages | space=$' +
            toM(data.summary.capSpace) + 'M');
        } catch(e) {
          console.log('FAIL: ' + e.message);
        }

        // Rate limit: 3-4 seconds between teams (2 pages per team now)
        if (i < queue.length - 1) await wait(3000 + Math.floor(Math.random() * 1500));
      }
    }
  }

  // ── TRANSACTIONS ──
  if (txOnly || (!summaryOnly && !newsOnly && args.length === 0)) {
    console.log('');
    tot.tx = await scrapeTransactions();
  }

  // ── NEWS ──
  if (newsOnly || (!summaryOnly && !txOnly && args.length === 0)) {
    console.log('');
    tot.news = await scrapeNews();
  }

  // ── Summary ──
  console.log('');
  console.log('  ═══════════════════════════════════════');
  var summary = '  DONE:';
  if (tot.teams) summary += ' ' + tot.teams + ' teams updated';
  if (tot.players) summary += ' | ' + tot.players + 'p ' + tot.contracts + 'c';
  if (tot.tx) summary += ' | ' + tot.tx + ' tx';
  if (tot.news) summary += ' | ' + tot.news + ' news';
  console.log(summary);
  console.log('  ═══════════════════════════════════════');
  console.log('');
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });