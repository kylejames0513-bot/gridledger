import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

async function supaFetch(path, method, body) {
  const opts = { method, headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (method === 'DELETE') return null;
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function parseDollar(text) {
  if (!text) return 0;
  text = text.trim();
  if (text === '-' || text === '' || text === '$-') return 0;
  const isNeg = text.includes('(') || (text.startsWith('-') && text.includes('$'));
  const clean = text.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  return isNeg ? -parseFloat(clean) : parseFloat(clean);
}

function toM(raw) {
  if (!raw) return 0;
  const n = Math.abs(raw);
  const sign = raw < 0 ? -1 : 1;
  if (n > 50000) return Math.round((n / 1000000) * 100) / 100 * sign;
  return Math.round(raw * 100) / 100;
}

const TEAM_SLUGS = {
  'cardinals':'ARI','falcons':'ATL','ravens':'BAL','bills':'BUF','panthers':'CAR',
  'bears':'CHI','bengals':'CIN','browns':'CLE','cowboys':'DAL','broncos':'DEN',
  'lions':'DET','packers':'GB','texans':'HOU','colts':'IND','jaguars':'JAX',
  'chiefs':'KC','chargers':'LAC','rams':'LAR','raiders':'LV','dolphins':'MIA',
  'vikings':'MIN','patriots':'NE','saints':'NO','giants':'NYG','jets':'NYJ',
  'eagles':'PHI','steelers':'PIT','seahawks':'SEA','49ers':'SF','buccaneers':'TB',
  'titans':'TEN','commanders':'WAS',
};

// ─── SYNC CAP SPACE (OTC summary — one request, all 32 teams) ───
async function syncCapSpace() {
  const res = await fetch('https://overthecap.com/salary-cap-space', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  let updated = 0;

  $('table').first().find('tbody tr').each(function() {
    const cells = $(this).find('td');
    if (cells.length < 5) return;
    const name = $(cells[0]).find('a').text().trim().toLowerCase();
    const href = $(cells[0]).find('a').attr('href') || '';

    let teamId = null;
    Object.entries(TEAM_SLUGS).forEach(([slug, id]) => {
      if (name.includes(slug) || href.includes(slug)) teamId = id;
    });
    if (!teamId) return;

    const capSpace = parseDollar($(cells[1]).text());
    const activeCap = parseDollar($(cells[4]).text());
    const deadMoney = parseDollar($(cells[5]).text());
    const capUsed = toM(activeCap + deadMoney);
    const adjustedCap = toM(activeCap + deadMoney + capSpace);

    supaFetch(`teams?id=eq.${teamId}`, 'PATCH', {
      cap_total: adjustedCap > 200 ? adjustedCap : 301.2,
      cap_used: capUsed,
      cap_space: toM(capSpace),
      dead_money: toM(deadMoney),
    });
    updated++;
  });
  return updated;
}

// ─── SYNC NEWS (ESPN RSS + NFL.com RSS) ───
async function syncNews() {
  const items = [];
  const clean = s => (s || '').replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim();

  function categorize(text) {
    const t = text.toLowerCase();
    if (/trade[sd]?|traded|swap|acquir/i.test(t)) return 'trade';
    if (/sign[sed]?|agree|contract|free.?agent/i.test(t)) return 'signing';
    if (/cut|release[sd]?|waive[sd]?|terminat/i.test(t)) return 'cut';
    if (/restructur|extend|extension/i.test(t)) return 'restructure';
    if (/injur|ir |reserve|out for/i.test(t)) return 'injury';
    if (/draft|pick|combine|mock/i.test(t)) return 'draft';
    return 'other';
  }

  // ESPN
  try {
    const res = await fetch('https://www.espn.com/espn/rss/nfl/news', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    $('item').each(function() {
      const title = clean($(this).find('title').text());
      const link = clean($(this).find('link').text());
      const desc = clean($(this).find('description').text()).substring(0, 300);
      const pubDate = $(this).find('pubDate').text().trim();
      if (title.length > 15) items.push({ title, link, desc, pubDate, source: 'ESPN', cat: categorize(title + ' ' + desc) });
    });
  } catch(e) {}

  // NFL.com
  try {
    const res2 = await fetch('https://www.nfl.com/feeds-rs/headlines.rss', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml2 = await res2.text();
    const $n = cheerio.load(xml2, { xmlMode: true });
    $n('item').each(function() {
      const title = clean($n(this).find('title').text());
      const link = clean($n(this).find('link').text());
      const desc = clean($n(this).find('description').text()).substring(0, 300);
      const pubDate = $n(this).find('pubDate').text().trim();
      const isDupe = items.some(x => x.title.toLowerCase().substring(0, 40) === title.toLowerCase().substring(0, 40));
      if (title.length > 15 && !isDupe) items.push({ title, link, desc, pubDate, source: 'NFL.com', cat: categorize(title + ' ' + desc) });
    });
  } catch(e) {}

  let inserted = 0;
  for (const item of items.slice(0, 30)) {
    let pubISO;
    try { pubISO = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(); }
    catch(e) { pubISO = new Date().toISOString(); }
    const r = await supaFetch('news', 'POST', [{
      headline: item.title,
      body: item.desc || item.title,
      source: item.source,
      source_url: item.link,
      category: item.cat,
      published_at: pubISO,
    }]);
    if (r?.length) inserted++;
  }
  return inserted;
}

// ─── SYNC TRANSACTIONS (NFL.com) ───
async function syncTransactions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const types = ['trades', 'signings', 'waivers', 'terminations'];
  const typeMap = { trades: 'trade', signings: 'signing', waivers: 'waiver', terminations: 'release' };
  let inserted = 0;

  for (const type of types) {
    try {
      const url = `https://www.nfl.com/transactions/league/${type}/${year}/${month}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);

      $('tbody tr').each(function() {
        const cells = $(this).find('td');
        if (cells.length < 3) return;
        const date = $(cells[0]).text().trim();
        const detail = [];
        cells.each(function(idx) { if (idx >= 1) detail.push($(this).text().trim()); });
        const detailStr = detail.join(' ').substring(0, 300);
        if (detailStr.length < 10) return;

        const today = `${year}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
        let txDate = today;
        const m = date.match(/([A-Za-z]+)\.?\s+(\d{1,2})/i);
        if (m) { const mk = m[1].toLowerCase().substring(0,3); txDate = `${year}-${months[mk]||'01'}-${String(parseInt(m[2])).padStart(2,'0')}`; }

        supaFetch('transactions', 'POST', [{
          player_name: detailStr.substring(0, 100),
          type: typeMap[type] || 'other',
          details: detailStr,
          transaction_date: txDate,
          source_url: 'https://www.nfl.com/transactions',
        }]);
        inserted++;
      });
    } catch(e) { /* skip failed type */ }
  }
  return inserted;
}

// ─── API HANDLER ───
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!SUPA_URL || !SUPA_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const results = { cap: 0, news: 0, tx: 0, errors: [] };

  try {
    results.cap = await syncCapSpace();
  } catch(e) { results.errors.push('Cap: ' + e.message); }

  try {
    results.news = await syncNews();
  } catch(e) { results.errors.push('News: ' + e.message); }

  try {
    results.tx = await syncTransactions();
  } catch(e) { results.errors.push('TX: ' + e.message); }

  return NextResponse.json({ success: true, synced_at: new Date().toISOString(), results });
}

export const maxDuration = 60; // Allow up to 60s for Vercel Pro
