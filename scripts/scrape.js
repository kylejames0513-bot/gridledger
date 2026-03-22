var SUPA_URL = 'https://vvfyueflpdjbphxolckn.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU';

var TEAMS=[
{id:'ARI',s:'arizona-cardinals'},{id:'ATL',s:'atlanta-falcons'},{id:'BAL',s:'baltimore-ravens'},
{id:'BUF',s:'buffalo-bills'},{id:'CAR',s:'carolina-panthers'},{id:'CHI',s:'chicago-bears'},
{id:'CIN',s:'cincinnati-bengals'},{id:'CLE',s:'cleveland-browns'},{id:'DAL',s:'dallas-cowboys'},
{id:'DEN',s:'denver-broncos'},{id:'DET',s:'detroit-lions'},{id:'GB',s:'green-bay-packers'},
{id:'HOU',s:'houston-texans'},{id:'IND',s:'indianapolis-colts'},{id:'JAX',s:'jacksonville-jaguars'},
{id:'KC',s:'kansas-city-chiefs'},{id:'LAC',s:'los-angeles-chargers'},{id:'LAR',s:'los-angeles-rams'},
{id:'LV',s:'las-vegas-raiders'},{id:'MIA',s:'miami-dolphins'},{id:'MIN',s:'minnesota-vikings'},
{id:'NE',s:'new-england-patriots'},{id:'NO',s:'new-orleans-saints'},{id:'NYG',s:'new-york-giants'},
{id:'NYJ',s:'new-york-jets'},{id:'PHI',s:'philadelphia-eagles'},{id:'PIT',s:'pittsburgh-steelers'},
{id:'SEA',s:'seattle-seahawks'},{id:'SF',s:'san-francisco-49ers'},{id:'TB',s:'tampa-bay-buccaneers'},
{id:'TEN',s:'tennessee-titans'},{id:'WAS',s:'washington-commanders'},
];

function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function toM(raw){if(!raw||raw===0)return 0;return Math.round(raw/1000000*100)/100;}

async function api(path,method,body){
  var h={'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'};
  if(method==='POST')h['Prefer']='return=representation';
  var opts={method:method||'GET',headers:h};
  if(body)opts.body=JSON.stringify(body);
  var res=await fetch(SUPA_URL+'/rest/v1/'+path,opts);
  var txt=await res.text();
  if(!res.ok&&method!=='DELETE'){console.log('    DB:'+res.status+' '+txt.substring(0,60));return null;}
  try{return JSON.parse(txt);}catch(e){return null;}
}
async function del(p){await fetch(SUPA_URL+'/rest/v1/'+p,{method:'DELETE',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}});}

async function scrollPage(page) {
  await wait(3000);
  for(var step=0;step<20;step++){await page.mouse.wheel({deltaY:800});await wait(300);}
  await wait(2000);
  await page.mouse.wheel({deltaY:-99999});
  await wait(1000);
}

async function loadPage(browser, url) {
  var page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
  await page.setViewport({width:1440,height:900});
  await page.goto(url, {waitUntil:'networkidle2',timeout:45000});
  await scrollPage(page);
  return page;
}

