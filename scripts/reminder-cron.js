// Runs daily via GitHub Actions. Checks inactive murid, sends WA reminder.
// Needs env: CF_API_KEY, CF_EMAIL, CF_ACCOUNT_ID, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
const https = require('https');
const crypto = require('crypto');
function req(opts, body) {
  return new Promise((res) => {
    const d = body ? JSON.stringify(body) : null;
    const r = https.request(opts, (s) => { let x=''; s.on('data',c=>x+=c); s.on('end',()=>res({st:s.statusCode,bo:x})); });
    if (d) r.write(d); r.end();
  });
}
async function main() {
  const acct = process.env.CF_ACCOUNT_ID;
  const DB = '4538586f-4436-46c3-a6b0-97d45f21b21e';
  const q = `SELECT u.id, u.name, u.wa_number, MAX(s.created_at) as last_setoran
    FROM users u LEFT JOIN setoran s ON s.user_id = u.id
    WHERE u.role = 'murid'
    GROUP BY u.id
    HAVING last_setoran IS NULL OR last_setoran < datetime('now','-2 days') LIMIT 100`;
  const r = await req({hostname:'api.cloudflare.com',path:'/client/v4/accounts/'+acct+'/d1/database/'+DB+'/query',method:'POST',headers:{'X-Auth-Email':process.env.CF_EMAIL,'X-Auth-Key':process.env.CF_API_KEY,'Content-Type':'application/json'}},{sql:q});
  const rows = JSON.parse(r.bo).result[0].results;
  console.log('Inactive murid:', rows.length);
  for (const row of rows) {
    if (!row.wa_number) continue;
    const msg = '📖 Assalamu\'alaikum '+row.name+', yuk setor tahsin hari ini! Konsistensi kunci kemajuan.';
    const wr = await req({hostname:'graph.facebook.com',path:'/v19.0/'+process.env.WHATSAPP_PHONE_ID+'/messages',method:'POST',headers:{'Authorization':'Bearer '+process.env.WHATSAPP_TOKEN,'Content-Type':'application/json'}},{messaging_product:'whatsapp',to:row.wa_number,type:'text',text:{body:msg}});
    console.log(row.name, wr.st);
  }
}
main();
