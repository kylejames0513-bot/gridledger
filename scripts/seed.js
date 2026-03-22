require('dotenv').config({ path: '.env.local' });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function query(table, data, method) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: method || 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status + ': ' + text);
  }
  return true;
}

const NFL_TEAMS = [
  { id: 'ARI', name: 'Cardinals', city: 'Arizona', conference: 'NFC', division: 'West', color: '#97233F', accent: '#000000' },
  { id: 'ATL', name: 'Falcons', city: 'Atlanta', conference: 'NFC', division: 'South', color: '#A71930', accent: '#000000' },
  { id: 'BAL', name: 'Ravens', city: 'Baltimore', conference: 'AFC', division: 'North', color: '#241773', accent: '#9E7C0C' },
  { id: 'BUF', name: 'Bills', city: 'Buffalo', conference: 'AFC', division: 'East', color: '#00338D', accent: '#C60C30' },
  { id: 'CAR', name: 'Panthers', city: 'Carolina', conference: 'NFC', division: 'South', color: '#0085CA', accent: '#101820' },
  { id: 'CHI', name: 'Bears', city: 'Chicago', conference: 'NFC', division: 'North', color: '#0B162A', accent: '#C83803' },
  { id: 'CIN', name: 'Bengals', city: 'Cincinnati', conference: 'AFC', division: 'North', color: '#FB4F14', accent: '#000000' },
  { id: 'CLE', name: 'Browns', city: 'Cleveland', conference: 'AFC', division: 'North', color: '#311D00', accent: '#FF3C00' },
  { id: 'DAL', name: 'Cowboys', city: 'Dallas', conference: 'NFC', division: 'East', color: '#003594', accent: '#869397' },
  { id: 'DEN', name: 'Broncos', city: 'Denver', conference: 'AFC', division: 'West', color: '#FB4F14', accent: '#002244' },
  { id: 'DET', name: 'Lions', city: 'Detroit', conference: 'NFC', division: 'North', color: '#0076B6', accent: '#B0B7BC' },
  { id: 'GB', name: 'Packers', city: 'Green Bay', conference: 'NFC', division: 'North', color: '#203731', accent: '#FFB612' },
  { id: 'HOU', name: 'Texans', city: 'Houston', conference: 'AFC', division: 'South', color: '#03202F', accent: '#A71930' },
  { id: 'IND', name: 'Colts', city: 'Indianapolis', conference: 'AFC', division: 'South', color: '#002C5F', accent: '#A2AAAD' },
  { id: 'JAX', name: 'Jaguars', city: 'Jacksonville', conference: 'AFC', division: 'South', color: '#006778', accent: '#D7A22A' },
  { id: 'KC', name: 'Chiefs', city: 'Kansas City', conference: 'AFC', division: 'West', color: '#E31837', accent: '#FFB81C' },
  { id: 'LAC', name: 'Chargers', city: 'Los Angeles', conference: 'AFC', division: 'West', color: '#0080C6', accent: '#FFC20E' },
  { id: 'LAR', name: 'Rams', city: 'Los Angeles', conference: 'NFC', division: 'West', color: '#003594', accent: '#FFA300' },
  { id: 'LV', name: 'Raiders', city: 'Las Vegas', conference: 'AFC', division: 'West', color: '#000000', accent: '#A5ACAF' },
  { id: 'MIA', name: 'Dolphins', city: 'Miami', conference: 'AFC', division: 'East', color: '#008E97', accent: '#FC4C02' },
  { id: 'MIN', name: 'Vikings', city: 'Minnesota', conference: 'NFC', division: 'North', color: '#4F2683', accent: '#FFC62F' },
  { id: 'NE', name: 'Patriots', city: 'New England', conference: 'AFC', division: 'East', color: '#002244', accent: '#C60C30' },
  { id: 'NO', name: 'Saints', city: 'New Orleans', conference: 'NFC', division: 'South', color: '#D3BC8D', accent: '#101820' },
  { id: 'NYG', name: 'Giants', city: 'NY Giants', conference: 'NFC', division: 'East', color: '#0B2265', accent: '#A71930' },
  { id: 'NYJ', name: 'Jets', city: 'NY Jets', conference: 'AFC', division: 'East', color: '#125740', accent: '#000000' },
  { id: 'PHI', name: 'Eagles', city: 'Philadelphia', conference: 'NFC', division: 'East', color: '#004C54', accent: '#A5ACAF' },
  { id: 'PIT', name: 'Steelers', city: 'Pittsburgh', conference: 'AFC', division: 'North', color: '#FFB612', accent: '#101820' },
  { id: 'SEA', name: 'Seahawks', city: 'Seattle', conference: 'NFC', division: 'West', color: '#002244', accent: '#69BE28' },
  { id: 'SF', name: '49ers', city: 'San Francisco', conference: 'NFC', division: 'West', color: '#AA0000', accent: '#B3995D' },
  { id: 'TB', name: 'Buccaneers', city: 'Tampa Bay', conference: 'NFC', division: 'South', color: '#D50A0A', accent: '#34302B' },
  { id: 'TEN', name: 'Titans', city: 'Tennessee', conference: 'AFC', division: 'South', color: '#0C2340', accent: '#4B92DB' },
  { id: 'WAS', name: 'Commanders', city: 'Washington', conference: 'NFC', division: 'East', color: '#5A1414', accent: '#FFB612' },
];

