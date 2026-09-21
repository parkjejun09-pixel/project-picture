import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserHarness, downloadFrom, openProjectFrom, imagePixels} from './browserHarness.mjs';

const out = path.resolve(process.env.V067_EVIDENCE_DIR || 'test-results/v067');
await mkdir(out, {recursive:true});
const h = await browserHarness({exposeApp:true});
const {page} = h;
const checks=[];
function checked(label) {checks.push(label);console.log(`PASS ${label}`);}
try {
  const rendered = await page.evaluate(async()=>{
    const {createEditableLayerData}=await import('/js/drawing/editableLayers.js');
    const {EditableLayerRenderer}=await import('/js/drawing/editableLayerRenderer.js');
    const renderer=new EditableLayerRenderer((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
    const results=[];
    for(const kind of ['text','balloon','panel','screen-tone','manga-effect','material']) {
      const data=kind==='material'?createEditableLayerData(kind,1280,800,{width:2,height:2,rgba:'/wAA/wD/AP8AAP///////w=='}):createEditableLayerData(kind,1280,800);
      const canvas=renderer.render(data,1280,800),ctx=canvas.getContext('2d');
      const rgba=ctx.getImageData(0,0,1280,800).data;
      let opaque=0;for(let i=3;i<rgba.length;i+=4) if(rgba[i]) opaque++;
      results.push({kind,opaque});
      if(kind==='screen-tone') {
        for(const pattern of ['dots','lines'])for(const frequency of [0.5,12,48]) {
          const tone=renderer.render({...data,pattern,frequency},1280,800).getContext('2d');
          const corners=[[0,0],[1216,0],[0,736],[1216,736]].map(([x,y])=>{
            const pixels=tone.getImageData(x,y,64,64).data;let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])n++;return n;
          });results.push({kind:`${pattern}-${frequency}-corners`,corners});
        }
      }
      if(kind==='manga-effect') {
        const pixels=renderer.render({...data,effect:'focus'},1280,800).getContext('2d').getImageData(0,0,1280,800).data;
        let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])n++;results.push({kind:'focus',opaque:n});
      }
    }
    return results;
  });
  for(const r of rendered) {if(r.corners)assert.ok(r.corners.every(n=>n>0),JSON.stringify(r));else assert.ok(r.opaque>0,JSON.stringify(r));}
  checked('all six renderers, focus defaults and full-canvas tone coverage');

  const repeatCoverage = await page.evaluate(async()=>{
    const {createEditableLayerData}=await import('/js/drawing/editableLayers.js');
    const {EditableLayerRenderer}=await import('/js/drawing/editableLayerRenderer.js');
    const renderer=new EditableLayerRenderer((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
    const base={...createEditableLayerData('material',320,240,{width:1,height:1,rgba:'/wAA/w=='}),materialType:'pattern',scale:2.5,rotation:31,x:800,y:-450};
    const coverage=(data)=>{const rgba=renderer.render(data,320,240).getContext('2d').getImageData(0,0,320,240).data;let opaque=0,minX=320,maxX=-1,minY=240,maxY=-1;for(let y=0;y<240;y+=1)for(let x=0;x<320;x+=1){if(!rgba[(y*320+x)*4+3])continue;opaque+=1;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return{opaque,minX,maxX,minY,maxY};};
    return {
      translatedRotatedScaled:coverage({...base,repeat:'repeat'}),
      repeatX:coverage({...base,repeat:'repeat-x',scale:8,rotation:0,x:160,y:120}),
      repeatY:coverage({...base,repeat:'repeat-y',scale:8,rotation:0,x:160,y:120})
    };
  });
  assert.equal(repeatCoverage.translatedRotatedScaled.opaque,320*240);
  assert.deepEqual([repeatCoverage.repeatX.minX,repeatCoverage.repeatX.maxX],[0,319]);assert.ok(repeatCoverage.repeatX.minY>0&&repeatCoverage.repeatX.maxY<239);
  assert.deepEqual([repeatCoverage.repeatY.minY,repeatCoverage.repeatY.maxY],[0,239]);assert.ok(repeatCoverage.repeatY.minX>0&&repeatCoverage.repeatY.maxX<319);
  checked('translated, rotated and scaled material repeat covers the canvas while repeat-x/y stay axis-specific');

  const fixture = await page.evaluate(async()=>{
    const {createInitialLayerDocument}=await import('/js/drawing/layers.js');
    const {createEditableLayerData}=await import('/js/drawing/editableLayers.js');
    const {serializeImageBytes}=await import('/js/persistence/documentDto.js');
    const app=window.testApp,c=app.drawingCanvas,w=320,h=240;
    const white=new Uint8ClampedArray(w*h*4);white.fill(255);
    c.importProjectDocument({layers:createInitialLayerDocument(),surfaces:[{id:'background',content:serializeImageBytes(w,h,white),mask:null},{id:'paint-1',content:serializeImageBytes(w,h,new Uint8ClampedArray(w*h*4)),mask:null}],vectors:[],selectionLayers:[]},w,h);
    const asset={width:2,height:2,rgba:'/wAA/wD/AP8AAP///////w=='};
    c.addEditableLayer({...createEditableLayerData('material',w,h,asset),materialType:'pattern',repeat:'repeat',scale:12,rotation:15});
    c.setLayerOpacity(.22);
    c.addEditableLayer({...createEditableLayerData('screen-tone',w,h),frequency:14,density:.15});
    c.addEditableLayer({...createEditableLayerData('manga-effect',w,h),effect:'focus',count:35,width:1,length:150});
    c.addEditableLayer({...createEditableLayerData('panel',w,h),margin:12,gutter:8});
    c.addEditableLayer({...createEditableLayerData('balloon',w,h),x:45,y:50,width:175,height:80,tailEndX:200,tailEndY:170,shape:'rounded-rectangle'});
    c.addEditableLayer({...createEditableLayerData('text',w,h),content:'Editable\nStudio',x:128,y:68,fontSize:23,fontWeight:700,alignment:'center',outlineWidth:1,letterSpacing:1});
    app.projectExtensions={'acceptance.unknown':{keep:true}};
    return c.exportProjectDocument();
  });
  assert.deepEqual(fixture.layers.nodes.slice(-6).map(n=>n.kind),['material','screen-tone','manga-effect','panel','balloon','text']);
  checked('six first-class layers through actual DrawingCanvas compositor');

  const composite = await page.evaluate(async()=>{
    const c=window.testApp.drawingCanvas, saved=c.exportProjectDocument();
    const {createInitialLayerDocument}=await import('/js/drawing/layers.js');
    const {createEditableLayerData}=await import('/js/drawing/editableLayers.js');
    c.importProjectDocument({...saved,layers:createInitialLayerDocument()},320,240);
    const red={...createEditableLayerData('material',320,240,{width:1,height:1,rgba:'/wAA/w=='}),scale:40};
    c.addEditableLayer(red);
    const sample=()=>{const preview=document.createElement('canvas');preview.width=320;preview.height=240;c.copyCompositeTo(preview);return [...preview.getContext('2d').getImageData(160,120,1,1).data];};
    const opaque=sample();c.setLayerOpacity(.5);const half=sample();
    c.setLayerBlendMode('screen');const screen=sample();c.setLayerBlendMode('multiply');const multiply=sample();
    c.toggleLayerVisibility(c.layerState.activeLayerId);const hidden=sample();c.toggleLayerVisibility(c.layerState.activeLayerId);
    c.setLayerOpacity(1);c.setLayerBlendMode('normal');
    c.addEditableLayer({...red,asset:{width:1,height:1,rgba:'AAD//w=='}});const blue=sample();
    c.moveLayer('down');const reordered=sample();c.undo();const undo=sample();
    c.importProjectDocument(saved,320,240);
    return {opaque,half,screen,multiply,hidden,blue,reordered,undo};
  });
  assert.deepEqual(composite.opaque,[255,0,0,255]);
  // Canvas premultiplied-alpha blending may differ by one byte across operators.
  for(const pixel of [composite.half,composite.multiply]) {
    assert.equal(pixel[0],255);assert.equal(pixel[3],255);
    assert.ok(pixel[1]>=126&&pixel[1]<=128);assert.equal(pixel[1],pixel[2]);
  }
  assert.deepEqual(composite.screen,[255,255,255,255]);assert.deepEqual(composite.hidden,[255,255,255,255]);
  assert.deepEqual(composite.blue,[0,0,255,255]);assert.deepEqual(composite.reordered,[255,0,0,255]);assert.deepEqual(composite.undo,[0,0,255,255]);
  checked('real composite pixels: opacity, Screen/Multiply, visibility, reorder, undo and Navigator source');

  const beforeDraft=await imagePixels(page,await downloadFrom(page,'[data-action="export"]'));
  const draftPreviewBefore=await page.evaluate(()=>{
    const app=window.testApp,c=app.drawingCanvas;
    c.addLayer();c.setLayerRole('draft');app.dispatch({type:'tool/set',tool:'brush'});app.dispatch({type:'color/set',value:'#ff0000'});
    const preview=document.createElement('canvas');preview.width=320;preview.height=240;c.copyCompositeTo(preview);return preview.toDataURL();
  });
  const canvasBox=await page.locator('.drawing-canvas').boundingBox();
  await page.mouse.move(canvasBox.x+canvasBox.width*.35,canvasBox.y+canvasBox.height*.5);
  await page.mouse.down();await page.mouse.move(canvasBox.x+canvasBox.width*.65,canvasBox.y+canvasBox.height*.5,{steps:12});await page.mouse.up();
  assert.notEqual(await page.evaluate(()=>{
    const preview=document.createElement('canvas');preview.width=320;preview.height=240;window.testApp.drawingCanvas.copyCompositeTo(preview);return preview.toDataURL();
  }),draftPreviewBefore);
  assert.deepEqual(await imagePixels(page,await downloadFrom(page,'[data-action="export"]')),beforeDraft);
  await page.evaluate(document=>window.testApp.drawingCanvas.importProjectDocument(document,320,240),fixture);
  checked('real pointer brush still paints raster drafts; draft pixels excluded from final PNG');

  const history = await page.evaluate(()=>{
    const c=window.testApp.drawingCanvas;
    c.updateEditableLayer({content:'After edit'});const edited=c.exportProjectDocument().layers.nodes.at(-1).content;
    c.undo();const undone=c.exportProjectDocument().layers.nodes.at(-1).content;
    c.redo();const redone=c.exportProjectDocument().layers.nodes.at(-1).content;
    c.duplicateLayer();c.updateEditableLayer({content:'Copy only'});
    const nodes=c.exportProjectDocument().layers.nodes;
    const original=nodes.at(-2).content,copy=nodes.at(-1).content;
    c.deleteLayer();c.undo();const restored=c.exportProjectDocument().layers.nodes.at(-1).content;c.redo();
    c.updateEditableLayer({content:'Editable\nStudio'});
    return {edited,undone,redone,original,copy,restored};
  });
  assert.deepEqual(history,{edited:'After edit',undone:'Editable\nStudio',redone:'After edit',original:'After edit',copy:'Copy only',restored:'Copy only'});
  checked('editable history, duplicate isolation, deletion undo/redo');

  const navigatorMatches=await page.evaluate(()=>{
    const actual=document.querySelector('.navigator-preview');
    const expected=document.createElement('canvas');expected.width=actual.width;expected.height=actual.height;
    window.testApp.drawingCanvas.copyCompositeTo(expected);
    const a=actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data;
    const b=expected.getContext('2d').getImageData(0,0,expected.width,expected.height).data;
    return a.every((value,i)=>value===b[i]);
  });
  assert.equal(navigatorMatches,true);
  checked('visible Navigator canvas matches the editable artwork composite');

  const pngBefore = await downloadFrom(page,'[data-action="export"]',path.join(out,'artwork-before.png'));
  const pixelsBefore=await imagePixels(page,pngBefore);
  await page.evaluate(()=>{window.testApp.dispatch({type:'assist-mode/set',value:'grid'});window.testApp.dispatch({type:'assist-snap/set',value:true});});
  assert.deepEqual(await imagePixels(page,await downloadFrom(page,'[data-action="export"]')),pixelsBefore);
  await page.evaluate(()=>window.testApp.dispatch({type:'assist-mode/set',value:'none'}));
  checked('assist overlays remain excluded from PNG artwork');
  const file = await downloadFrom(page,'[data-action="save-as-project"]',path.join(out,'acceptance.drawstudio'));
  await page.waitForFunction(()=>!document.querySelector('[data-document-status]').classList.contains('is-dirty'));
  const saved=JSON.parse(file.toString());
  assert.equal(saved.formatVersion,1);assert.equal(saved.document.layers.nodes.find(n=>n.kind==='material').asset.rgba,'/wAA/wD/AP8AAP///////w==');
  assert.deepEqual(saved.extensions,{'acceptance.unknown':{keep:true}});
  await page.evaluate(()=>window.testApp.drawingCanvas.updateEditableLayer({content:'Unsaved change'}));
  assert.equal(await page.locator('[data-document-status]').evaluate(el=>el.classList.contains('is-dirty')),true);
  await openProjectFrom(page,path.join(out,'acceptance.drawstudio'));
  await page.waitForFunction(()=>window.testApp.drawingCanvas.exportProjectDocument().layers.nodes.at(-1)?.content==='Editable\nStudio');
  await page.waitForFunction(()=>!document.querySelector('[data-document-status]').classList.contains('is-dirty'));
  const pngReopened=await downloadFrom(page,'[data-action="export"]',path.join(out,'artwork-reopened.png'));
  assert.deepEqual(await imagePixels(page,pngReopened),pixelsBefore);
  checked('.drawstudio Save As/Open preserves exact rendered pixels, editable metadata and embedded material');

  await page.evaluate(()=>window.testApp.drawingCanvas.updateEditableLayer({content:'Recovered text'}));
  await page.evaluate(async()=>{
    const {IndexedDbAutosaveStore}=await import('/js/persistence/autosaveStore.js');
    const store=new IndexedDbAutosaveStore(),deadline=Date.now()+15000;
    while(Date.now()<deadline) {
      const checkpoint=await store.getRecovery();
      if(checkpoint?.projectText.includes('Recovered text'))return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Autosave checkpoint did not contain edited text within 15 seconds');
  });
  const recoverPng=await downloadFrom(page,'[data-action="export"]');
  const recoverPixels=await imagePixels(page,recoverPng);
  assert.equal(await page.evaluate(async()=>{
    const {IndexedDbAutosaveStore}=await import('/js/persistence/autosaveStore.js');
    return (await new IndexedDbAutosaveStore().getRecovery())?.projectText.includes('Recovered text')??false;
  }),true,'checkpoint is durably readable immediately before reload');
  await page.reload();
  await page.waitForSelector('[data-action="restore-recovery"]');
  assert.equal(await page.locator('.layer-row').count(),2);
  await page.locator('[data-action="restore-recovery"]').click();
  await page.waitForFunction(()=>window.testApp.drawingCanvas.exportProjectDocument().layers.nodes.at(-1)?.content==='Recovered text');
  assert.deepEqual(await imagePixels(page,await downloadFrom(page,'[data-action="export"]')),recoverPixels);
  assert.deepEqual(await page.evaluate(()=>window.testApp.projectExtensions),{'acceptance.unknown':{keep:true}});
  assert.equal(await page.locator('[data-document-status]').evaluate(el=>el.classList.contains('is-dirty')),true);
  checked('real IndexedDB autosave + reload + explicit recovery keeps material/text and exact PNG pixels');

  const beforeCorrupt=await page.evaluate(()=>JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument()));
  const beforeIdentity=await page.evaluate(()=>({title:window.testApp.projectTitle,size:window.testApp.drawingCanvas.canvasSize}));
  const corrupt=structuredClone(saved);corrupt.canvas.width=123;corrupt.metadata.title='Do not adopt';corrupt.document.layers.nodes.find(n=>n.kind==='material').asset.rgba='bad';
  const invalidPath=path.join(out,'invalid.drawstudio');await writeFile(invalidPath,JSON.stringify(corrupt));
  const dialog=page.waitForEvent('dialog');await openProjectFrom(page,invalidPath);const alert=await dialog;await alert.accept();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.testApp.drawingCanvas.exportProjectDocument())),beforeCorrupt);
  assert.deepEqual(await page.evaluate(()=>({title:window.testApp.projectTitle,size:window.testApp.drawingCanvas.canvasSize})),beforeIdentity);
  checked('corrupt material file rejected without replacing current artwork/title');

  const beforeFlatten=await imagePixels(page,await downloadFrom(page,'[data-action="export"]'));
  await page.locator('[data-layer-action="flatten-visible"]').click();
  assert.equal(await page.locator('.layer-row').count(),1);
  assert.deepEqual(await imagePixels(page,await downloadFrom(page,'[data-action="export"]')),beforeFlatten);
  await page.locator('[data-action="undo"]').first().click();
  assert.equal(await page.locator('.layer-row').count(),8);
  checked('Flatten Visible is pixel-identical and undo restores editable layer types');

  await page.evaluate(()=>{
    window.testApp.drawingCanvas.updateEditableLayer({content:'Editable\nStudio'});
    window.testApp.dispatch({type:'tool/set',tool:'text'});
  });
  await page.screenshot({path:path.join(out,'workspace.png')});
  await page.setViewportSize({width:1024,height:768});
  await page.locator('[data-action="toggle-handedness"]').click();
  await page.screenshot({path:path.join(out,'workspace-tablet-left.png')});
  assert.deepEqual(h.errors,[]);
  await writeFile(path.join(out,'browser-results.json'),JSON.stringify({browser:h.browser.version(),checks,rendered,pixelsBefore,errors:h.errors},null,2));
  console.log(`Passed ${checks.length} browser acceptance groups`);
} catch(error) {
  await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  await writeFile(path.join(out,'failure.html'),await page.content()).catch(()=>{});
  await writeFile(path.join(out,'failure-errors.json'),JSON.stringify(h.errors,null,2));
  const recoveryDiagnostic=await page.evaluate(async()=>{
    const {IndexedDbAutosaveStore}=await import('/js/persistence/autosaveStore.js');
    try {const s=new IndexedDbAutosaveStore();const c=await s.getRecovery();return {checkpoint:c?{title:c.title,revision:c.revision,recoveredText:c.projectText.includes('Recovered text')}:null,recent:await s.listRecent()};}
    catch(e){return {error:String(e)};}
  }).catch(e=>({error:String(e)}));
  await writeFile(path.join(out,'failure-recovery.json'),JSON.stringify(recoveryDiagnostic,null,2));
  throw error;
} finally {await h.close();}
