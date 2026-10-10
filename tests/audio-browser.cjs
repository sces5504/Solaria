const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1060}});await context.addInitScript(()=>window.__SOLARIA_TEST__={});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SOLARIA_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.getByRole('button',{name:'啟程探索　→',exact:true}).click();
  await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio?.state==='running');
  assert.equal(await page.locator('#muteButton').textContent(),'音效 開');
  // Analyse the actual master bus signal, not just the UI or oscillator calls.
  const signal=await page.evaluate(async()=>{
   const t=window.__SOLARIA_TEST__,analyser=t.audio.createAnalyser();analyser.fftSize=512;t.audioBus.connect(analyser);
   t.game.player.invuln=100;t.sound('upgrade');await new Promise(r=>setTimeout(r,35));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);analyser.disconnect();t.audioBus.disconnect(analyser);
   return Math.max(...data.map(Math.abs));
  });assert(signal>.005,'Enabled audio must generate a measurable master-bus signal');console.log('PASS real audio signal peak:',signal.toFixed(4));
  await page.locator('#muteButton').click();assert(await page.evaluate(()=>window.__SOLARIA_TEST__.muted));
  const muted=await page.evaluate(()=>{const t=window.__SOLARIA_TEST__,before=t.activeVoices;t.sound('attack');return {before,after:t.activeVoices,gain:t.audioBus.gain.value}});assert.equal(muted.after,muted.before);assert.equal(muted.gain,0);
  // Unmute must actively resume suspended audio, with an audible confirmation.
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.suspend());
  await page.locator('#muteButton').click();await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running'&&!window.__SOLARIA_TEST__.muted);
  assert((await page.evaluate(()=>window.__SOLARIA_TEST__.audioBus.gain.value))>.6);console.log('PASS unmute resumes suspended audio');
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.suspend());await page.waitForFunction(()=>document.getElementById('muteButton').textContent==='音效 待啟用');
  await page.locator('#muteButton').click();await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');assert(!(await page.evaluate(()=>window.__SOLARIA_TEST__.muted)));console.log('PASS pending audio button retries activation');
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.suspend());await page.keyboard.press('d');await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS keyboard input restores suspended audio');
  const rejected=await page.evaluate(async()=>{const t=window.__SOLARIA_TEST__;await t.audio.suspend();window.__resumeAudio=t.audio.resume.bind(t.audio);t.audio.resume=()=>Promise.reject(new Error('Simulated activation rejection'));return t.initAudio()});assert.equal(rejected,false);assert.equal(await page.locator('#muteButton').textContent(),'音效 待啟用');await page.evaluate(()=>window.__SOLARIA_TEST__.audio.resume=window.__resumeAudio);await page.locator('#muteButton').click();await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS rejected activation stays playable and can retry');
  await page.evaluate(async()=>{const t=window.__SOLARIA_TEST__;await t.audio.suspend();const resume=t.audio.resume.bind(t.audio);let first=true;t.audio.resume=()=>{if(first){first=false;return new Promise(()=>{})}return resume()};t.initAudio()});await page.locator('#muteButton').click();await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS pending activation cannot prevent a new gesture from retrying');
  await page.evaluate(()=>{window.dispatchEvent(new Event('blur'))});assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.mode),'paused');
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.suspend());await page.getByRole('button',{name:'繼續探索'}).click();await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS resume button restores audio');
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.suspend());await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS focus restoration resumes audio');
  await page.evaluate(()=>window.__SOLARIA_TEST__.audio.close());await page.keyboard.press('d');await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio.state==='running');console.log('PASS closed audio context is recreated');
  await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;for(let i=0;i<100;i++)t.sound('attack')});assert((await page.evaluate(()=>window.__SOLARIA_TEST__.activeVoices))<=16);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.activeVoices),0);console.log('PASS sound bursts capped and nodes released');
  await page.keyboard.press('m');assert.equal(await page.locator('#muteButton').textContent(),'音效 關');await page.reload();assert.equal(await page.locator('#muteButton').textContent(),'音效 關');
  await page.getByRole('button',{name:'啟程探索　→',exact:true}).click();assert(await page.evaluate(()=>window.__SOLARIA_TEST__.audio===null));await page.keyboard.press('m');await page.waitForFunction(()=>window.__SOLARIA_TEST__.audio?.state==='running'&&!window.__SOLARIA_TEST__.muted);console.log('PASS saved mute respected; M unlocks audio after reload');
  assert.deepEqual(errors,[]);console.log('Audio browser checks passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
