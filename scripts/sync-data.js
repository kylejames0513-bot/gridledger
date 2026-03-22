/**
 * GridLedger Data Sync Script
 * 
 * Phase 1: ESPN API — pulls real rosters (names, positions, numbers, ages, headshots)
 * Phase 2: Over The Cap — scrapes contract data (cap hit, dead cap, base salary)
 * 
 * Usage:
 *   node scripts/sync-data.js              (runs both phases)
 *   node scripts/sync-data.js --espn-only  (rosters only, no contract scraping)
 * 
 * Requirements:
 *   npm install puppeteer cheerio dotenv @supabase/supabase-js
 */

const SUPABASE_URL = 'https://vvfyueflpdjbphxolckn.supabase.co';
// REPLACE with your key or use dotenv:
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU';
console.log('KEY CHECK:', SUPABASE_KEY.substring(0, 30) + '... length:', SUPABASE_KEY.length);
const SALARY_CAP = 301.2; // 2026 actual cap

// ESPN team IDs map to our team IDs
const ESPN_TEAMS = [
  { espn: 22, id: 'ARI', slug: 'arizona-cardinals' },
  { espn: 1, id: 'ATL', slug: 'atlanta-falcons' },
  { espn: 33, id: 'BAL', slug: 'baltimore-ravens' },
  { espn: 2, id: 'BUF', slug: 'buffalo-bills' },
  { espn: 29, id: 'CAR', slug: 'carolina-panthers' },
  { espn: 3, id: 'CHI', slug: 'chicago-bears' },
  { espn: 4, id: 'CIN', slug: 'cincinnati-bengals' },
  { espn: 5, id: 'CLE', slug: 'cleveland-browns' },
  { espn: 6, id: 'DAL', slug: 'dallas-cowboys' },
  { espn: 7, id: 'DEN', slug: 'denver-broncos' },
  { espn: 8, id: 'DET', slug: 'detroit-lions' },
  { espn: 9, id: 'GB', slug: 'green-bay-packers' },
  { espn: 34, id: 'HOU', slug: 'houston-texans' },
  { espn: 11, id: 'IND', slug: 'indianapolis-colts' },
  { espn: 30, id: 'JAX', slug: 'jacksonville-jaguars' },
  { espn: 12, id: 'KC', slug: 'kansas-city-chiefs' },
  { espn: 24, id: 'LAC', slug: 'los-angeles-chargers' },
  { espn: 14, id: 'LAR', slug: 'los-angeles-rams' },
  { espn: 13, id: 'LV', slug: 'las-vegas-raiders' },
  { espn: 15, id: 'MIA', slug: 'miami-dolphins' },
  { espn: 16, id: 'MIN', slug: 'minnesota-vikings' },
  { espn: 17, id: 'NE', slug: 'new-england-patriots' },
  { espn: 18, id: 'NO', slug: 'new-orleans-saints' },
  { espn: 19, id: 'NYG', slug: 'new-york-giants' },
  { espn: 20, id: 'NYJ', slug: 'new-york-jets' },
  { espn: 21, id: 'PHI', slug: 'philadelphia-eagles' },
  { espn: 23, id: 'PIT', slug: 'pittsburgh-steelers' },
  { espn: 25, id: 'SEA', slug: 'seattle-seahawks' },
  { espn: 26, id: 'SF', slug: 'san-francisco-49ers' },
  { espn: 27, id: 'TB', slug: 'tampa-bay-buccaneers' },
  { espn: 10, id: 'TEN', slug: 'tennessee-titans' },
  { espn: 28, id: 'WAS', slug: 'washington-commanders' },
];