// ═══ CAP PAGE EXTRACTION ═══
var EXTRACT_CAP = function() {
  function $(t){if(!t)return 0;t=t.trim();if(t==='-'||t===''||t==='$-')return 0;var n=t.indexOf('(')>=0;var c=t.replace(/[^0-9.]/g,'');if(!c)return 0;return n?-parseFloat(c):parseFloat(c);}

  var tables = Array.from(document.querySelectorAll('table'));
  var players=[], picks=[], tableInfo=[];
  var foundActive=false, foundDraft=false;

  for(var idx=0;idx<tables.length;idx++){
    var table=tables[idx];
    var rowCount=table.querySelectorAll('tbody tr').length;
    if(rowCount<1)continue;
    if(foundDraft){tableInfo.push(idx+':SKIP('+rowCount+')');continue;}

    var hdrs=[];
    table.querySelectorAll('thead th, thead td').forEach(function(th){hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g,' '));});
    var allHeaders=hdrs.join(' ');
    var isDraft=allHeaders.includes('round')||allHeaders.includes('pick #');

    var section;
    if(isDraft){section='draft';foundDraft=true;}
    else if(!foundActive&&rowCount>=20){section='active';foundActive=true;}
    else if(foundActive){section='dead';}
    else{tableInfo.push(idx+':skip('+rowCount+')');continue;}

    tableInfo.push(idx+':'+section+'('+rowCount+')');

    var c={};
    hdrs.forEach(function(h,i){
      if(i===0)c.name=0;
      if(h==='pos'||h==='pos.')c.pos=i;
      if(h==='age')c.age=i;
      if((h.includes('cap hit')||h==='cap')&&!h.includes('pct')&&!h.includes('%')&&c.cap===undefined)c.cap=i;
      if((h.includes('cap hit pct')||h.includes('cap hit %'))&&c.capPct===undefined)c.capPct=i;
      if(h.includes('dead'))c.dead=i;
      if(h.includes('base')||h.includes('p5 sal'))c.base=i;
      if(h.includes('signing'))c.sign=i;
      if(h.includes('roster')&&h.includes('bon'))c.rost=i;
      if(h.includes('cash'))c.cash=i;
      if(h.includes('free agent'))c.faYear=i;
      if(h.includes('round'))c.round=i;
    });
    if(c.pos===undefined)c.pos=1;
    if(c.age===undefined)c.age=2;

    table.querySelectorAll('tbody tr').forEach(function(row){
      var td=row.querySelectorAll('td');
      if(td.length<3)return;
      var nc=td[c.name||0];
      var lk=nc?nc.querySelector('a'):null;
      var nm=(lk?lk.textContent:(nc?nc.textContent:'')).trim().replace(/^\d+\s+/,'').replace(/\s+/g,' ').trim();
      if(!nm||nm.length<3)return;
      if(/^(total|cap |salary|active|player|dead money|top 51|league|team)/i.test(nm))return;

      var pos=c.pos<td.length?td[c.pos].textContent.trim():'';
      if(pos.length>5)pos='';
      var age=null;
      if(c.age<td.length){var av=parseInt(td[c.age].textContent.trim());if(av>=18&&av<=50)age=av;}

      if(section==='draft'){
        var roundCell=c.round!==undefined&&c.round<td.length?td[c.round].textContent.trim():'';
        var capVal=c.cap!==undefined&&c.cap<td.length?$(td[c.cap].textContent):0;
        var digitMatch=roundCell.match(/(\d)/);
        var roundNum=digitMatch?parseInt(digitMatch[1]):0;
        if(roundNum>=1&&roundNum<=7)picks.push({round:roundNum,cap:capVal});
        return;
      }

      // Free agent year
      var faYear = 0;
      if(c.faYear!==undefined&&c.faYear<td.length){
        var fy=td[c.faYear].textContent.trim().match(/(\d{4})/);
        if(fy)faYear=parseInt(fy[1]);
      }

      // Cash total
      var cashVal = 0;
      if(c.cash!==undefined&&c.cash<td.length) cashVal=$(td[c.cash].textContent);

      // Cap hit percentage
      var capPct = '';
      if(c.capPct!==undefined&&c.capPct<td.length) capPct=td[c.capPct].textContent.trim();

      function g(k){return c[k]!==undefined&&c[k]<td.length?$(td[c[k]].textContent):0;}
      players.push({nm:nm,pos:pos||'UNK',age:age,sec:section,cap:g('cap'),dead:g('dead'),base:g('base'),sign:g('sign'),rost:g('rost'),cash:cashVal,faYear:faYear,capPct:capPct});
    });
  }

  players=players.filter(function(p){
    if(/^R\d+[,\s]/.test(p.nm))return false;
    return p.cap!==0||p.base!==0||p.dead!==0;
  });

  // Parse summary table (rollover, adjustment, adjusted cap, cap space)
  var summary = { rollover: 0, adjustment: 0, adjustedCap: 0, capSpace: 0, activeRoster: 0, deadMoney: 0 };
  function $neg(t) {
    if (!t) return 0;
    t = t.trim();
    if (t === '-' || t === '' || t === '$-') return 0;
    var isNeg = t.indexOf('(') >= 0 || t.indexOf('-') >= 0;
    var c = t.replace(/[^0-9.]/g, '');
    if (!c) return 0;
    return isNeg ? -parseFloat(c) : parseFloat(c);
  }
  for (var si = 0; si < tables.length; si++) {
    var st = tables[si];
    var srows = st.querySelectorAll('tbody tr, tr');
    if (srows.length < 5 || srows.length > 20) continue;
    var firstCell = srows[0] ? srows[0].querySelector('td') : null;
    if (!firstCell) continue;
    var fc = firstCell.textContent.trim().toLowerCase();
    if (!fc.includes('salary cap') && !fc.includes('nfl')) continue;
    
    // Found the summary table
    srows.forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      var label = cells[0].textContent.trim().toLowerCase();
      var rawVal = cells[1].textContent.trim();
      
      // Use $neg for items that could be negative (adjustment), regular $ for others
      if (label.includes('rollover')) summary.rollover = $(rawVal);
      else if (label.includes('adjustment') && !label.includes('adjusted')) summary.adjustment = $neg(rawVal);
      else if (label.includes('adjusted') && label.includes('cap')) summary.adjustedCap = $(rawVal);
      else if (label.includes('cap space')) summary.capSpace = $(rawVal);
      else if (label.includes('active roster')) summary.activeRoster = $(rawVal);
      else if (label.includes('dead money') || label.includes('dead cap')) summary.deadMoney = $(rawVal);
    });
    break;
  }

  return{players:players,picks:picks,tables:tableInfo,summary:summary};
};

