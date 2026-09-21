import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

// Test-only local server: browser and server share one process session.
export async function browserHarness({root = path.resolve('dist'), viewport = {width:1440,height:1000}, exposeApp = false} = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + path.sep)) throw new Error('outside root');
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      response.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}), args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
    const context = await browser.newContext({viewport, acceptDownloads:true});
    await context.addInitScript(() => {
      // Exercise the real upload/download fallback with the browser's File/Blob APIs.
      window.showOpenFilePicker = undefined;
      window.showSaveFilePicker = undefined;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (exposeApp) await page.route('**/js/main.js', route => route.fulfill({contentType:'application/javascript',body:`import {EditorApp} from './App.js';window.testApp=new EditorApp(document.querySelector('#app'));window.testApp.mount();`}));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.waitForSelector('.editor-shell');
    return {page, browser, context, errors, url, close:async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));}};
  } catch(error) {await browser?.close();await new Promise(resolve=>server.close(resolve));throw error;}
}

export async function downloadFrom(page, selector, destination) {
  const received = page.waitForEvent('download');
  await page.locator(selector).first().click();
  const download = await received;
  if (destination) await download.saveAs(destination);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function openProjectFrom(page, file) {
  const choosing = page.waitForEvent('filechooser');
  await page.locator('[data-action="open-project"]').click();
  await (await choosing).setFiles(file);
}

export async function imagePixels(page, bytes) {
  return page.evaluate(async base64 => {
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rgba))).map(b=>b.toString(16).padStart(2,'0')).join('');
    return {width:canvas.width,height:canvas.height,hash};
  },bytes.toString('base64'));
}
