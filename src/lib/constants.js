export const SALARY_CAP_2026 = 301.2;

export const NFL_TEAMS = [
  {id:'ARI',name:'Cardinals',city:'Arizona',conf:'NFC',div:'West',color:'#97233F',accent:'#000000',espn:'ari'},
  {id:'ATL',name:'Falcons',city:'Atlanta',conf:'NFC',div:'South',color:'#A71930',accent:'#000000',espn:'atl'},
  {id:'BAL',name:'Ravens',city:'Baltimore',conf:'AFC',div:'North',color:'#241773',accent:'#9E7C0C',espn:'bal'},
  {id:'BUF',name:'Bills',city:'Buffalo',conf:'AFC',div:'East',color:'#00338D',accent:'#C60C30',espn:'buf'},
  {id:'CAR',name:'Panthers',city:'Carolina',conf:'NFC',div:'South',color:'#0085CA',accent:'#101820',espn:'car'},
  {id:'CHI',name:'Bears',city:'Chicago',conf:'NFC',div:'North',color:'#0B162A',accent:'#C83803',espn:'chi'},
  {id:'CIN',name:'Bengals',city:'Cincinnati',conf:'AFC',div:'North',color:'#FB4F14',accent:'#000000',espn:'cin'},
  {id:'CLE',name:'Browns',city:'Cleveland',conf:'AFC',div:'North',color:'#311D00',accent:'#FF3C00',espn:'cle'},
  {id:'DAL',name:'Cowboys',city:'Dallas',conf:'NFC',div:'East',color:'#003594',accent:'#869397',espn:'dal'},
  {id:'DEN',name:'Broncos',city:'Denver',conf:'AFC',div:'West',color:'#FB4F14',accent:'#002244',espn:'den'},
  {id:'DET',name:'Lions',city:'Detroit',conf:'NFC',div:'North',color:'#0076B6',accent:'#B0B7BC',espn:'det'},
  {id:'GB',name:'Packers',city:'Green Bay',conf:'NFC',div:'North',color:'#203731',accent:'#FFB612',espn:'gb'},
  {id:'HOU',name:'Texans',city:'Houston',conf:'AFC',div:'South',color:'#03202F',accent:'#A71930',espn:'hou'},
  {id:'IND',name:'Colts',city:'Indianapolis',conf:'AFC',div:'South',color:'#002C5F',accent:'#A2AAAD',espn:'ind'},
  {id:'JAX',name:'Jaguars',city:'Jacksonville',conf:'AFC',div:'South',color:'#006778',accent:'#D7A22A',espn:'jax'},
  {id:'KC',name:'Chiefs',city:'Kansas City',conf:'AFC',div:'West',color:'#E31837',accent:'#FFB81C',espn:'kc'},
  {id:'LAC',name:'Chargers',city:'Los Angeles',conf:'AFC',div:'West',color:'#0080C6',accent:'#FFC20E',espn:'lac'},
  {id:'LAR',name:'Rams',city:'Los Angeles',conf:'NFC',div:'West',color:'#003594',accent:'#FFA300',espn:'lar'},
  {id:'LV',name:'Raiders',city:'Las Vegas',conf:'AFC',div:'West',color:'#000000',accent:'#A5ACAF',espn:'lv'},
  {id:'MIA',name:'Dolphins',city:'Miami',conf:'AFC',div:'East',color:'#008E97',accent:'#FC4C02',espn:'mia'},
  {id:'MIN',name:'Vikings',city:'Minnesota',conf:'NFC',div:'North',color:'#4F2683',accent:'#FFC62F',espn:'min'},
  {id:'NE',name:'Patriots',city:'New England',conf:'AFC',div:'East',color:'#002244',accent:'#C60C30',espn:'ne'},
  {id:'NO',name:'Saints',city:'New Orleans',conf:'NFC',div:'South',color:'#D3BC8D',accent:'#101820',espn:'no'},
  {id:'NYG',name:'Giants',city:'New York',conf:'NFC',div:'East',color:'#0B2265',accent:'#A71930',espn:'nyg'},
  {id:'NYJ',name:'Jets',city:'New York',conf:'AFC',div:'East',color:'#125740',accent:'#000000',espn:'nyj'},
  {id:'PHI',name:'Eagles',city:'Philadelphia',conf:'NFC',div:'East',color:'#004C54',accent:'#A5ACAF',espn:'phi'},
  {id:'PIT',name:'Steelers',city:'Pittsburgh',conf:'AFC',div:'North',color:'#FFB612',accent:'#101820',espn:'pit'},
  {id:'SEA',name:'Seahawks',city:'Seattle',conf:'NFC',div:'West',color:'#002244',accent:'#69BE28',espn:'sea'},
  {id:'SF',name:'49ers',city:'San Francisco',conf:'NFC',div:'West',color:'#AA0000',accent:'#B3995D',espn:'sf'},
  {id:'TB',name:'Buccaneers',city:'Tampa Bay',conf:'NFC',div:'South',color:'#D50A0A',accent:'#34302B',espn:'tb'},
  {id:'TEN',name:'Titans',city:'Tennessee',conf:'AFC',div:'South',color:'#0C2340',accent:'#4B92DB',espn:'ten'},
  {id:'WAS',name:'Commanders',city:'Washington',conf:'NFC',div:'East',color:'#5A1414',accent:'#FFB612',espn:'wsh'},
];