// ═══ CONTRACTS PAGE EXTRACTION ═══
var EXTRACT_CONTRACTS = function() {
  function $(t){if(!t)return 0;t=t.trim();if(t==='-'||t===''||t==='$-')return 0;var n=t.indexOf('(')>=0;var c=t.replace(/[^0-9.]/g,'');if(!c)return 0;return n?-parseFloat(c):parseFloat(c);}

  var contracts = {};
  var tables = Array.from(document.querySelectorAll('table'));

  tables.forEach(function(table) {
    var hdrs = [];
    table.querySelectorAll('thead th, thead td').forEach(function(th) {
      hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g, ' '));
    });

    // Map columns
    var c = {};
    hdrs.forEach(function(h, i) {
      if (i === 0) c.name = 0;
      if (h === 'pos' || h === 'pos.') c.pos = i;
      if (h === 'age') c.age = i;
      // Years column — could be "years", "yrs", "length"
      if (h === 'years' || h === 'yrs' || h === 'length') c.years = i;
      // Total value
      if (h.includes('value') || h.includes('total') || h === 'contract') c.value = i;
      // Guaranteed
      if (h.includes('guaranteed') || h.includes('gtd') || h.includes('guar')) c.guar = i;
      // Avg per year
      if (h.includes('avg') || h.includes('apy') || h.includes('per year')) c.apy = i;
      // Free agent year
      if (h.includes('free agent') || h.includes('fa year') || h.includes('ufa')) c.faYear = i;
    });

    // Need at least name and some contract info
    if (c.years === undefined && c.value === undefined && c.guar === undefined) return;

    table.querySelectorAll('tbody tr').forEach(function(row) {
      var td = row.querySelectorAll('td');
      if (td.length < 3) return;

      var nc = td[c.name || 0];
      var lk = nc ? nc.querySelector('a') : null;
      var nm = (lk ? lk.textContent : (nc ? nc.textContent : '')).trim().replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();
      if (!nm || nm.length < 3) return;
      if (/^(total|cap |salary|active|player|dead money|top 51|league|team)/i.test(nm)) return;

      var years = 0;
      if (c.years !== undefined && c.years < td.length) {
        var yrText = td[c.years].textContent.trim();
        var yrMatch = yrText.match(/(\d+)/);
        if (yrMatch) years = parseInt(yrMatch[1]);
      }

      var value = c.value !== undefined && c.value < td.length ? $(td[c.value].textContent) : 0;
      var guar = c.guar !== undefined && c.guar < td.length ? $(td[c.guar].textContent) : 0;
      var apy = c.apy !== undefined && c.apy < td.length ? $(td[c.apy].textContent) : 0;

      contracts[nm.toLowerCase()] = {
        years: years,
        value: value,
        guar: guar,
        apy: apy,
      };
    });
  });

  return contracts;
};

// ═══ PROCESS TEAM ═══