const TRANSACTIONS = [
  { player_name: 'Jermaine Johnson II', from_team_id: 'NYJ', to_team_id: 'TEN', type: 'trade', subtype: null, transaction_date: '2026-03-11' },
  { player_name: 'DJ Moore', from_team_id: 'CHI', to_team_id: 'BUF', type: 'trade', subtype: null, transaction_date: '2026-03-11' },
  { player_name: 'Rashan Gary', from_team_id: 'GB', to_team_id: 'DAL', type: 'trade', subtype: null, transaction_date: '2026-03-11' },
  { player_name: 'Trent McDuffie', from_team_id: 'KC', to_team_id: 'LAR', type: 'trade', subtype: null, transaction_date: '2026-03-11' },
  { player_name: 'Kyler Murray', from_team_id: null, to_team_id: 'MIN', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13' },
  { player_name: 'Isiah Pacheco', from_team_id: 'KC', to_team_id: 'DET', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13' },
  { player_name: 'Tua Tagovailoa', from_team_id: 'MIA', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-12' },
  { player_name: 'Stefon Diggs', from_team_id: 'NE', to_team_id: null, type: 'cut', subtype: null, transaction_date: '2026-03-11' },
  { player_name: 'Kirk Cousins', from_team_id: 'ATL', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-11' },
];

const NEWS = [
  { headline: 'Cowboys land Rashan Gary in blockbuster trade with Packers', category: 'trade', is_breaking: true },
  { headline: 'Vikings sign Kyler Murray to 2-year deal worth $45M', category: 'signing', is_breaking: true },
  { headline: 'Dolphins release Tua Tagovailoa with post-June 1 designation', category: 'cut', is_breaking: false },
  { headline: 'Lions land Isiah Pacheco from Chiefs on 3-year deal', category: 'signing', is_breaking: true },
  { headline: 'Rams swing massive trade for Chiefs CB Trent McDuffie', category: 'trade', is_breaking: false },
];

async function seed() {
  console.log('🏈 GridLedger Seed Script (fetch mode)');
  console.log('');

  try {
    console.log('Inserting 32 NFL teams...');
    await query('teams', NFL_TEAMS);
    console.log('  ✓ 32 teams');
  } catch (e) { console.error('  ✗ Teams:', e.message); }

  try {
    console.log('Inserting transactions...');
    await query('transactions', TRANSACTIONS);
    console.log('  ✓ ' + TRANSACTIONS.length + ' transactions');
  } catch (e) { console.error('  ✗ Transactions:', e.message); }

  try {
    console.log('Inserting news...');
    await query('news', NEWS);
    console.log('  ✓ ' + NEWS.length + ' news');
  } catch (e) { console.error('  ✗ News:', e.message); }

  try {
    console.log('Inserting draft picks...');
    var picks = [];
    NFL_TEAMS.forEach(function(t) {
      for (var i = 1; i <= 7; i++) {
        picks.push({ original_team: t.id, current_owner: t.id, round: i, year: 2026, trade_value: [3000,1800,1100,600,300,180,80][i-1] });
      }
    });
    await query('draft_picks', picks);
    console.log('  ✓ ' + picks.length + ' picks');
  } catch (e) { console.error('  ✗ Picks:', e.message); }

  console.log('');
  console.log('✅ Done! Check your Supabase Table Editor to verify.');
}

seed().catch(function(e) { console.error('Fatal:', e); });