import test from 'node:test';
import assert from 'node:assert/strict';
import {ProjectController} from '../.build/js/persistence/projectController.js';

test('failed project acceptance preserves the previously validated writable binding', async()=>{
  const writes=[];
  let index=0;
  const files=['good.drawstudio','corrupt.drawstudio'].map(name=>({name,text:name,handle:{name,writeText:async text=>writes.push({name,text})}}));
  const controller=new ProjectController({directSupported:true,openDirect:async()=>files[index++],createDirectHandle:async()=>null,openFallback:async()=>null,downloadFallback:()=>{throw Error('unexpected fallback');}});
  await controller.open();
  await assert.rejects(()=>controller.open(()=>{throw new Error('Invalid embedded material');}),/Invalid embedded material/);
  assert.equal(controller.fileName,'good.drawstudio');
  await controller.save('current artwork','ignored.drawstudio');
  assert.deepEqual(writes,[{name:'good.drawstudio',text:'current artwork'}]);
});

test('file binding is committed only after asynchronous document acceptance', async()=>{
  let finish;
  const accepted=new Promise(resolve=>{finish=resolve;});
  const handle={name:'candidate.drawstudio',writeText:async()=>{}};
  const controller=new ProjectController({directSupported:true,openDirect:async()=>({name:handle.name,text:'candidate',handle}),createDirectHandle:async()=>null,openFallback:async()=>null,downloadFallback:()=>{}});
  const opening=controller.open(async()=>accepted);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(controller.hasWritableHandle,false);
  finish();await opening;
  assert.equal(controller.fileName,'candidate.drawstudio');
});