async function run(browser, team) {
  // ─── PAGE 1: CAP PAGE ───────────────────────────────────
  var capUrl = 'https://www.spotrac.com/nfl/' + team.s + '/cap/_/year/2026';
  var page;
  try { page = await loadPage(browser, capUrl); }
  catch(e) {
    try { page = await loadPage(browser, 'https://www.spotrac.com/nfl/' + team.s + '/cap'); }
    catch(e2) { throw new Error('cap timeout'); }
  }

  var data = await page.evaluate(EXTRACT_CAP);
  await page.close();

  if (!data.players.length) throw new Error('0 players from cap page');

  // ─── PAGE 1b: OVERVIEW PAGE (for summary: rollover, adjustments, top-51) ──
  if (!data.summary || !data.summary.capSpace) {
    try {
      var overviewUrl = 'https://www.spotrac.com/nfl/' + team.s + '/overview';
      var oPage = await loadPage(browser, overviewUrl);
      var oSum = await oPage.evaluate(function() {
        function $(t){if(!t)return 0;t=t.trim();if(t==='-'||t===''||t==='$-')return 0;var isNeg=t.indexOf('(')>=0||(/\$\s*-/.test(t));var c=t.replace(/[^0-9.]/g,'');if(!c)return 0;return isNeg?-parseFloat(c):parseFloat(c);}
        var tables = Array.from(document.querySelectorAll('table'));
        var summary = {};
        for (var i = 0; i < tables.length; i++) {
          var rows = tables[i].querySelectorAll('tr');
          if (rows.length < 5 || rows.length > 20) continue;
          var fc = rows[0] && rows[0].querySelector('td') ? rows[0].querySelector('td').textContent.trim().toLowerCase() : '';
          if (!fc.includes('salary cap') && !fc.includes('nfl')) continue;
          rows.forEach(function(r) {
            var cells = r.querySelectorAll('td');
            if (cells.length < 2) return;
            var label = cells[0].textContent.trim().toLowerCase();
            var val = $(cells[1].textContent);
            if (label.includes('rollover')) summary.rollover = val;
            else if (label.includes('adjustment') && !label.includes('adjusted')) {
              var raw = cells[1].textContent.trim();
              var neg = raw.indexOf('-') >= 0 || raw.indexOf('(') >= 0;
              summary.adjustment = neg ? -Math.abs(val) : val;
            }
            else if (label.includes('adjusted') && label.includes('cap')) summary.adjustedCap = val;
            else if (label.includes('cap space')) summary.capSpace = val;
            else if (label.includes('dead money') || label.includes('dead cap')) summary.deadMoney = val;
          });
          break;
        }
        return summary;
      });
      await oPage.close();
      if (oSum && oSum.capSpace) data.summary = oSum;
    } catch(e) {
      console.log('(overview page failed, using manual cap calc)');
    }
  }

  // ─── PAGE 2: CONTRACTS PAGE ─────────────────────────────
  var contractData = {};
  try {
    var cPage = await loadPage(browser, 'https://www.spotrac.com/nfl/' + team.s + '/contracts');
    contractData = await cPage.evaluate(EXTRACT_CONTRACTS);
    await cPage.close();
  } catch(e) {
    console.log('(contracts page failed, skipping years/gtd)');
  }

  var contractCount = Object.keys(contractData).length;

  // ─── MERGE contract data into cap data ──────────────────
  data.players.forEach(function(p) {
    var key = p.nm.toLowerCase();
    if (contractData[key]) {
      p.years = contractData[key].years || 0;
      p.guar = contractData[key].guar || 0;
      p.totalVal = contractData[key].value || 0;
    }
  });

  // Count sections
  var n = {a:0, ir:0, ps:0, d:0};
  data.players.forEach(function(p) {
    if (p.sec === 'active') n.a++;
    else if (p.sec === 'ir' || p.sec === 'pup') n.ir++;
    else if (p.sec === 'ps') n.ps++;
    else n.d++;
  });

  console.log(data.players.length + 'p(' + n.a + 'A/' + n.ir + 'IR/' + n.ps + 'PS/' + n.d + 'D) ' + data.picks.length + 'pk ' + contractCount + ' contracts matched');
  console.log('         tables: ' + data.tables.join(', '));

  // ─── CAP MATH ──────────────────────────────────────────
  var activePlayers = data.players.filter(function(p) { return p.sec === 'active'; });
  var deadPlayers = data.players.filter(function(p) { return p.sec === 'dead'; });

  var activeCapM = activePlayers.reduce(function(s, p) { return s + toM(p.cap); }, 0);
  activeCapM = Math.round(activeCapM * 100) / 100;
  var deadCapM = deadPlayers.reduce(function(s, p) { return s + Math.abs(toM(p.cap)); }, 0);
  deadCapM = Math.round(deadCapM * 100) / 100;

  // Use Spotrac's own summary (includes rollover + adjustments + top-51 rule)
  var sum = data.summary || {};
  var rolloverM = Math.round(toM(sum.rollover) * 100) / 100;
  var adjustmentM = Math.round(toM(sum.adjustment) * 100) / 100;
  var adjustedCapM = toM(sum.adjustedCap) > 0 ? Math.round(toM(sum.adjustedCap) * 100) / 100 : Math.round((301.2 + rolloverM + adjustmentM) * 100) / 100;
  var top51SpaceM = Math.round(toM(sum.capSpace) * 100) / 100;

  // Fallback: if summary didn't parse, calculate manually
  var usedM, spaceM;
  if (top51SpaceM !== 0) {
    spaceM = top51SpaceM;
    usedM = Math.round((adjustedCapM - spaceM) * 100) / 100;
  } else {
    usedM = Math.round((activeCapM + deadCapM) * 100) / 100;
    spaceM = Math.round((301.2 + rolloverM + adjustmentM - usedM) * 100) / 100;
  }

  console.log('         cap: active=$' + activeCapM + 'M dead=$' + deadCapM + 'M');
  console.log('         spotrac: rollover=$' + rolloverM + 'M adj=$' + adjustmentM + 'M adjCap=$' + adjustedCapM + 'M top51space=$' + top51SpaceM + 'M');

  // ─── CLEAR OLD DATA ────────────────────────────────────
  await del('contracts?team_id=eq.' + team.id);
  await del('players?team_id=eq.' + team.id);
  await del('draft_picks?current_owner=eq.' + team.id);

  // ─── INSERT PLAYERS ────────────────────────────────────
  var rows = data.players.map(function(p) {
    var rs = 'active', st = 'active';
    if (p.sec === 'ps') rs = 'practice_squad';
    if (p.sec === 'ir') { rs = 'reserve'; st = 'injured_reserve'; }
    if (p.sec === 'pup') { rs = 'reserve'; st = 'pup'; }
    if (p.sec === 'dead' || p.sec === 'holdout') { rs = 'dead'; st = 'free_agent'; }
    return { team_id: team.id, name: p.nm, position: p.pos, age: p.age, status: st, roster_status: rs, experience: 0 };
  });

  var ic = 0;
  for (var i = 0; i < rows.length; i += 20) {
    var b = rows.slice(i, i + 20);
    var r = await api('players', 'POST', b);
    if (r && r.length) ic += r.length;
    else { for (var j = 0; j < b.length; j++) { var s = await api('players', 'POST', [b[j]]); if (s && s.length) ic++; } }
  }

  // ─── READ BACK IDs ─────────────────────────────────────
  var dbp = await api('players?team_id=eq.' + team.id + '&select=id,name&order=name', 'GET');
  if (!dbp || !dbp.length) return { p: ic, c: 0, pk: 0 };

  // ─── INSERT CONTRACTS (with years + guaranteed) ────────
  var cc = 0;
  for (var k = 0; k < data.players.length; k++) {
    var p = data.players[k];
    var m = dbp.find(function(x) { return x.name.toLowerCase() === p.nm.toLowerCase(); });
    if (!m) continue;
    var cr = await api('contracts', 'POST', [{
      player_id: m.id,
      team_id: team.id,
      base_salary: toM(p.base),
      cap_hit: toM(p.cap),
      dead_cap: toM(p.dead),
      signing_bonus: toM(p.sign),
      roster_bonus: toM(p.rost),
      guaranteed: toM(p.guar || 0),
      total_value: toM(p.totalVal || 0),
      cash_total: toM(p.cash || 0),
      years: p.years || 1,
      year_expires: p.faYear || null,
      is_current: true,
    }]);
    if (cr && cr.length) cc++;
  }

  // ─── INSERT DRAFT PICKS ────────────────────────────────
  var pc = 0;
  var tv = {1:3000, 2:1800, 3:1100, 4:600, 5:300, 6:180, 7:80};
  for (var d = 0; d < data.picks.length; d++) {
    var rn = data.picks[d].round;
    if (!rn || rn < 1 || rn > 7) continue;
    var pr = await api('draft_picks', 'POST', [{ original_team: team.id, current_owner: team.id, round: rn, year: 2026, trade_value: tv[rn] || 0 }]);
    if (pr && pr.length) pc++;
  }

  // ─── UPDATE TEAM RECORD ────────────────────────────────
  await fetch(SUPA_URL + '/rest/v1/teams?id=eq.' + team.id, {
    method: 'PATCH',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      cap_total: adjustedCapM > 200 ? adjustedCapM : 301.2,
      cap_used: usedM,
      cap_space: spaceM,
      dead_money: deadCapM,
    })
  });

  console.log('         -> ' + ic + 'p ' + cc + 'c ' + pc + 'pk');
  return { p: ic, c: cc, pk: pc };
}

