const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const context2d=new Proxy({}, {get:()=>()=>{},set:()=>true});
function harness(cls='sword',seed=42){
 const nodes=new Map();
 const element=id=>{if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},hidden:false,innerHTML:'',textContent:'',className:'',onclick:null,addEventListener(){},getContext:()=>context2d});return nodes.get(id)};
 const storage=new Map(),api={};
 const sandbox={console,Math,Date,Set,Map,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},__SOLARIA_TEST__:api};
 vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:'solaria-game.js'});api.startRun(cls,seed);return {api,nodes,storage};
}
function settle(api){for(let i=0;i<240&&api.game.clearCollect;i++)api.tickClearCollection(1/60)}
module.exports={harness,settle};
