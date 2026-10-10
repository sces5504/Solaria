/* PLAYWRIGHT_MODULE may point to a bundled Playwright installation. */
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1060}});
 await context.addInitScript(()=>{window.__SOLARIA_TEST__={}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const external=[];page.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('data:'))external.push(r.url())});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 const output=process.env.SOLARIA_SCREENSHOT_DIR||path.resolve(__dirname,'../artifacts');fs.mkdirSync(output,{recursive:true});
 await page.screenshot({path:path.join(output,'menu.png'),fullPage:true});
 assert.equal(await page.locator('[data-class]').count(),3);
 for(const cls of['sword','bow','mage']){
  await page.evaluate(cls=>window.__SOLARIA_TEST__.startRun(cls,73),cls);
  assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.mode),'playing');
  await page.mouse.move(650,410);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  await page.keyboard.press('i');assert(await page.locator('.inventory-modal').isVisible());
  const paused=await page.evaluate(()=>window.__SOLARIA_TEST__.game.time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.time),paused);
  await page.keyboard.press('i');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.mode),'paused');
  await page.getByRole('button',{name:'繼續探索'}).click();
  await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;t.game.xp=100;t.checkLevel()});
  assert.equal(await page.locator('[data-upgrade]').count(),3);await page.locator('[data-upgrade]').first().click();
  await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;t.game.xp=0;t.game.player.invuln=0;t.damage(t.game.player,10000)});
  assert(await page.getByRole('button',{name:'再次啟程'}).isVisible());await page.getByRole('button',{name:'再次啟程'}).click();
  assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.level),1);
 }
 // Real DOM inventory swap, full-bag pickup and abandon flows.
 await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;t.startRun('mage',42);t.game.bag=[t.createItem('tidal'),t.createItem('storm'),t.createItem('guard')];t.showInventory()});
 await page.locator('[data-bag="0"]').click();await page.getByRole('button',{name:'裝備／替換'}).click();assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.equipment.amulet.id),'tidal');
 await page.locator('[data-bag="0"]').click();await page.getByRole('button',{name:'裝備／替換'}).click();assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.equipment.amulet.id),'storm');
 await page.screenshot({path:path.join(output,'inventory.png'),fullPage:true});
 await page.getByRole('button',{name:'返回 [ I ]',exact:true}).click();
 await page.evaluate(()=>{const t=window.__SOLARIA_TEST__,g=t.game;g.bag=Array.from({length:12},()=>t.createItem('guard'));g.loot=[{x:g.player.x,y:g.player.y,type:'gear',value:t.createItem('ember')}];t.interact()});
 await page.locator('[data-bag="0"]').click();await page.getByRole('button',{name:'以此裝備換取新裝備'}).click();assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.bag.length),12);assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.bag[0].id),'ember');
 await page.keyboard.press('i');
 // Capture an upgraded boss fight and its telegraphs.
 await page.evaluate(()=>{const t=window.__SOLARIA_TEST__,g=t.game;g.room=5;t.generateRoom();g.upgrades={water:1,lightning:2,orbit:2,homing:1};g.bag=[t.createItem('tidal'),t.createItem('guard')];t.equipItem(0);t.equipItem(0);g.player.x=410;g.player.y=350;g.player.invuln=20;t.steam(650,280)});
 await page.waitForTimeout(1300);await page.screenshot({path:path.join(output,'boss.png'),fullPage:true});
 await page.keyboard.press('i');await page.getByRole('button',{name:'返回 [ I ]',exact:true}).click();
 await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;t.game.xp=0;t.game.enemies.forEach(e=>t.damage(e,10000,t.game.player));t.scoreRoom();t.game.player.x=t.game.exit.x;t.game.player.y=t.game.exit.y;t.interact()});
 assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.game.room),6);
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'))});assert.equal(await page.evaluate(()=>window.__SOLARIA_TEST__.mode),'paused');
 await page.getByRole('button',{name:'繼續探索'}).click();
 await page.evaluate(()=>{const t=window.__SOLARIA_TEST__;t.game.score=12345;t.endRun()});await page.reload();assert((await page.locator('#coinLabel').textContent()).includes('12345'));
 await page.getByRole('button',{name:'元素指南 ?'}).click();assert(await page.getByRole('button',{name:'了解，返回'}).isVisible());await page.getByRole('button',{name:'了解，返回'}).click();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('Browser checks passed: 3 classes, combat inputs, upgrade, inventory, full bag, boss progression, death/retry, focus pause, saved best, offline requests.');
 console.log('Screenshots:',output);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