// ═══ FREE AGENT PAGE EXTRACTION ═══
var EXTRACT_FA = function() {
  function $(t){if(!t)return 0;t=t.trim();if(t==='-'||t===''||t==='$-')return 0;var n=t.indexOf('(')>=0;var c=t.replace(/[^0-9.]/g,'');if(!c)return 0;return n?-parseFloat(c):parseFloat(c);}

  // Spotrac FA page has 2 real tables:
  //   Table 1: Already-signed FAs (From/To/Player/Pos/Yrs/Value/AAV...) - SKIP
  //   Table 4: Available FAs (Player/Pos/Age/YOE/Prev Team/Prev AAV/Type/Market Value) - USE THIS
  // We want the table whose first header contains "Player" AND has "Age" and "Market" columns

  var fas = [];
  var tables = document.querySelectorAll('table');

  tables.forEach(function(table) {
    var rowCount = table.querySelectorAll('tbody tr').length;
    if (rowCount < 5) return;

    var hdrs = [];
    table.querySelectorAll('thead th, thead td').forEach(function(th) {
      hdrs.push(th.textContent.trim().toLowerCase().replace(/\s+/g, ' '));
    });
    var allH = hdrs.join(' ');

    // Only use the "available" table — has Age column (signed table doesn't)
    if (!allH.includes('age')) return;
    // Must also have market value
    if (!allH.includes('market')) return;

    // Exact column mapping from DOM debug:
    // 0: Player, 1: Pos, 2: Age, 3: YOE, 4: Prev Team, 5: Prev AAV, 6: Type, 7: Market Value
    table.querySelectorAll('tbody tr').forEach(function(row) {
      var td = row.querySelectorAll('td');
      if (td.length < 5) return;

      // Name from column 0
      var nc = td[0];
      var lk = nc ? nc.querySelector('a') : null;
      var nm = (lk ? lk.textContent : (nc ? nc.textContent : '')).trim().replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();
      if (!nm || nm.length < 3) return;
      if (/^(total|player|free agent|name)/i.test(nm)) return;

      // Pos from column 1
      var pos = td.length > 1 ? td[1].textContent.trim() : '';
      if (pos.length > 6) pos = '';

      // Age from column 2
      var age = null;
      if (td.length > 2) { var av = parseInt(td[2].textContent.trim()); if (av >= 18 && av <= 50) age = av; }

      // YOE (experience) from column 3
      var exp = 0;
      if (td.length > 3) { var ev = parseInt(td[3].textContent.trim()); if (ev >= 0 && ev <= 25) exp = ev; }

      // Prev Team from column 4
      var team = td.length > 4 ? td[4].textContent.trim() : '';

      // Prev AAV from column 5
      var prevAAV = td.length > 5 ? $(td[5].textContent) : 0;

      // Type from column 6 (UFA, RFA, etc)
      var faType = td.length > 6 ? td[6].textContent.trim() : '';

      // Market Value (projected APY) from column 7
      var marketVal = td.length > 7 ? $(td[7].textContent) : 0;

      fas.push({
        nm: nm,
        pos: pos || 'UNK',
        age: age,
        exp: exp,
        value: marketVal,    // market projection = APY
        prevAAV: prevAAV,
        total: 0,
        guar: 0,
        team: team,
        faType: faType,
      });
    });
  });

  fas = fas.filter(function(f) { return f.nm.length >= 3 && f.value > 0; });

  return fas;
};

