/* Whole-scheme S0/S1 switch.
 * S0 contains exact old step texts and the original sequence from the Excel review sheet.
 * S1 is the existing protocol-updated model. Step comments are mapped separately.
 * No S0/S1 textual diff is shown inside a step, and the main model is not saved/overwritten.
 */
(function(){
"use strict";
if(typeof MODEL==="undefined"||typeof state==="undefined"||typeof render!=="function")return;
const keys=["title","input","action","output"];
const updatedSteps=MODEL.steps.slice();
const updatedByCode=Object.fromEntries(updatedSteps.map(s=>[s.code,Object.fromEntries(keys.map(k=>[k,s[k]]))]));
const oldCodes=OLD_SEQUENCE.slice();
const valid=new Set(updatedSteps.map(s=>s.code));
if(oldCodes.length!==updatedSteps.length||oldCodes.some(code=>!valid.has(code))){
 console.error("S0 sequence is incomplete; switch disabled");
 return;
}
let version="new";
window.SID_SCHEME_MODE=version;
const host=document.querySelector(".diagram-panel .panel-head");
if(!host)return;
const switcher=document.createElement("div");switcher.className="scheme-version-control";
switcher.innerHTML='<span class="scheme-version-label">Версия схемы</span>'+
 '<div role="group" aria-label="Выбери версию всей схемы" class="scheme-version-tabs">'+
 '<button type="button" data-scheme="old" disabled aria-pressed="false">Старая</button>'+
 '<button type="button" data-scheme="new" class="active" aria-pressed="true">Новая</button></div>'+
 '<span id="schemeVersionHint" class="scheme-version-hint" role="status">Новая схема с правками протокола</span>';
host.append(switcher);
const oldButton=switcher.querySelector('[data-scheme="old"]');
const newButton=switcher.querySelector('[data-scheme="new"]');
const hint=switcher.querySelector("#schemeVersionHint");
const oldGroups=[
 ["До начала строительства",oldCodes.slice(0,3)],
 ["Организация и подготовка",oldCodes.slice(3,15)],
 ["Производство и контроль",oldCodes.slice(15,22)],
 ["Испытания, ИД и комиссия",oldCodes.slice(22,27)],
 ["Опробование и приёмка",oldCodes.slice(27,32)],
 ["Передача, ввод и хранение",oldCodes.slice(32)]
];
function drawOld(){
 const diagram=document.getElementById("diagram");
 if(!diagram)return;
 const ordered=oldGroups.map(([name,codes])=>{
  const items=codes.map((code,j)=>{
   const pos=oldCodes.indexOf(code)+1;
   return '<div class="old-scheme-item"><span class="old-scheme-position">'+pos+'</span>'+node(code)+'</div>';
  }).join("");
  return '<section class="area old-scheme-section"><h3 class="area-title">'+name+'</h3><div class="old-scheme-items">'+items+'</div></section>';
 }).join("");
 diagram.innerHTML='<div class="old-scheme-heading"><b>Исходная схема до протокола</b><span>Порядок и текст шагов взяты из таблицы экспертных комментариев. Это порядок отображения, не нормативный граф зависимостей.</span></div>'+ordered;
 diagram.querySelectorAll(".node").forEach(b=>b.onclick=()=>go(MODEL.steps.findIndex(s=>s.code===b.dataset.code)));
}
function updateStatus(){
 oldButton.classList.toggle("active",version==="old");
 newButton.classList.toggle("active",version==="new");
 oldButton.setAttribute("aria-pressed",String(version==="old"));
 newButton.setAttribute("aria-pressed",String(version==="new"));
 const work=document.getElementById("work");
 work.dataset.schemeMode=version;
 document.getElementById("diagramHeading").textContent=version==="old"?"Схема процесса · старая":"Схема процесса · новая";
 const legend=document.querySelector(".diagram-panel .change-icon-legend");
 if(legend)legend.textContent=version==="old"?"Исходные формулировки и последовательность":"Рабочая редакция после протокола";
 hint.textContent=version==="old"?"До правок протокола":"После правок протокола";
 const release=document.querySelector(".new-release");
 if(release)release.innerHTML=version==="old"?"<b>Старая схема</b> До протокола":"<b>Рабочая версия</b> По протоколу";
}
function selectedCode(){return MODEL.steps[state.index]?.code||updatedSteps[0].code}
function setVersion(next){
 if(next!==version&&next==="old"&&!window.SID_S0){
  hint.textContent=window.SID_S0_ERROR?"Исходная схема недоступна":"Загружаю исходную схему";
  return;
 }
 if(next===version)return;
 const activeCode=selectedCode();
 try{saveCurrent()}catch(e){}
 for(const step of updatedSteps){
  const record=next==="old"?window.SID_S0?.[step.code]:updatedByCode[step.code];
  if(!record||keys.some(k=>typeof record[k]!=="string")){
   hint.textContent="Недостаточно данных для переключения на старую схему";
   return;
  }
 }
 // Change the complete view atomically: text + sequence + diagram.
 for(const step of updatedSteps){
   const fields=next==="old"?window.SID_S0[step.code]:updatedByCode[step.code];
   for(const key of keys)step[key]=fields[key];
 }
 const ordered=next==="old"?oldCodes.map(code=>byCode[code]):updatedSteps;
 MODEL.steps.splice(0,MODEL.steps.length,...ordered);
 version=next;window.SID_SCHEME_MODE=next;
 state.index=MODEL.steps.findIndex(s=>s.code===activeCode);
 if(state.index<0)state.index=0;
 updateStatus();
 if(next==="old")drawOld();
 else buildDiagram();
 render();
 window.dispatchEvent(new CustomEvent("sidSchemeChanged",{detail:{version,code:activeCode}}));
}
function baselineReady(){
 if(window.SID_S0&&!window.SID_S0_ERROR){
  const ok=oldCodes.every(code=>keys.every(k=>typeof window.SID_S0[code]?.[k]==="string"));
  oldButton.disabled=!ok;
  oldButton.title=ok?"Исходная схема из Excel":"В исходных данных есть пропуски";
  if(!ok)hint.textContent="Исходная схема неполная; выбор недоступен";
 }else{
  oldButton.disabled=true;
  hint.textContent="Не удалось загрузить исходную схему";
 }
}
oldButton.addEventListener("click",()=>setVersion("old"));
newButton.addEventListener("click",()=>setVersion("new"));
window.addEventListener("sidBaselineReady",baselineReady);
baselineReady();
updateStatus();
})();