export function getTeamById(id) { return NFL_TEAMS.find(t => t.id === id) || null; }
export function getTeamsByConf(conf) { return NFL_TEAMS.filter(t => t.conf === conf); }
export function getTeamsByDiv(conf, div) { return NFL_TEAMS.filter(t => t.conf === conf && t.div === div); }
export function getTeamsByDivision(conf, div) { return NFL_TEAMS.filter(t => t.conf === conf && t.div === div); }

export function teamLogoUrl(espn) {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espn}.png`;
}
export const teamLogo = teamLogoUrl;

export const POSITIONS = ['QB','RB','WR','TE','OT','OG','C','LT','RT','G','T','DE','DT','DL','ED','OLB','ILB','LB','CB','S','FS','SS','K','P','LS','FB','NT','DB','MLB'];

export const POSITION_GROUPS = {
  offense: ['QB','RB','WR','TE','OT','OG','C','LT','RT','G','FB','T','HB','FL','SE'],
  defense: ['DE','DT','DL','ED','OLB','ILB','LB','CB','S','FS','SS','NT','MLB','EDGE','SAF','DB','WILL','MIKE','SAM','SLB','WLB'],
  special: ['K','P','LS','PK','PR','KR'],
};

export const DRAFT_ROUNDS = [
  { round: 1, label: '1st', tradeValue: 3000 },
  { round: 2, label: '2nd', tradeValue: 1800 },
  { round: 3, label: '3rd', tradeValue: 1100 },
  { round: 4, label: '4th', tradeValue: 600 },
  { round: 5, label: '5th', tradeValue: 300 },
  { round: 6, label: '6th', tradeValue: 180 },
  { round: 7, label: '7th', tradeValue: 80 },
];

export function formatMoney(val) {
  if (val == null || isNaN(val)) return '$0.0M';
  return `$${Math.abs(val).toFixed(1)}M`;
}

export function posColor(pos) {
  if (['QB'].includes(pos)) return { bg: '#f3e8ff', fg: '#7c3aed' };
  if (['RB','FB','HB'].includes(pos)) return { bg: '#dcfce7', fg: '#16a34a' };
  if (['WR'].includes(pos)) return { bg: '#dbeafe', fg: '#2563eb' };
  if (['TE'].includes(pos)) return { bg: '#e0f2fe', fg: '#0284c7' };
  if (['OT','OG','C','LT','RT','G','T'].includes(pos)) return { bg: '#fef3c7', fg: '#b45309' };
  if (['DE','DT','DL','ED','NT'].includes(pos)) return { bg: '#ede9fe', fg: '#6d28d9' };
  if (['OLB','ILB','LB','MLB'].includes(pos)) return { bg: '#fce7f3', fg: '#be185d' };
  if (['CB','S','FS','SS','DB'].includes(pos)) return { bg: '#ccfbf1', fg: '#0d9488' };
  if (['K','P','LS'].includes(pos)) return { bg: '#f4f4f5', fg: '#71717a' };
  return { bg: '#f4f4f5', fg: '#71717a' };
}

export const PRO_FEATURES = { gmMode: true, tradeSim: true, faMarket: true, export: true, multiYear: true, analytics: true };
export function isProFeature(feature) { return PRO_FEATURES[feature] === true; }