async function scrapeFreeAgents(browser) {
  console.log('  Scraping free agents...');
  var page;
  try {
    page = await loadPage(browser, 'https://www.spotrac.com/nfl/free-agents/available/_/year/2026');
  } catch(e) {
    try {
      page = await loadPage(browser, 'https://www.spotrac.com/nfl/free-agents/available');
    } catch(e2) { console.log('    FA page timeout'); return 0; }
  }

  var fas = await page.evaluate(EXTRACT_FA);
  await page.close();

  if (!fas.length) { console.log('    0 free agents found'); return 0; }
  console.log('    Scraped ' + fas.length + ' free agents');

  // Clear old
  await del('free_agents?status=eq.available');

  // Insert in batches
  var ic = 0;
  var rows = fas.map(function(f) {
    return {
      name: f.nm,
      position: f.pos,
      age: f.age,
      experience: f.exp,
      former_team: f.team || null,
      market_value: toM(f.value),
      total_value: toM(f.total),
      guaranteed: toM(f.guar),
      status: 'available',
    };
  });

  for (var i = 0; i < rows.length; i += 20) {
    var b = rows.slice(i, i + 20);
    var r = await api('free_agents', 'POST', b);
    if (r && r.length) ic += r.length;
    else { for (var j = 0; j < b.length; j++) { var s = await api('free_agents', 'POST', [b[j]]); if (s && s.length) ic++; } }
  }

  console.log('    Inserted ' + ic + ' free agents');
  return ic;
}

// ═══ NFL.COM TRANSACTION SCRAPING ═══