// Helper: Supabase REST API calls
async function supabasePost(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table}: ${res.status} ${text}`);
  }
}

async function supabaseDelete(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${table}: ${res.status} ${text}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════
// PHASE 1: ESPN ROSTERS
// ═══════════════════════════════════════════

async function fetchESPNRoster(espnId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnId}/roster`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN ${espnId}: ${res.status}`);
  return res.json();
}

function parseESPNRoster(data, teamId) {
  const players = [];
  const groups = data.athletes || [];

  groups.forEach(group => {
    const items = group.items || [];
    items.forEach(athlete => {
      players.push({
        team_id: teamId,
        name: athlete.displayName || athlete.fullName || 'Unknown',
        position: athlete.position?.abbreviation || 'UNK',
        number: athlete.jersey ? parseInt(athlete.jersey) : null,
        age: athlete.age || null,
        experience: athlete.experience?.years || 0,
        status: 'active',
        roster_status: 'active',
        headshot_url: athlete.headshot?.href || null,
        college: athlete.college?.name || null,
        draft_year: athlete.draft?.year || null,
        draft_round: athlete.draft?.round || null,
        draft_pick: athlete.draft?.selection || null,
      });
    });
  });

  return players;
}

async function syncESPNRosters() {
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  PHASE 1: ESPN Rosters');
  console.log('══════════════════════════════════════');
  console.log('');

  let totalPlayers = 0;
  let successTeams = 0;

  for (const team of ESPN_TEAMS) {
    try {
      process.stdout.write(`  ${team.id.padEnd(4)} `);

      const data = await fetchESPNRoster(team.espn);
      const players = parseESPNRoster(data, team.id);

      if (players.length === 0) {
        console.log('⚠ No players found');
        continue;
      }

      // Delete existing players for this team first
      try {
        await supabaseDelete('contracts', `team_id=eq.${team.id}`);
        await supabaseDelete('players', `team_id=eq.${team.id}`);
      } catch (e) { /* ignore if empty */ }

      // Insert players
      await supabasePost('players', players);

      totalPlayers += players.length;
      successTeams++;
      console.log(`✓ ${players.length} players`);

      // Be nice to ESPN
      await sleep(300);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log('');
  console.log(`  Done: ${successTeams}/32 teams, ${totalPlayers} total players`);
}

// ═══════════════════════════════════════════
// PHASE 2: OVER THE CAP CONTRACTS
// ═══════════════════════════════════════════

async function scrapeOTCContracts() {
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  PHASE 2: Over The Cap Contracts');
  console.log('══════════════════════════════════════');
  console.log('');

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.log('  ⚠ Puppeteer not installed. Run:');
    console.log('    npm install puppeteer');
    console.log('');
    console.log('  Skipping contract scraping.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let successTeams = 0;
  let totalContracts = 0;

  for (const team of ESPN_TEAMS) {
    try {
      process.stdout.write(`  ${team.id.padEnd(4)} `);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const url = `https://overthecap.com/salary-cap/${team.slug}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for the table to load
      await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});

      // Extract contract data from the page
      const contracts = await page.evaluate(() => {
        const rows = [];
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
          const trs = table.querySelectorAll('tbody tr');
          trs.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 6) {
              const name = cells[0]?.textContent?.trim();
              const pos = cells[1]?.textContent?.trim();

              // OTC format: Name, Pos, Base Salary, Signing Bonus, Roster Bonus, Dead Cap, Cap Hit
              // Parse money values
              const parseMoney = (text) => {
                if (!text) return 0;
                const clean = text.replace(/[^0-9.-]/g, '');
                return clean ? parseFloat(clean) / 1000000 : 0; // Convert to millions
              };

              if (name && name.length > 1 && pos && pos.length <= 4) {
                rows.push({
                  name: name,
                  position: pos,
                  base_salary: parseMoney(cells[2]?.textContent),
                  signing_bonus: parseMoney(cells[3]?.textContent),
                  roster_bonus: parseMoney(cells[4]?.textContent),
                  dead_cap: parseMoney(cells[cells.length - 2]?.textContent),
                  cap_hit: parseMoney(cells[cells.length - 1]?.textContent),
                });
              }
            }
          });
        });

        return rows;
      });

      await page.close();

      if (contracts.length === 0) {
        console.log('⚠ No contracts found (page may have changed)');
        continue;
      }

      // Match contracts to existing players in Supabase
      // Fetch existing players for this team
      const playersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/players?team_id=eq.${team.id}&select=id,name,position`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
          },
        }
      );
      const existingPlayers = await playersRes.json();

      let matched = 0;
      for (const contract of contracts) {
        // Fuzzy match by name
        const player = existingPlayers.find(p =>
          p.name.toLowerCase() === contract.name.toLowerCase() ||
          p.name.toLowerCase().includes(contract.name.toLowerCase()) ||
          contract.name.toLowerCase().includes(p.name.toLowerCase())
        );

        if (player) {
          try {
            await supabasePost('contracts', {
              player_id: player.id,
              team_id: team.id,
              base_salary: Math.round(contract.base_salary * 100) / 100,
              cap_hit: Math.round(contract.cap_hit * 100) / 100,
              dead_cap: Math.round(contract.dead_cap * 100) / 100,
              signing_bonus: Math.round(contract.signing_bonus * 100) / 100,
              roster_bonus: Math.round(contract.roster_bonus * 100) / 100,
              is_current: true,
            });
            matched++;
          } catch (e) { /* skip duplicates */ }
        }
      }

      totalContracts += matched;
      successTeams++;
      console.log(`✓ ${contracts.length} found, ${matched} matched`);

      await sleep(2000); // Be respectful to OTC
    } catch (err) {
      console.log(`✗ ${err.message.substring(0, 60)}`);
    }
  }

  await browser.close();

  console.log('');
  console.log(`  Done: ${successTeams}/32 teams, ${totalContracts} contracts matched`);
}

// ═══════════════════════════════════════════
// UPDATE TEAM CAP TOTALS
// ═══════════════════════════════════════════

async function updateTeamCaps() {
  console.log('');
  console.log('  Updating team cap totals...');

  // Update the cap total to the real 2026 number
  for (const team of ESPN_TEAMS) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/teams?id=eq.${team.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cap_total: SALARY_CAP }),
        }
      );
    } catch (e) { /* ignore */ }
  }

  console.log('  ✓ Cap set to $301.2M for all teams');
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('🏈 GridLedger Data Sync');
  console.log('─────────────────────────────────');

  if (SUPABASE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('');
    console.log('❌ Set your SUPABASE_SERVICE_ROLE_KEY first!');
    console.log('   Edit the top of this file or set the env var.');
    process.exit(1);
  }

  const espnOnly = process.argv.includes('--espn-only');

  // Phase 1: ESPN rosters (always)
  await syncESPNRosters();

  // Phase 2: OTC contracts (unless --espn-only)
  if (!espnOnly) {
    await scrapeOTCContracts();
  }

  // Update cap totals
  await updateTeamCaps();

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  ✅ Sync complete!');
  console.log('══════════════════════════════════════');
  console.log('');
  console.log('  Next: Check your Supabase Table Editor');
  console.log('  to verify players and contracts loaded.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
