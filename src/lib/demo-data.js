// Generates realistic demo data for all 32 teams
// Used as fallback when Supabase is not connected

import { NFL_TEAMS, POSITIONS, SALARY_CAP_2026 } from './constants';

const FIRST_NAMES = [
  'Patrick','Josh','Lamar','Joe','Jalen','Justin','Dak','Jared','Brock','CJ',
  'Jayden','Caleb','Drake','Derrick','Saquon','Jonathan','Nick','Tyreek','Ja\'Marr',
  'CeeDee','Amon-Ra','Travis','George','Mark','Myles','Micah','TJ','Fred','Sauce',
  'Jaire','Roquan','Dexter','Chris','Quinnen','Maxx','Cameron','DeForest','Aaron',
  'Budda','Jessie','Harrison','Evan','Penei','Jordan','Aidan','Tyler','Cooper',
  'Trevon','Davante','Stefon','Mike','Sam','Zach','Kenny','Daron','Will','Quay',
  'Haason','Devin','Jalen','Amon','Rashawn','Tristan','Christian','Garrett',
];

const LAST_NAMES = [
  'Mahomes','Allen','Jackson','Burrow','Hurts','Herbert','Prescott','Goff',
  'Purdy','Stroud','Daniels','Williams','Maye','Henry','Barkley','Taylor',
  'Chubb','Hill','Chase','Lamb','St. Brown','Kelce','Kittle','Andrews',
  'Garrett','Parsons','Watt','Warner','Gardner','Alexander','Smith','Lawrence',
  'Jones','Crosby','Heyward','Buckner','Donald','Baker','Diggs','Adams',
  'Brown','Jefferson','Wilson','Moore','Johnson','Davis','Thomas','White',
  'Clark','Anderson','Martin','Thompson','Robinson','Wright','Lewis','Walker',
  'Hall','Young','King','Green','Turner','Collins','Edwards','Mitchell',
];

const ROSTER_TEMPLATE = [
  ['QB',2],['RB',3],['WR',5],['TE',3],['OT',3],['OG',3],['C',2],
  ['DE',4],['DT',3],['LB',4],['CB',5],['S',4],['K',1],['P',1],['LS',1],
];

const PS_TEMPLATE = ['QB','RB','WR','WR','WR','TE','OT','OG','DE','DT','LB','CB','CB','S','S','S'];
const DEAD_TEMPLATE = ['QB','WR','LB','DE'];

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePlayer(teamId, pos, tier, index, rng) {
  const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];

  let base, yrs, guar, age;

  if (tier === 0) { // Active roster
    const bases = [1.2, 2.5, 4.8, 8.5, 12.0, 16.5, 22.0, 28.5, 35.0, 45.0, 52.0];
    base = bases[Math.floor(rng() * bases.length)];
    if (pos === 'QB' && rng() > 0.5) base = 35 + rng() * 20;
    yrs = 1 + Math.floor(rng() * 5);
    age = 22 + Math.floor(rng() * 12);
    guar = Math.round(base * (0.3 + rng() * 0.4) * 10) / 10;
  } else if (tier === 1) { // Practice squad
    base = 0.8 + rng() * 1.2;
    yrs = 1;
    age = 22 + Math.floor(rng() * 4);
    guar = 0;
  } else { // Dead cap
    base = 2 + rng() * 10;
    yrs = 0;
    age = 26 + Math.floor(rng() * 6);
    guar = Math.round(base * 0.5 * 10) / 10;
  }

  const capHit = Math.round((base + rng() * 2) * 10) / 10;
  const deadCap = Math.round(guar * (0.3 + rng() * 0.3) * 10) / 10;

  return {
    id: `${teamId}-${pos}-${tier}-${index}`,
    team_id: teamId,
    name: `${fn} ${ln}`,
    position: pos,
    number: 1 + Math.floor(rng() * 89),
    age,
    experience: Math.max(age - 22, 0),
    status: tier === 2 ? 'free_agent' : 'active',
    roster_status: tier === 0 ? 'active' : tier === 1 ? 'practice_squad' : 'dead',
    contract: {
      base_salary: Math.round(base * 10) / 10,
      cap_hit: capHit,
      dead_cap: deadCap,
      guaranteed: guar,
      years: yrs,
      total_value: Math.round(base * yrs * 10) / 10,
    },
  };
}

export function generateTeamRoster(teamId) {
  const seed = teamId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) * 7919;
  const rng = seededRandom(seed);
  const players = [];
  let idx = 0;

  // Active roster (~44 players)
  ROSTER_TEMPLATE.forEach(([pos, count]) => {
    for (let i = 0; i < count; i++) {
      players.push(generatePlayer(teamId, pos, 0, idx++, rng));
    }
  });

  // Practice squad (~16)
  PS_TEMPLATE.forEach((pos, i) => {
    players.push(generatePlayer(teamId, pos, 1, idx + i, rng));
  });
  idx += PS_TEMPLATE.length;

  // Dead cap (~4)
  DEAD_TEMPLATE.forEach((pos, i) => {
    players.push(generatePlayer(teamId, pos, 2, idx + i, rng));
  });

  return players;
}

export function generateAllTeamData() {
  const data = {};
  NFL_TEAMS.forEach(team => {
    const roster = generateTeamRoster(team.id);
    const capUsed = roster.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
    data[team.id] = {
      ...team,
      roster,
      cap_used: Math.round(capUsed * 10) / 10,
      cap_space: Math.round((SALARY_CAP_2026 - capUsed) * 10) / 10,
      dead_money: Math.round(
        roster.filter(p => p.roster_status === 'dead').reduce((s, p) => s + (p.contract?.dead_cap || 0), 0) * 10
      ) / 10,
    };
  });
  return data;
}