var EXTRACT_TX = function() {
  var txs = [];
  var tables = document.querySelectorAll('table');
  
  tables.forEach(function(table) {
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 3) return;
      
      // NFL.com transaction tables: Date | Transaction | Team
      var date = cells[0] ? cells[0].textContent.trim() : '';
      var desc = cells[1] ? cells[1].textContent.trim() : '';
      var team = cells.length > 2 ? cells[2].textContent.trim() : '';
      
      if (!desc || desc.length < 10) return;
      if (/^(date|transaction)/i.test(desc)) return;
      
      // Parse player name and action from description
      var playerMatch = desc.match(/^([A-Z][a-z]+ [A-Z][a-zA-Z'-]+(?:\s(?:Jr\.|Sr\.|II|III|IV))?)/);
      var playerName = playerMatch ? playerMatch[1] : '';
      
      var type = 'other';
      var descLower = desc.toLowerCase();
      if (descLower.includes('signed') || descLower.includes('signing')) type = 'signing';
      else if (descLower.includes('traded') || descLower.includes('trade')) type = 'trade';
      else if (descLower.includes('released') || descLower.includes('waived') || descLower.includes('terminated')) type = 'release';
      else if (descLower.includes('restructure')) type = 'restructure';
      else if (descLower.includes('reserve') || descLower.includes('injured')) type = 'reserve';
      else if (descLower.includes('extended') || descLower.includes('extension')) type = 'signing';
      
      txs.push({ date: date, player: playerName || desc.substring(0, 40), desc: desc, team: team, type: type });
    });
  });
  
  return txs;
};

var TX_TYPES = { trades: 'trade', signings: 'signing', waivers: 'release', terminations: 'release', 'reserve-list': 'reserve' };

async function scrapeTransactions(browser) {
  console.log('  Scraping NFL.com transactions...');
  var now = new Date();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  var categories = ['trades', 'signings', 'waivers', 'terminations'];
  var allTx = [];

  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var url = 'https://www.nfl.com/transactions/league/' + cat + '/' + year + '/' + month;
    try {
      var page = await loadPage(browser, url);
      var txs = await page.evaluate(EXTRACT_TX);
      await page.close();
      txs.forEach(function(t) { t.category = TX_TYPES[cat] || cat; });
      allTx = allTx.concat(txs);
      console.log('    ' + cat + ': ' + txs.length + ' transactions');
    } catch(e) {
      console.log('    ' + cat + ': failed (' + e.message + ')');
    }
    await wait(2000);
  }

  if (!allTx.length) { console.log('    0 total transactions'); return 0; }

  // Insert (upsert-style: delete recent, re-insert)
  var dateStr = year + '-' + String(month).padStart(2, '0') + '-01';
  await del('transactions?transaction_date=gte.' + dateStr);

  var ic = 0;
  for (var i = 0; i < allTx.length; i++) {
    var t = allTx[i];
    var txDate = t.date || (year + '-' + String(month).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));
    // Try to parse date like "Mar 11" or "03/11"
    if (t.date) {
      var dm = t.date.match(/(\d{1,2})\/(\d{1,2})/);
      if (dm) txDate = year + '-' + dm[1].padStart(2, '0') + '-' + dm[2].padStart(2, '0');
      var named = t.date.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})/i);
      if (named) {
        var months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        txDate = year + '-' + (months[named[1].toLowerCase().substring(0, 3)] || '01') + '-' + named[2].padStart(2, '0');
      }
    }

    var row = {
      player_name: t.player || 'Unknown',
      type: t.category || t.type || 'other',
      details: t.desc.substring(0, 500),
      transaction_date: txDate,
    };

    var r = await api('transactions', 'POST', [row]);
    if (r && r.length) ic++;
  }

  console.log('    Inserted ' + ic + ' transactions');
  return ic;
}

// ═══ ESPN NFL NEWS SCRAPING ═══

