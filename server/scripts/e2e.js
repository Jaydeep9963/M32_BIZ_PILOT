/* Simple E2E smoke test against a running server on localhost:4000 */
const BASE = process.env.BASE_URL || 'http://localhost:4000/api';

async function jfetch(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { res, text, json };
}

function randomEmail() {
  return `tester_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

(async () => {
  const summary = [];
  try {
    // Health
    try {
      const h = await fetch(BASE.replace(/\/api$/, '') + '/health');
      summary.push(`health:${h.ok}`);
      if (!h.ok) throw new Error('Health check failed');
    } catch (e) {
      summary.push('health:false');
      throw e;
    }

    // Signup
    const email = randomEmail();
    const password = 'Passw0rd1';
    let r = await jfetch('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Tester', email, password }) });
    console.log('Signup status:', r.res.status);
    if (!r.res.ok) throw new Error('Signup failed: ' + r.text);
    const token = r.json?.token || '';
    summary.push('signup:true');
    summary.push('token:' + (token ? 'yes' : 'no'));

    // Me
    r = await jfetch('/me', { headers: { Authorization: 'Bearer ' + token } });
    console.log('Me status:', r.res.status);
    if (!r.res.ok) throw new Error('Me failed: ' + r.text);
    summary.push('me:true');

    // Chat: set name
    r = await jfetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ message: 'My name is David.' }) });
    console.log('Chat1 status:', r.res.status);
    if (!r.res.ok) throw new Error('Chat1 failed: ' + r.text);
    const chatId = r.json?.chatId || '';
    summary.push('chat1:true');

    // Chat: recall name
    r = await jfetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ chatId, message: 'What is my name?' }) });
    console.log('Chat2 status:', r.res.status);
    if (!r.res.ok) throw new Error('Chat2 failed: ' + r.text);
    const msgs = r.json?.messages || [];
    const last = msgs[msgs.length - 1] || {};
    const recalled = /david/i.test(String(last.content || ''));
    summary.push('recall:' + (recalled ? 'true' : 'false'));

    // Research with citations (may depend on Tavily key)
    r = await jfetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ chatId, message: 'Summarize latest news on small business grants in California. Cite sources.' }) });
    console.log('Chat3 status:', r.res.status);
    const tr = (r.json?.toolResults) || [];
    summary.push('citations:' + (tr.length > 0 ? 'true' : 'false'));

    // Create task
    r = await jfetch('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ title: 'Prepare invoice for Acme', description: 'Due Friday EOD' }) });
    console.log('Task status:', r.res.status);
    summary.push('taskCreate:' + (r.res.ok ? 'true' : 'false'));

    // List tasks
    r = await jfetch('/tasks', { headers: { Authorization: 'Bearer ' + token } });
    const tasksLen = Array.isArray(r.json?.tasks) ? r.json.tasks.length : 0;
    summary.push('tasksLen:' + tasksLen);

    // Chats list
    r = await jfetch('/chats', { headers: { Authorization: 'Bearer ' + token } });
    const chatsLen = Array.isArray(r.json?.chats) ? r.json.chats.length : 0;
    summary.push('chatsLen:' + chatsLen);

    console.log('E2E summary:', summary.join(', '));
    process.exit(0);
  } catch (e) {
    console.error('E2E failed:', e?.message || e);
    console.log('E2E summary:', summary.join(', '));
    process.exit(1);
  }
})();


