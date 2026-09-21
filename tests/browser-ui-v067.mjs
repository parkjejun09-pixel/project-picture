import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserHarness, downloadFrom} from './browserHarness.mjs';

const out = path.resolve(process.env.V067_UI_EVIDENCE_DIR || 'test-results/v067-ui');
await mkdir(out, {recursive:true});
const h = await browserHarness({exposeApp:true, viewport:{width:1440,height:1000}});
const {page} = h;
const checks=[];
const checked=(label)=>{checks.push(label);console.log(`PASS ${label}`);};

async function canvasFingerprint() {
  return page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    const size=window.testApp.drawingCanvas.canvasSize;canvas.width=size.width;canvas.height=size.height;
    window.testApp.drawingCanvas.copyCompositeTo(canvas);
    return canvas.toDataURL();
  });
}

async function fixture(mimeType, name, width=3, height=2) {
  const base64=await page.evaluate(async({type,width,height})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.fillStyle='#ef3340';context.fillRect(0,0,2,2);context.fillStyle='#14b8a6';context.fillRect(2,0,1,2);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.9));
    if(!blob)throw new Error(`Canvas did not encode ${type}`);
    const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);
  },{type:mimeType,width,height});
  return {name,mimeType,buffer:Buffer.from(base64,'base64')};
}

async function importMaterial(action, file) {
  const before=await page.locator('.layer-row').count();
  const choosing=page.waitForEvent('filechooser');
  await page.locator(action).click();
  await (await choosing).setFiles(file);
  await page.waitForFunction(count=>document.querySelectorAll('.layer-row').length===count+1,before);
}

async function editField(name, value) {
  const locator=page.locator(`[data-editable-field="${name}"]`);
  const tag=await locator.evaluate(node=>node.tagName);
  const type=await locator.getAttribute('type');
  if(tag==='SELECT'){await locator.selectOption(String(value));return;}
  else if(type==='checkbox')await locator.setChecked(Boolean(value));
  else await locator.evaluate((element,next)=>{element.value=String(next);element.dispatchEvent(new Event('change',{bubbles:true}));},value);
}

async function activeNode() {
  return page.evaluate(()=>{
    const state=window.testApp.drawingCanvas.exportProjectDocument().layers;
    return state.nodes.find(node=>node.id===state.activeLayerId);
  });
}

try {
  const railKinds=['text','balloon','panel','tone','effect','material'];
  for(const tool of railKinds)assert.equal(await page.locator(`[data-tool="${tool}"]`).count(),1,`missing ${tool} rail tool`);
  for(const action of ['text','balloon','panel','tone','speed','focus'])assert.equal(await page.locator(`[data-editable-add="${action}"]`).count(),1,`missing ${action} palette action`);
  for(const type of ['image','pattern','texture'])assert.equal(await page.locator(`[data-material-import="${type}"]`).count(),1,`missing ${type} import action`);
  checked('six rail tools and Manga/Materials primary actions are visible');

  await page.locator('[data-tool="text"]').click();
  const defaultContent=page.locator('[data-text-default="content"]');
  const defaultSize=page.locator('[data-text-default="fontSize"]');
  const longDefault='한글<&>'.repeat(260);
  await defaultContent.focus();
  await defaultContent.evaluate((element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.setSelectionRange(3,3);element.dispatchEvent(new CompositionEvent('compositionstart',{data:'한'}));element.dispatchEvent(new CompositionEvent('compositionend',{data:'한'}));},longDefault);
  assert.deepEqual(await defaultContent.evaluate(element=>({active:document.activeElement===element,start:element.selectionStart,value:element.value})),{active:true,start:3,value:longDefault},'pre-placement text editing retains focus, caret and IME content');
  await defaultContent.dispatchEvent('change');
  await defaultSize.evaluate(element=>{element.value='500';element.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal((await defaultContent.inputValue()).length,1000);assert.equal(await defaultSize.inputValue(),'300');
  await page.locator('[data-editable-add="text"]').click();
  let node=await activeNode();
  assert.equal(node.content,await defaultContent.inputValue());assert.equal(node.fontSize,Number(await defaultSize.inputValue()));
  await page.locator('[data-layer-action="delete"]').click();
  await page.locator('[data-text-default="content"]').fill('Before placement');
  await page.locator('[data-text-default="fontSize"]').fill('42');
  await page.locator('[data-text-default="fontFamily"]').selectOption('serif');
  const beforeText=await canvasFingerprint();
  await page.locator('.drawing-canvas').click({position:{x:480,y:300}});
  node=await activeNode();
  assert.equal(node.kind,'text');assert.equal(node.content,'Before placement');assert.equal(node.fontSize,42);assert.equal(node.fontFamily,'serif');
  assert.notEqual(await canvasFingerprint(),beforeText);

  await page.locator('[data-tool="brush"]').click();
  assert.equal(await page.locator('[data-editable-properties][data-kind="text"]').count(),1,'selected layer properties must not depend on active tool');
  const content=page.locator('[data-editable-field="content"]');
  await content.focus();await content.fill('<>&\n한글 편집');
  await content.evaluate(element=>{element.setSelectionRange(3,3);element.dispatchEvent(new CompositionEvent('compositionstart',{data:'한'}));element.dispatchEvent(new CompositionEvent('compositionend',{data:'한'}));});
  await page.locator('[data-action="zoom-in"]').count().catch(()=>0);
  assert.deepEqual(await content.evaluate(element=>({active:document.activeElement===element,start:element.selectionStart,value:element.value})),{active:true,start:3,value:'<>&\n한글 편집'});
  assert.equal((await activeNode()).content,'Before placement','input is committed on change, not each keystroke');
  await content.dispatchEvent('change');await content.blur();
  assert.equal((await activeNode()).content,'<>&\n한글 편집');
  await editField('fontFamily','monospace');await editField('fontSize',36);await editField('fontWeight',700);await editField('alignment','center');
  await editField('lineHeight',1.5);await editField('letterSpacing',2);await editField('fillColor','#123456');await editField('outlineColor','#fedcba');
  await editField('outlineWidth',3);await editField('x',310);await editField('y',190);
  node=await activeNode();
  assert.deepEqual({content:node.content,fontFamily:node.fontFamily,fontSize:node.fontSize,fontWeight:node.fontWeight,alignment:node.alignment,lineHeight:node.lineHeight,letterSpacing:node.letterSpacing,fillColor:node.fillColor,outlineColor:node.outlineColor,outlineWidth:node.outlineWidth,x:node.x,y:node.y},{content:'<>&\n한글 편집',fontFamily:'monospace',fontSize:36,fontWeight:700,alignment:'center',lineHeight:1.5,letterSpacing:2,fillColor:'#123456',outlineColor:'#fedcba',outlineWidth:3,x:310,y:190});
  const changedText=await canvasFingerprint();assert.notEqual(changedText,beforeText);
  const errorsBeforeInvalid=h.errors.length;await editField('fontSize',0);assert.equal((await activeNode()).fontSize,36);assert.equal(await page.locator('[data-editable-error]').isVisible(),true);assert.match(await page.locator('[data-editable-error]').innerText(),/invalid text font size/i);assert.equal(h.errors.length,errorsBeforeInvalid);
  await editField('fontSize',36);assert.equal(await page.locator('[data-editable-error]').isHidden(),true);
  await editField('y',191);assert.equal((await activeNode()).y,191);
  await page.locator('[data-action="undo"]').first().click();assert.equal((await activeNode()).y,190);
  await page.locator('[data-action="redo"]').first().click();assert.equal((await activeNode()).y,191);
  checked('editable text placement, stable native editing, every field, pixels and undo/redo');

  const canvas=page.locator('.drawing-canvas');
  await page.locator('[data-tool="balloon"]').click();await canvas.click({position:{x:350,y:260}});
  for(const [key,value] of Object.entries({shape:'rounded-rectangle',x:90,y:80,width:280,height:140,cornerRadius:18,tailEndX:330,tailEndY:300,tailBaseSize:40,fillColor:'#fff8dc',strokeColor:'#102030',strokeWidth:6}))await editField(key,value);
  node=await activeNode();assert.deepEqual({shape:node.shape,x:node.x,y:node.y,width:node.width,height:node.height,cornerRadius:node.cornerRadius,tailEndX:node.tailEndX,tailEndY:node.tailEndY,tailBaseSize:node.tailBaseSize,fillColor:node.fillColor,strokeColor:node.strokeColor,strokeWidth:node.strokeWidth},{shape:'rounded-rectangle',x:90,y:80,width:280,height:140,cornerRadius:18,tailEndX:330,tailEndY:300,tailBaseSize:40,fillColor:'#fff8dc',strokeColor:'#102030',strokeWidth:6});

  await page.locator('[data-tool="panel"]').click();await canvas.click({position:{x:260,y:220}});
  for(const [key,value] of Object.entries({rows:3,columns:4,margin:30,gutter:16,strokeColor:'#334455',strokeWidth:5}))await editField(key,value);
  node=await activeNode();assert.deepEqual({rows:node.rows,columns:node.columns,margin:node.margin,gutter:node.gutter,strokeColor:node.strokeColor,strokeWidth:node.strokeWidth},{rows:3,columns:4,margin:30,gutter:16,strokeColor:'#334455',strokeWidth:5});

  await page.locator('[data-tool="tone"]').click();await canvas.click({position:{x:230,y:210}});
  for(const [key,value] of Object.entries({pattern:'lines',frequency:20,angle:30,density:.35,color:'#556677'}))await editField(key,value);
  node=await activeNode();assert.deepEqual({pattern:node.pattern,frequency:node.frequency,angle:node.angle,density:node.density,color:node.color},{pattern:'lines',frequency:20,angle:30,density:.35,color:'#556677'});

  await page.locator('[data-tool="effect"]').click();await canvas.click({position:{x:400,y:240}});
  for(const [key,value] of Object.entries({effect:'focus',seed:9,count:44,width:3,length:170,centerX:420,centerY:260,angle:25,color:'#112233'}))await editField(key,value);
  node=await activeNode();assert.deepEqual({effect:node.effect,seed:node.seed,count:node.count,width:node.width,length:node.length,centerX:node.centerX,centerY:node.centerY,angle:node.angle,color:node.color},{effect:'focus',seed:9,count:44,width:3,length:170,centerX:420,centerY:260,angle:25,color:'#112233'});
  const countBeforeActions=await page.locator('.layer-row').count();await page.locator('[data-editable-add="speed"]').click();await page.locator('[data-editable-add="focus"]').click();
  assert.equal(await page.locator('.layer-row').count(),countBeforeActions+2);assert.deepEqual(await page.evaluate(()=>window.testApp.drawingCanvas.exportProjectDocument().layers.nodes.slice(-2).map(node=>node.effect)),['speed','focus']);
  checked('balloon, panel, tone and effect placement plus all editable fields and Speed/Focus actions');

  const png=await fixture('image/png','fixture.png');const jpeg=await fixture('image/jpeg','fixture.jpg');const webp=await fixture('image/webp','fixture.webp',4,3);
  await importMaterial('[data-material-import="image"]',png);
  await importMaterial('[data-material-import="pattern"]',jpeg);
  await importMaterial('[data-material-import="texture"]',webp);
  node=await activeNode();assert.equal(node.kind,'material');assert.equal(node.materialType,'texture');assert.equal(node.asset.width,4);assert.equal(node.asset.height,3);assert.ok(node.asset.rgba.length>0);assert.match(await page.locator('.material-asset-readout').innerText(),/4 × 3/);
  for(const [key,value] of Object.entries({materialType:'pattern',x:250,y:170,scale:4,rotation:28,repeat:'repeat-y'}))await editField(key,value);
  node=await activeNode();assert.deepEqual({materialType:node.materialType,x:node.x,y:node.y,scale:node.scale,rotation:node.rotation,repeat:node.repeat},{materialType:'pattern',x:250,y:170,scale:4,rotation:28,repeat:'repeat-y'});
  const beforeBad=await page.locator('.layer-row').count();const choosingBad=page.waitForEvent('filechooser');await page.locator('[data-material-import="image"]').click();await (await choosingBad).setFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
  await page.waitForSelector('[data-material-error]:not([hidden])');assert.match(await page.locator('[data-material-error]').innerText(),/could not|invalid|decode/i);assert.equal(await page.locator('.layer-row').count(),beforeBad);
  const choosingRail=page.waitForEvent('filechooser');await page.locator('[data-tool="material"]').click();await (await choosingRail).setFiles(png);await page.waitForFunction(count=>document.querySelectorAll('.layer-row').length===count+1,beforeBad);
  checked('PNG, JPEG and WebP imports embed pixels; malformed data is atomic; Material rail opens import');

  const badges=await page.locator('.layer-kind-badge').allTextContents();for(const badge of ['TXT','BAL','PNL','TONE','FX','MAT'])assert.ok(badges.includes(badge),`missing ${badge} badge`);
  for(const kind of ['text','balloon','panel','screen-tone','manga-effect','material'])assert.equal(await page.locator(`[data-control="layer-kind-filter"] option[value="${kind}"]`).count(),1,`missing ${kind} filter`);
  await page.locator('[data-control="layer-kind-filter"]').selectOption('text');
  assert.ok(await page.locator('.layer-tree-item:not([hidden])').count()>=1);assert.equal(await page.locator('.layer-tree-item:not([hidden]) [data-layer-kind]:not([data-layer-kind="text"])').count(),0);
  await page.locator('[data-control="layer-kind-filter"]').selectOption('all');
  assert.equal(await page.locator('[data-editable-field][type="number"]:invalid').count(),0,'editable numeric defaults satisfy their HTML constraints');
  await page.evaluate(()=>{const app=window.testApp,document=app.drawingCanvas.exportProjectDocument(),active=document.layers.nodes.find(node=>node.id===document.layers.activeLayerId),size=app.drawingCanvas.canvasSize;active.locked=true;app.drawingCanvas.importProjectDocument(document,size.width,size.height);app.syncUI();});
  assert.equal(await page.locator('[data-editable-field]:not(:disabled)').count(),0,'locked editable layer disables every property control');
  await page.evaluate(()=>{const app=window.testApp,document=app.drawingCanvas.exportProjectDocument(),active=document.layers.nodes.find(node=>node.id===document.layers.activeLayerId),size=app.drawingCanvas.canvasSize;active.locked=false;app.drawingCanvas.importProjectDocument(document,size.width,size.height);app.syncUI();});
  checked('editable kind badges and filters cover all six layer kinds');

  const exportDownload=page.waitForEvent('download');await page.locator('[data-action="export"]').first().click();assert.equal((await exportDownload).suggestedFilename(),'drawing-v0.6.7-restored.png');
  const validText=await page.evaluate(()=>window.testApp.buildProjectFileText());
  const corrupt=JSON.parse(validText);corrupt.metadata.title='Rejected';corrupt.document.surfaces[0].content.rgba='bad';
  const missingActive=JSON.parse(validText);missingActive.metadata.title='Missing active candidate';missingActive.document.layers.activeLayerId='text-missing';
  await page.addInitScript(({valid,invalid,missingActive})=>{
    const writes={accepted:[],rejected:[]};window.__nativeWrites=writes;let index=0;
    const make=(name,text,key)=>({name,async getFile(){return new File([text],name,{type:'application/json'});},async createWritable(){return{async write(value){writes[key].push(String(value));},async close(){}};}});
    const handles=[make('accepted.drawstudio',valid,'accepted'),make('rejected.drawstudio',invalid,'rejected'),make('missing-active.drawstudio',missingActive,'rejected')];
    window.showOpenFilePicker=async()=>[handles[index++]];window.showSaveFilePicker=async()=>make('save-as.drawstudio',valid,'accepted');
  },{valid:validText,invalid:JSON.stringify(corrupt),missingActive:JSON.stringify(missingActive)});
  await page.reload();await page.waitForSelector('.editor-shell');
  await page.locator('[data-action="open-project"]').click();await page.waitForFunction(()=>window.testApp.projectController.fileName==='accepted.drawstudio');
  const beforeRejected=await page.evaluate(()=>({title:window.testApp.projectTitle,document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument())}));
  const rejectedDialog=page.waitForEvent('dialog');await page.locator('[data-action="open-project"]').click();await (await rejectedDialog).accept();
  assert.deepEqual(await page.evaluate(()=>({title:window.testApp.projectTitle,document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument())})),beforeRejected);
  await page.evaluate(()=>window.testApp.drawingCanvas.updateEditableLayer({x:251}));
  const beforeMissingActive=await page.evaluate(()=>({
    title:window.testApp.projectTitle,
    document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument()),
    size:window.testApp.drawingCanvas.canvasSize,
    dirty:document.querySelector('[data-document-status]').classList.contains('is-dirty'),
    fileName:window.testApp.projectController.fileName,
    hasWritableHandle:window.testApp.projectController.hasWritableHandle
  }));
  const missingActiveDialog=page.waitForEvent('dialog');await page.locator('[data-action="open-project"]').click();await (await missingActiveDialog).accept();
  assert.deepEqual(await page.evaluate(()=>({
    title:window.testApp.projectTitle,
    document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument()),
    size:window.testApp.drawingCanvas.canvasSize,
    dirty:document.querySelector('[data-document-status]').classList.contains('is-dirty'),
    fileName:window.testApp.projectController.fileName,
    hasWritableHandle:window.testApp.projectController.hasWritableHandle
  })),beforeMissingActive);
  await page.locator('[data-action="save-project"]').click();await page.waitForFunction(()=>window.__nativeWrites.accepted.length===1);
  assert.deepEqual(await page.evaluate(()=>({accepted:window.__nativeWrites.accepted.length,rejected:window.__nativeWrites.rejected.length})),{accepted:1,rejected:0});

  const recoveryBad=JSON.parse(validText);recoveryBad.metadata.title='Bad Recovery';recoveryBad.document.layers.nodes.find(node=>node.kind==='material').asset.rgba='bad';
  await page.evaluate(async text=>{const {IndexedDbAutosaveStore}=await import('/js/persistence/autosaveStore.js');await new IndexedDbAutosaveStore().saveRecovery({id:'latest',title:'Bad Recovery',savedAt:new Date().toISOString(),revision:99,projectText:text});await window.testApp.refreshProjectStatus();},JSON.stringify(recoveryBad));
  const beforeRecovery=await page.evaluate(()=>({title:window.testApp.projectTitle,document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument()),hasHandle:window.testApp.projectController.hasWritableHandle}));
  assert.equal(await page.locator('[data-action="restore-recovery"]').count(),0,'invalid recovery is not offered');assert.equal(await page.locator('[data-action="dismiss-recovery"]').count(),1);assert.match(await page.locator('[data-project-recovery]').innerText(),/recovery unavailable/i);await page.evaluate(()=>window.testApp.restoreRecovery());
  assert.deepEqual(await page.evaluate(()=>({title:window.testApp.projectTitle,document:JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument()),hasHandle:window.testApp.projectController.hasWritableHandle})),beforeRecovery);
  checked('export name, atomic App open/recovery, and native writable binding integration');

  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'workspace-1440-desktop.png'),fullPage:true});
  let layout=await page.evaluate(()=>{const body=document.querySelector('.editor-body').getBoundingClientRect(),tool=document.querySelector('.toolbar').getBoundingClientRect(),primary=document.querySelector('.primary-dock').getBoundingClientRect(),secondary=document.querySelector('.secondary-dock').getBoundingClientRect();return{body,tool,primary,secondary,scrollWidth:document.documentElement.scrollWidth,innerWidth};});
  assert.equal(layout.scrollWidth,layout.innerWidth);assert.ok(layout.tool.left<layout.primary.left&&layout.primary.left<layout.secondary.left);
  await page.setViewportSize({width:1024,height:768});await page.locator('[data-action="toggle-handedness"]').click();await page.screenshot({path:path.join(out,'workspace-1024-tablet-left.png'),fullPage:true});
  layout=await page.evaluate(()=>{const body=document.querySelector('.editor-body').getBoundingClientRect(),tool=document.querySelector('.toolbar').getBoundingClientRect(),primary=document.querySelector('.primary-dock').getBoundingClientRect(),secondary=document.querySelector('.secondary-dock').getBoundingClientRect();return{body,tool,primary,secondary,scrollWidth:document.documentElement.scrollWidth,innerWidth,dockOverflow:[...document.querySelectorAll('.dock-group')].some(d=>d.scrollHeight>d.clientHeight)};});
  assert.equal(layout.scrollWidth,layout.innerWidth);assert.ok(layout.secondary.left<layout.primary.left&&layout.primary.left<layout.tool.left);assert.equal(layout.dockOverflow,true,'compact docks remain scrollable when content exceeds tablet height');
  const reachability=await page.evaluate(()=>{const dock=document.querySelector('.secondary-dock');dock.scrollTop=dock.scrollHeight;const dockRect=dock.getBoundingClientRect(),layers=document.querySelector('.layers-panel').getBoundingClientRect(),safety=document.querySelector('.project-status-panel').getBoundingClientRect(),stack=document.querySelector('.layer-stack');return{layersBottom:layers.bottom,safetyTop:safety.top,safetyBottom:safety.bottom,dockBottom:dockRect.bottom,stackScrollable:stack.scrollHeight>stack.clientHeight,atBottom:Math.abs(dock.scrollTop-(dock.scrollHeight-dock.clientHeight))<2};});
  assert.ok(reachability.layersBottom<=reachability.safetyTop,'Layers does not overlap Project Safety');assert.ok(reachability.safetyBottom<=reachability.dockBottom+1,'Project Safety is reachable inside the scrolled dock');assert.equal(reachability.stackScrollable,true,'layer list remains independently scrollable');assert.equal(reachability.atBottom,true);
  assert.deepEqual(h.errors,[]);
  checked('1440 desktop and 1024 mirrored tablet layouts stay on-screen with scrollable docks');
  await writeFile(path.join(out,'browser-ui-results.json'),JSON.stringify({browser:h.browser.version(),checks,errors:h.errors},null,2));
  console.log(`Passed ${checks.length} focused V0.6.7 UI groups`);
} catch(error) {
  await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
  await writeFile(path.join(out,'failure.html'),await page.content()).catch(()=>{});
  throw error;
} finally {await h.close();}