async function scrapeNews(browser) {
  console.log('  Scraping ESPN NFL news...');
  
  try {
    var page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Fetch ESPN NFL RSS feed
    await page.goto('https://www.espn.com/espn/rss/nfl/news', { waitUntil: 'networkidle2', timeout: 30000 });
    
    var items = await page.evaluate(function() {
      var results = [];
      // RSS feeds render as XML - parse items
      var entries = document.querySelectorAll('item, entry');
      
      if (entries.length === 0) {
        // Might be rendered as HTML - try to find article links
        var text = document.body.innerText || '';
        var titleMatches = text.match(/<title>([^<]+)<\/title>/g) || [];
        titleMatches.forEach(function(m) {
          var t = m.replace(/<\/?title>/g, '').trim();
          if (t && t.length > 10 && !t.includes('ESPN')) {
            results.push({ title: t, link: '', date: new Date().toISOString() });
          }
        });
      } else {
        entries.forEach(function(item) {
          var title = item.querySelector('title');
          var link = item.querySelector('link');
          var pubDate = item.querySelector('pubDate, published, updated');
          if (title) {
            results.push({
              title: title.textContent.trim(),
              link: link ? link.textContent.trim() : '',
              date: pubDate ? pubDate.textContent.trim() : new Date().toISOString(),
            });
          }
        });
      }
      return results;
    });
    
    await page.close();
    
    if (items.length === 0) {
      // Fallback: try fetching as raw text
      var page2 = await browser.newPage();
      await page2.goto('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news', { waitUntil: 'networkidle2', timeout: 30000 });
      var apiData = await page2.evaluate(function() {
        try { return JSON.parse(document.body.innerText); } catch(e) { return null; }
      });
      await page2.close();
      
      if (apiData && apiData.articles) {
        items = apiData.articles.map(function(a) {
          return { title: a.headline, link: a.links && a.links.web ? a.links.web.href : '', date: a.published || new Date().toISOString() };
        });
      }
    }
    
    if (!items.length) { console.log('    0 articles found'); return 0; }
    console.log('    Found ' + items.length + ' articles');
    
    // Clear old news (keep last 7 days)
    var weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    await del('news?published_at=lt.' + weekAgo.toISOString());
    
    // Insert
    var ic = 0;
    for (var i = 0; i < Math.min(items.length, 30); i++) {
      var item = items[i];
      var cat = 'other';
      var titleLower = item.title.toLowerCase();
      if (titleLower.includes('trade') || titleLower.includes('traded')) cat = 'trade';
      else if (titleLower.includes('sign') || titleLower.includes('agree') || titleLower.includes('deal')) cat = 'signing';
      else if (titleLower.includes('release') || titleLower.includes('cut') || titleLower.includes('waive')) cat = 'cut';
      else if (titleLower.includes('restructure') || titleLower.includes('rework')) cat = 'restructure';
      else if (titleLower.includes('injur') || titleLower.includes('out for') || titleLower.includes('IR')) cat = 'injury';
      else if (titleLower.includes('draft') || titleLower.includes('pick') || titleLower.includes('mock')) cat = 'draft';
      
      var r = await api('news', 'POST', [{
        headline: item.title.substring(0, 500),
        category: cat,
        source: 'ESPN',
        source_url: item.link || null,
        is_breaking: i < 3,
        published_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      }]);
      if (r && r.length) ic++;
    }
    
    console.log('    Inserted ' + ic + ' news articles');
    return ic;
  } catch(e) {
    console.log('    News scraping failed: ' + e.message);
    return 0;
  }
}

// ═══ MAIN ═══

async function main() {
  console.log('');
  console.log('  GRIDLEDGER SPOTRAC SCRAPER');
  console.log('  =========================');

  var tr = await fetch(SUPA_URL + '/rest/v1/teams?select=id&limit=1', { headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY } });
  if (!tr.ok) { console.log('  KEY FAILED'); process.exit(1); }
  console.log('  DB OK');

  var args = process.argv.slice(2).map(function(a) { return a.toUpperCase(); });

  var faOnly = args.indexOf('FA') >= 0;
  var newsOnly = args.indexOf('NEWS') >= 0;
  var txOnly = args.indexOf('TX') >= 0;
  args = args.filter(function(a) { return a !== 'FA' && a !== 'NEWS' && a !== 'TX'; });

  var q = args.length > 0 ? TEAMS.filter(function(t) { return args.indexOf(t.id) >= 0; }) : ((faOnly || newsOnly || txOnly) ? [] : TEAMS);

  var puppeteer = require('puppeteer');
  var browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
  var tot = { p: 0, c: 0, pk: 0, ok: 0, fa: 0, tx: 0, news: 0 };

  // Team scraping
  if (q.length > 0) {
    console.log('  ' + q.length + ' team(s) (scraping cap + contracts pages)');
    console.log('');

    for (var i = 0; i < q.length; i++) {
      process.stdout.write('  [' + (i + 1) + '/' + q.length + '] ' + q[i].id.padEnd(4) + ' ');
      try {
        var r = await run(browser, q[i]);
        tot.p += r.p; tot.c += r.c; tot.pk += r.pk; tot.ok++;
        console.log(' OK');
      } catch(e) { console.log(' FAIL: ' + e.message); }
      if (i < q.length - 1) await wait(4000 + Math.floor(Math.random() * 2000));
    }
  }

  // Free agents
  if (faOnly || args.length === 0) {
    console.log('');
    tot.fa = await scrapeFreeAgents(browser);
  }

  // Transactions
  if (txOnly || args.length === 0) {
    console.log('');
    tot.tx = await scrapeTransactions(browser);
  }

  // News
  if (newsOnly || args.length === 0) {
    console.log('');
    tot.news = await scrapeNews(browser);
  }

  await browser.close();
  console.log('');
  var summary = '  DONE: ' + tot.ok + '/' + q.length + ' teams';
  if (tot.p) summary += ' | ' + tot.p + 'p ' + tot.c + 'c ' + tot.pk + 'pk';
  if (tot.fa) summary += ' | ' + tot.fa + ' FAs';
  if (tot.tx) summary += ' | ' + tot.tx + ' tx';
  if (tot.news) summary += ' | ' + tot.news + ' news';
  console.log(summary);
  console.log('');
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });
