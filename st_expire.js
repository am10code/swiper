const { chromium } = require('playwright');
const path = require('path');
const stub = () => {
  const store = {};
  window.chrome = { storage: { local: {
      get: (k,cb)=>{let r={}; if(k==null)r={...store}; else if(typeof k==='string'){if(k in store)r[k]=store[k];} else if(Array.isArray(k))k.forEach(x=>{if(x in store)r[x]=store[x];}); else for(const x in k)r[x]=(x in store)?store[x]:k[x]; if(cb)cb(r); return Promise.resolve(r);},
      set:(o,cb)=>{Object.assign(store,o); if(cb)cb(); return Promise.resolve();},
      remove:(k,cb)=>{(Array.isArray(k)?k:[k]).forEach(x=>delete store[x]); if(cb)cb(); return Promise.resolve();}
    }, onChanged:{addListener:()=>{}} },
    runtime:{getURL:p=>location.origin+'/'+p,sendMessage:()=>Promise.resolve(),onMessage:{addListener:()=>{}},lastError:null},
    alarms:{create:()=>{},clear:()=>{},clearAll:()=>{},onAlarm:{addListener:()=>{}}},
    notifications:{create:()=>{},onClicked:{addListener:()=>{}}},
    tabs:{create:()=>{},query:(q,cb)=>cb&&cb([])} };
};
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1123, height: 900 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.clock.install();
  await page.addInitScript(stub);
  await page.goto('file://' + path.resolve('/sessions/friendly-serene-babbage/mnt/swiper/main.html'));
  await page.clock.runFor(1000);
  await page.evaluate(async () => {
    const s = window.storage;
    const t = await s.addTask({ text: 'Экспайр-тест', deadline: new Date().toISOString().split('T')[0] });
    await s.updateTask(t.id, { status: 'ready' });
    await s.updateNextSteps(t.id, [{id:'e', text:'Быстрый шаг', completed:false, order:0, size:5, kind:'do'}]);
    await window.loadTasks(); window.renderActiveTasks();
  });
  await page.evaluate(() => window.switchSection('micro-slots'));
  await page.clock.runFor(500);
  await page.click('#microSlotToggleBtn');
  await page.clock.runFor(2 * 60 * 1000); // 2 минуты
  await page.click('.micro-slot-card.active .workflow-action-btn.primary'); // выполнить: ~2м
  await page.clock.runFor(1000);
  const midProgress = await page.evaluate(() => document.getElementById('microSlotProgress').textContent);
  // прокручиваем до истечения (15м всего)
  await page.clock.runFor(14 * 60 * 1000);
  const expired = await page.evaluate(() => ({
    summary: document.getElementById('microSlotSummary').style.display,
    title: document.getElementById('microSlotSummaryTitle').textContent,
    extendVisible: document.getElementById('microSlotExtendBtn').style.display,
    barTime: document.getElementById('microSlotTime').textContent
  }));
  console.log('midProgress:', midProgress);
  console.log('EXPIRED:', JSON.stringify(expired, null, 2));
  // +5 минут
  await page.click('#microSlotExtendBtn');
  await page.clock.runFor(2000);
  const extended = await page.evaluate(() => ({
    summaryHidden: document.getElementById('microSlotSummary').style.display,
    barTime: document.getElementById('microSlotTime').textContent,
    running: document.getElementById('microSlotToggleBtn').textContent
  }));
  console.log('EXTENDED:', JSON.stringify(extended));
  const t = await page.evaluate(async () => (await window.storage.getTasks())[0]);
  console.log('task time:', t.totalTime, 'sessions:', t.pomodoroSessions.map(s=>({t:s.type, sec:s.durationSeconds})));
  await browser.close();
})();