export function generateTransactions() {
  return [
    { id: 't1', player_name: 'Jermaine Johnson II', from_team_id: 'NYJ', to_team_id: 'TEN', type: 'trade', transaction_date: '2026-03-11', details: 'Traded for draft picks' },
    { id: 't2', player_name: 'T\'Vondre Sweat', from_team_id: 'TEN', to_team_id: 'NYJ', type: 'trade', transaction_date: '2026-03-11', details: 'Part of Johnson trade' },
    { id: 't3', player_name: 'DJ Moore', from_team_id: 'CHI', to_team_id: 'BUF', type: 'trade', transaction_date: '2026-03-11', details: 'Traded for 2027 2nd' },
    { id: 't4', player_name: 'Rashan Gary', from_team_id: 'GB', to_team_id: 'DAL', type: 'trade', transaction_date: '2026-03-11', details: 'Traded for 2026 3rd + 5th' },
    { id: 't5', player_name: 'Michael Pittman', from_team_id: 'IND', to_team_id: 'PIT', type: 'trade', transaction_date: '2026-03-11', details: 'Traded for 2027 4th' },
    { id: 't6', player_name: 'Trent McDuffie', from_team_id: 'KC', to_team_id: 'LAR', type: 'trade', transaction_date: '2026-03-11', details: 'Blockbuster CB trade' },
    { id: 't7', player_name: 'Minkah Fitzpatrick', from_team_id: 'MIA', to_team_id: 'NYJ', type: 'trade', transaction_date: '2026-03-11', details: 'Safety trade' },
    { id: 's1', player_name: 'Kyler Murray', from_team_id: null, to_team_id: 'MIN', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13', details: '2yr/$45M' },
    { id: 's2', player_name: 'Isiah Pacheco', from_team_id: 'KC', to_team_id: 'DET', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13', details: '3yr/$28M' },
    { id: 's3', player_name: 'Travis Etienne', from_team_id: 'JAX', to_team_id: 'NO', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13', details: '2yr/$18M' },
    { id: 's4', player_name: 'Leo Chenal', from_team_id: 'KC', to_team_id: 'WAS', type: 'signing', subtype: 'UFA', transaction_date: '2026-03-13', details: '3yr/$36M' },
    { id: 'c1', player_name: 'Tua Tagovailoa', from_team_id: 'MIA', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-12', details: 'Post-June 1 designation' },
    { id: 'c2', player_name: 'Kirk Cousins', from_team_id: 'ATL', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-11', details: 'Post-June 1 designation' },
    { id: 'c3', player_name: 'Stefon Diggs', from_team_id: 'NE', to_team_id: null, type: 'cut', transaction_date: '2026-03-11', details: 'Released' },
    { id: 'c4', player_name: 'Kyler Murray', from_team_id: 'ARI', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-11', details: 'Post-June 1 designation' },
    { id: 'c5', player_name: 'Bradley Chubb', from_team_id: 'MIA', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-11', details: 'Post-June 1 designation' },
    { id: 'c6', player_name: 'David Njoku', from_team_id: 'CLE', to_team_id: null, type: 'cut', subtype: 'post_june_1', transaction_date: '2026-03-11', details: 'Post-June 1 designation' },
  ];
}

export function generateNews() {
  return [
    { id: 'n1', headline: 'Cowboys land Rashan Gary in blockbuster trade with Packers', category: 'trade', is_breaking: true, published_at: new Date(Date.now() - 120000).toISOString() },
    { id: 'n2', headline: 'Vikings sign Kyler Murray to 2-year deal worth $45M', category: 'signing', is_breaking: true, published_at: new Date(Date.now() - 840000).toISOString() },
    { id: 'n3', headline: 'Dolphins release Tua Tagovailoa with post-June 1 designation', category: 'cut', is_breaking: false, published_at: new Date(Date.now() - 1920000).toISOString() },
    { id: 'n4', headline: 'Lions land Isiah Pacheco from Chiefs on 3-year deal', category: 'signing', is_breaking: true, published_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'n5', headline: 'Jets acquire Minkah Fitzpatrick and Geno Smith in separate deals', category: 'trade', is_breaking: false, published_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'n6', headline: 'Patriots cut Stefon Diggs, clearing $14.8M in cap space', category: 'cut', is_breaking: false, published_at: new Date(Date.now() - 10800000).toISOString() },
    { id: 'n7', headline: 'Rams swing massive trade for Chiefs CB Trent McDuffie', category: 'trade', is_breaking: false, published_at: new Date(Date.now() - 14400000).toISOString() },
    { id: 'n8', headline: 'Saints agree to terms with Jaguars RB Travis Etienne', category: 'signing', is_breaking: false, published_at: new Date(Date.now() - 18000000).toISOString() },
    { id: 'n9', headline: 'Falcons designate Kirk Cousins as post-June 1 cut', category: 'cut', is_breaking: false, published_at: new Date(Date.now() - 21600000).toISOString() },
    { id: 'n10', headline: 'Commanders sign Leo Chenal to 3-year, $36M contract', category: 'signing', is_breaking: false, published_at: new Date(Date.now() - 25200000).toISOString() },
  ];
}

export function generateFreeAgents() {
  const rng = seededRandom(42069);
  const positions = ['QB','RB','WR','WR','TE','OT','OG','DE','DT','LB','LB','CB','CB','S','K'];
  return positions.map((pos, i) => ({
    id: `FA-${i}`,
    name: `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`,
    position: pos,
    age: 26 + Math.floor(rng() * 7),
    experience: 4 + Math.floor(rng() * 8),
    projected_value: Math.round((3 + rng() * 22) * 10) / 10,
  }));
}
