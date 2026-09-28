export const REF = 'snywuosknlaewkynrtdc';
export const SUPA = `https://${REF}.supabase.co`;
export const CLUB = '11111111-1111-1111-1111-111111111111';
export const USER = '22222222-2222-2222-2222-222222222222';
export const USUARIO = { id: USER, email: 'e@e.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated' };
export const j = (b = []) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

const NOMBRES = ['Ainhoa Ribas','Lucía Ferrer','Marta Colom','Nerea Vidal','Carla Pons','Julia Mestre',
  'Emma Riera','Alba Serra','Irene Bonet','Laia Munar','Noa Cerdà','Paula Amengual','Sara Tomàs',
  'Clara Adrover','Aina Sastre','Berta Llull'];
const POS = ['Portera','Central','Lateral derecha','Pivote','Delantera','Lateral izquierda','Interior',
  'Extremo derecha','Central','Mediapunta','Extremo izquierda','Interior','Portera','Central','Delantera','Pivote'];

export const PLAYERS = NOMBRES.map((name, i) => ({
  id: `p${i}`, team_id: 't1', name, number: i + 1, position: POS[i % POS.length],
  birth_date: `2010-0${(i % 9) + 1}-1${i % 9}`, short_name: null, secondary_position: null,
  availability_status: i === 3 ? 'lesionada' : i === 7 ? 'duda' : 'disponible',
  availability_note: null, availability_since: null, availability_until: null,
  foot: i % 3 === 0 ? 'Zurda' : 'Diestra', photo_url: null, guardians: [], archived_at: null,
  stats: { matches: 6, minutes: 380, goals: i % 5, assists: i % 3, yellow: 0, red: 0 },
  notes: '', joined_at: '2026-07-01', created_by: USER, phone: null, email: null,
}));

const bloques = n => Array.from({ length: n }, (_, i) => ({
  id: `b${i}`, title: ['Activación','Parte principal','Competición','Vuelta a la calma'][i] ?? `Bloque ${i+1}`,
  minutes: [15,35,25,10][i] ?? 15, drillId: null, notes: '' }));

export const TEAMS = [
  { id:'t1', club_id:CLUB, name:'Cadete A', category:'Cadete', season:'2026/27',
    competition:'Liga Autonómica', venue:'Campo Municipal', training_slots:[], created_by:USER },
  { id:'t2', club_id:CLUB, name:'Juvenil B', category:'Juvenil', season:'2026/27',
    competition:'Liga Nacional', venue:'Campo Municipal', training_slots:[], created_by:USER },
];
export const SESSIONS = [
  { id:'s1', team_id:'t1', date:d(1), start_time:'18:30', duration:90, title:'Presión tras pérdida',
    objective:'Reaccionar en los tres segundos siguientes a perder el balón', venue:'Campo Municipal',
    expected_players:16, blocks:bloques(4), status:'planificado', material:['Conos'], created_by:USER },
];
export const MATCHES = [
  { id:'m1', team_id:'t1', date:d(2), start_time:'11:00', opponent:'CE Andratx', home:true,
    status:'programado', venue:'Campo Municipal', competition:'Liga Autonómica', created_by:USER },
];
export const ATTENDANCE = [-2,-7,-9].map((n,k) => ({ id:`a${k}`, team_id:'t1', date:d(n), session_id:null,
  created_by:USER, marks:Object.fromEntries(PLAYERS.map((p,i)=>[p.id,{ mark:(i+k)%11===0?'ausente':(i+k)%7===0?'justificada':'presente', note:'' }])) }));
export const DRILLS = [
  { id:'d1', name:'Rondo 5v2 con apoyo', objective:'Circulación rápida', duration:12, tags:['posesión'],
    players_range:'7', material:['Conos'], description:'', created_by:USER },
];
export const PERFIL = { id:USER, full_name:'Marta Vives', role:'coordinadora', email:'e@e.test', licence:'UEFA B', phone:null };
export const CLUB_ROW = { role:'admin', clubs:{ id:CLUB, name:'Club Esportiu Exemple', short_name:'CE Exemple', city:'Palma', season:'2026/27', crest_url:null } };
export const PLANES = [
  { tier:'free', name:'Gratis', max_teams:1, currency:'eur', trial_days:0, price_monthly:null, price_yearly:null, stripe_price_monthly:null, stripe_price_yearly:null },
  { tier:'pro', name:'Pro', max_teams:5, currency:'eur', trial_days:7, price_monthly:null, price_yearly:null, stripe_price_monthly:null, stripe_price_yearly:null },
  { tier:'max', name:'Max', max_teams:null, currency:'eur', trial_days:7, price_monthly:null, price_yearly:null, stripe_price_monthly:null, stripe_price_yearly:null },
];

export async function mock(page, o = {}) {
  const { equipos = TEAMS, sub = null, planes = PLANES, club = CLUB_ROW, players = PLAYERS } = o;
  await page.route(`${SUPA}/**`, async route => {
    const u = new URL(route.request().url()); const p = u.pathname;
    if (p.startsWith('/auth/v1/user')) return route.fulfill(j(USUARIO));
    if (p.startsWith('/auth/v1/token')) return route.fulfill(j({ access_token:'x', token_type:'bearer', expires_in:3600, refresh_token:'x', user:USUARIO }));
    if (p === '/rest/v1/profiles') return route.fulfill(j(u.searchParams.has('id') ? PERFIL : [PERFIL]));
    if (p === '/rest/v1/club_members') return route.fulfill(j(club));
    if (p === '/rest/v1/teams') return route.fulfill(j(equipos));
    if (p === '/rest/v1/plans') return route.fulfill(j(planes));
    if (p === '/rest/v1/subscriptions') return route.fulfill(j(sub));
    if (p === '/rest/v1/players') return route.fulfill(j(players));
    if (p === '/rest/v1/sessions') return route.fulfill(j(SESSIONS));
    if (p === '/rest/v1/matches') return route.fulfill(j(MATCHES));
    if (p === '/rest/v1/attendance') return route.fulfill(j(ATTENDANCE));
    if (p === '/rest/v1/drills') return route.fulfill(j(DRILLS));
    if (p === '/rest/v1/team_staff') return route.fulfill(j([{ team_id:'t1', profile_id:USER, role:'coordinadora' }]));
    return route.fulfill(j([]));
  });
  await page.addInitScript(([ref,u]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token:'x', token_type:'bearer', refresh_token:'x', expires_in:3600,
    expires_at: Math.floor(Date.now()/1000)+3600, user:u })), [REF, USUARIO]);
}
