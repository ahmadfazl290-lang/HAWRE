const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'Asia/Baghdad'});
  const page = await context.newPage();
  const errors = []; page.on('pageerror',e => { errors.push(e.message); console.error('BROWSER ERROR:',e.message); });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.screenshot({path:path.resolve('outputs/study-platform-preview.png'),fullPage:true});
  await page.getByRole('button',{name:'خۆناسین',exact:true}).click();
  const next = page.getByRole('button',{name:'دواتر ➡️',exact:true});
  assert.equal(await next.isDisabled(),true);
  const { questions } = await import('../outputs/study-platform/src/data/questions.js');
  for (let step = 0; step < 4; step++) {
    for (const q of questions.filter(q => q.section === step)) {
      if (q.type === 'select') await page.getByRole('combobox',{name:q.text}).selectOption(q.options[0]);
      else if (q.type.startsWith('textarea')) await page.getByRole('textbox',{name:q.text,exact:true}).fill('وەڵامی قوتابی بۆ تاقیکردنەوە');
      else { await page.getByRole('button',{name:q.options[0],exact:true}).click(); if (q.type === 'radio-text') { assert.equal(await next.isDisabled(),true); await page.getByRole('textbox',{name:q.placeholder,exact:true}).fill('بیرکاری'); } }
    }
    assert.equal(await next.isDisabled(),false);
    if (step === 1) { await page.reload({waitUntil:'networkidle'}); await page.getByRole('button',{name:'خۆناسین',exact:true}).click(); assert.equal(await next.isDisabled(),false); }
    await next.click();
  }
  await page.getByRole('textbox',{name:'ناوی قوتابی (ئیختیاری)',exact:true}).fill('تاقیکردنەوەی قوتابی');
  await page.getByRole('button',{name:'🔗 هاوبەشکردن',exact:true}).click();
  assert.equal(await page.getByRole('checkbox',{name:'ناوی قوتابی زیاد بکە'}).isChecked(),false);
  assert.equal(await page.getByRole('checkbox',{name:'وەڵام و تێبینییە کەسییەکان زیاد بکە'}).isChecked(),false);
  assert.equal((await page.locator('.share-preview').innerText()).includes('تاقیکردنەوەی قوتابی'),false);
  await page.getByRole('button',{name:'داخستن',exact:true}).click();
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.sidebar').isVisible(),false);
  assert.equal(await page.locator('.print-only').isVisible(),true);
  await page.screenshot({path:path.resolve('work/print-check.png'),fullPage:true});
  await page.pdf({path:path.resolve('work/report-check.pdf'),format:'A4',printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.locator('.sidebar').getByRole('button',{name:/^پلانی من/}).click();
  await page.getByRole('textbox',{name:'وانەی سەرەکی',exact:true}).fill('بیرکاری');
  await page.getByRole('button',{name:'پلانی من ئامادە بکە',exact:true}).click();
  assert.equal(await page.locator('.plan-day').count(),7);
  const task = page.locator('.plan-day').first().getByRole('checkbox').first(); await task.check();
  await page.getByRole('radio',{name:/قورس بوو/}).check();
  await page.getByRole('button',{name:'بەدواداچوونەکەم تۆمار بکە',exact:true}).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('hawre-study-platform:v2')));
  await page.reload({waitUntil:'networkidle'});
  await page.screenshot({path:path.resolve('work/reload-check.png'),fullPage:true});
  await page.locator('.sidebar').getByRole('button',{name:/^پلانی من/}).click();
  assert.equal(await page.locator('.plan-day').first().getByRole('checkbox').first().isChecked(),true);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('hawre-study-platform:v2')));
  assert.deepEqual(after.plan.adjustedDates,before.plan.adjustedDates);
  await page.getByRole('button',{name:'ئامرازەکان',exact:true}).click();
  await page.screenshot({path:path.resolve('work/tools-check.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'سەرەتا',exact:true}).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  await page.screenshot({path:path.resolve('work/mobile-check.png'),fullPage:true});
  // The production service worker must have cached an operational shell.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload({waitUntil:'networkidle'});
  await page.locator('.sidebar').getByRole('button',{name:/^پلانی من/}).click();
  assert.equal(await page.locator('.plan-day').count(),7);
  await context.setOffline(false);
  assert.deepEqual(errors,[]);
  console.log('PASS: browser assessment/conditional validation, refresh, share privacy, printable name, PDF generation, plan completion & hard-check-in persistence, mobile overflow, offline reload, no runtime errors.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
