/* Unified inline review v2: step + protocol + expert notes on ONE screen.
   This file never changes MODEL, protocol data, or local user comments. */
(function(){
"use strict";
const expert=window.EXPERT_REVIEW_DATA;
const panel=document.getElementById("prcPanel");
if(!expert||!panel||!window.document)return;
const E=String;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const steps=MODEL.steps;
const codes=new Set(steps.map(s=>s.code));
const expertRecords=expert.rows.map(r=>({...r,origin:"expert",steps:r.target.filter(s=>codes.has(s))}));
function protocolRecords(){
 let saved={};try{saved=JSON.parse(localStorage.getItem("sid-new-protocol-v1")||"{}")||{}}catch(e){}
 const edits=saved.edits||{};
 const base=(typeof PROTOCOL_SOURCE==="undefined"?[]:PROTOCOL_SOURCE).map(([n,box,kind,text,linked])=>({
  id:"P-"+n,n,origin:"protocol",kind,sourceBox:box,text,
  steps:String(linked||"").split(",").map(x=>x.trim()).filter(x=>codes.has(x)),
  note:edits["S-"+n]?.note||"",status:edits["S-"+n]?.status||""
 }));
 const notes=(saved.notes||[]).map((x,i)=>({
  id:"PN-"+(x.uid||i),origin:"protocol",n:0,kind:x.kind||"Комментарий",
  sourceBox:(x.boxes||[]).join(", "),text:String(x.text||""),
  steps:(x.steps||[]).map(String).filter(s=>codes.has(s)),
  note:x.note||"",status:x.status||""
 }));
 return base.concat(notes);
}
let source="all",scope="step",disputed=false,search="",selected=null,expanded=false,mobileDetail=false,questionOpen=false;
let lastStep=null;
const hub=document.createElement("div");hub.id="erHub";hub.className="er-hub";
hub.setAttribute("aria-label","Комментарии протокола и экспертов к шагам схемы");
panel.append(hub);
document.getElementById("prcHeading").textContent="Правки и комментарии";
document.getElementById("prcCount").textContent="Протокол и экспертные замечания";
const data=()=>expertRecords.concat(protocolRecords());
const atStep=()=>steps[state.index]?.code||"";
const snippet=(t,n)=>{let s=String(t||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1).trimEnd()+"…":s};
function matches(r){
 const input=[r.comment,r.text,r.mapping,r.oldObject,r.oldStep,r.n,r.kind,r.note,...(r.questions||[]).map(x=>x.question+" "+x.answer),...(r.proposals||[]).map(x=>x.text)].join(" ").toLowerCase();
 return (source==="all"||r.origin===source)&&(!disputed||r.origin==="expert"&&r.status==="disputed")&&
  (scope==="all"||r.steps.includes(atStep()))&&(!search||input.includes(search));
}
function listCount(){
 const at=atStep(),es=expertRecords.filter(x=>x.steps.includes(at)).length;
 const ps=protocolRecords().filter(x=>x.steps.includes(at)).length;
 return {es,ps};
}
function build(){
 hub.innerHTML=
 '<div class="er-toolbar">'+
 '<div class="er-source" role="group" aria-label="Источник замечаний">'+
 '<button type="button" data-er-source="all">Все</button>'+
 '<button type="button" data-er-source="expert">✎ Эксперты</button>'+
 '<button type="button" data-er-source="protocol">Протокол</button></div>'+
 '<div class="er-toolbar-second"><label class="er-scope-control"><span class="sr-only">Область просмотра</span><select id="erScope"><option value="step">К этому шагу</option><option value="all">Все шаги</option></select></label>'+
 '<label class="er-filter-disputed"><input type="checkbox" id="erDisputed"> Спорные</label>'+
 '<label class="er-search"><span class="sr-only">Поиск по комментариям</span><input id="erSearch" type="search" placeholder="Поиск по правкам…" aria-label="Поиск по комментариям"></label>'+
 '<button class="er-expand" type="button" aria-pressed="false" title="Увеличить панель материалов">Развернуть</button></div></div>'+
 '<div class="er-context"><span id="erContext"></span><span id="erMatches"></span></div>'+
 '<div class="er-core"><div class="er-list" id="erList" role="listbox" aria-label="Замечания и правки"></div>'+
 '<div class="er-detail" id="erDetail" aria-live="polite"></div></div>';
 hub.querySelector("#erScope").value=scope;
 hub.querySelector("#erDisputed").checked=disputed;
 hub.querySelector("#erSearch").value=search;
 hub.addEventListener("click",onClick);
 hub.querySelector("#erScope").addEventListener("change",ev=>{scope=ev.target.value;selected=null;mobileDetail=false;refresh()});
 hub.querySelector("#erDisputed").addEventListener("change",ev=>{disputed=ev.target.checked;selected=null;mobileDetail=false;refresh()});
 hub.querySelector("#erSearch").addEventListener("input",ev=>{search=ev.target.value.trim().toLowerCase();selected=null;mobileDetail=false;refresh()});
 refresh();
}
function label(r){
 if(r.origin==="expert")return 'Эксперт '+esc(r.sourceColumn)+' · S0 шаг '+esc(r.oldStep);
 return r.n?'Протокол · №'+r.n:'Протокол · доп. запись';
}
function listItem(r){
 const active=r.id===selected;
 const subject=r.origin==="expert"?r.comment:r.text;
 const state=r.origin==="expert"&&r.status==="disputed"?'<span class="er-flag">Вопрос РГ</span>':"";
 return '<button type="button" role="option" aria-selected="'+String(active)+'" data-er-item="'+esc(r.id)+'" class="er-item'+(active?" is-selected":"")+' '+r.origin+'">'+
 '<span class="er-item-meta"><span class="er-source-name">'+label(r)+'</span>'+state+'</span>'+
 '<span class="er-item-text">'+esc(snippet(subject,145))+'</span>'+
 (scope==="all"?'<span class="er-item-steps">S1: '+esc(r.steps.join(", ")||"без шага")+'</span>':"")+
 '</button>';
}
function currentField(p){
 const step=steps.find(x=>x.code===p.step);
 if(!step)return "";
 const fields={input:"input",action:"action",output:"output",title:"title",structure:"action"};
 const f=fields[String(p.field).toLowerCase()]||p.field;
 return typeof step[f]==="string"?step[f]:"";
}
function proposal(p,index){
 const original=currentField(p);
 const fieldText={input:"Вход",action:"Действие",output:"Выход",title:"Заголовок"}[p.field]||p.field;
 return '<section class="er-proposal">'+
 '<div class="er-proposal-head"><b>Шаг '+esc(p.step)+' · '+esc(fieldText)+'</b><span>Предложение, не внесено</span>'+
 '<button type="button" data-er-goto="'+esc(p.step)+'">Показать шаг</button></div>'+
 '<div class="er-proposal-text">'+esc(p.text)+'</div>'+
 (p.note?'<p class="er-proposal-note">'+esc(p.note)+'</p>':"")+
 (original?'<details class="er-current"><summary>Сравнить с действующим текстом S1</summary><pre>'+esc(original)+'</pre></details>':"")+
 '</section>';
}
function question(q){
 const needs=/РГ/.test(q.state||"");
 return '<div class="er-question'+(needs?" er-open-question":"")+'">'+
 '<div class="er-question-head"><b>'+esc(q.question)+'</b>'+(needs?'<span>Нужна РГ</span>':"")+'</div>'+
 '<div class="er-answer">'+esc(q.answer)+'</div>'+
 (q.source?'<div class="er-evidence">Источник: '+esc(q.source)+'</div>':"")+'</div>';
}
function expertDetail(r){
 const pending=r.questions.filter(x=>/РГ/.test(x.state||""));
 const verified=r.questions.filter(x=>!/РГ/.test(x.state||""));
 const tag=r.status==="disputed"?'<span class="er-detail-warning">Есть открытые вопросы</span>':"";
 return '<div class="er-detail-head"><button type="button" class="er-back" data-er-back>← К списку</button>'+
 '<span class="er-detail-source expert">✎ Эксперт '+esc(r.sourceColumn)+'</span>'+tag+'</div>'+
 '<h3>Комментарий к старому шагу '+esc(r.oldStep)+'</h3>'+
 '<div class="er-full-comment">'+esc(r.comment)+'</div>'+
 '<div class="er-targets"><span>Актуальные шаги S1:</span>'+
 r.steps.map(x=>'<button type="button" data-er-goto="'+esc(x)+'"'+(atStep()===x?' class="is-current"':'')+'>Шаг '+esc(x)+'</button>').join("")+'</div>'+
 '<details class="er-mapping"><summary>Как комментарий перенесён с S0 на S1</summary>'+
 '<p><strong>Было:</strong> '+esc(r.oldObject)+'</p>'+
 '<p><strong>После протокола:</strong> '+esc(r.mapping)+'</p></details>'+
 '<h4>Что предлагается изменить</h4>'+
 r.proposals.map(proposal).join("")+
 (pending.length?'<h4 class="er-open-title">Что ещё выяснить у рабочей группы · '+pending.length+'</h4>'+pending.map(question).join(""):"")+
 (verified.length?'<details class="er-researched"'+(questionOpen?' open':'')+'><summary>Остальные вопросы, ответы и источники · '+verified.length+'</summary>'+verified.map(question).join("")+'</details>':"")+
 '<p class="er-nonfinal">Предложения отделены от текста схемы и от протокольных правок. «Правки не нужны» другого эксперта не отменяет их.</p>';
}
function protocolDetail(r){
 return '<div class="er-detail-head"><button type="button" class="er-back" data-er-back>← К списку</button><span class="er-detail-source protocol">Протокол</span></div>'+
 '<h3>'+(r.n?'Пункт №'+r.n:'Новая запись')+' · '+esc(r.kind)+'</h3>'+
 '<div class="er-full-comment">'+esc(r.text)+'</div>'+
 '<div class="er-targets"><span>Связанные шаги:</span>'+r.steps.map(s=>'<button type="button" data-er-goto="'+esc(s)+'"'+(atStep()===s?' class="is-current"':'')+'>Шаг '+esc(s)+'</button>').join("")+'</div>'+
 (r.note?'<div class="er-protocol-note"><b>Проработка</b><p>'+esc(r.note)+'</p></div>':"")+
 '<p class="er-nonfinal">Источник: исходный протокол. Экспертные правки отображаются отдельными записями.</p>';
}
function refresh(){
 if(!hub.isConnected)return;
 const all=data(),visible=all.filter(matches);
 if(!visible.some(x=>x.id===selected))selected=visible[0]?.id||null;
 const current=atStep(),num=listCount();
 hub.querySelector("#erContext").textContent=scope==="step"?"Шаг "+current+" · экспертных "+num.es+", протокол "+num.ps:"Все шаги";
 hub.querySelector("#erMatches").textContent=visible.length+" записей";
 hub.querySelectorAll("[data-er-source]").forEach(b=>{const active=b.dataset.erSource===source;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active))});
 panel.classList.toggle("er-expanded",expanded);
 hub.querySelector(".er-expand").textContent=expanded?"Свернуть":"Развернуть";
 hub.querySelector(".er-expand").setAttribute("aria-pressed",String(expanded));
 const list=hub.querySelector("#erList"),previousScroll=list.scrollTop;
 list.innerHTML=visible.length?visible.map(listItem).join("")+
 (scope==="step"?'<button type="button" class="er-more" data-er-all>Посмотреть все '+all.length+' записей</button>':""):
 '<div class="er-list-empty">По этому фильтру записей нет.'+
 (scope==="step"?'<button type="button" data-er-all>Посмотреть все шаги</button>':"")+'</div>';
 list.scrollTop=previousScroll;
 const record=all.find(x=>x.id===selected);
 hub.querySelector("#erDetail").innerHTML=record?(record.origin==="expert"?expertDetail(record):protocolDetail(record)):
 '<div class="er-detail-empty">Выбери комментарий слева, чтобы увидеть исходный текст, связанные шаги и предлагаемую правку. Схема остаётся на этом же экране.</div>';
 hub.classList.toggle("er-mobile-detail",mobileDetail&&!!record);
}
function goStep(code){
 const idx=steps.findIndex(x=>x.code===code);
 if(idx<0)return;
 lastStep=atStep();
 followStep.previous=code;
 go(idx);
 refresh();
 const row=hub.querySelector(".er-detail");if(row)row.scrollTop=0;
 if(window.innerWidth<1000)document.querySelector(".step-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function onClick(ev){
 const b=ev.target.closest("button");
 if(!b||!hub.contains(b))return;
 if(b.hasAttribute("data-er-source")){source=b.dataset.erSource;selected=null;mobileDetail=false;refresh();return}
 if(b.hasAttribute("data-er-all")){scope="all";hub.querySelector("#erScope").value="all";selected=null;mobileDetail=false;refresh();return}
 if(b.hasAttribute("data-er-item")){
  selected=b.dataset.erItem;mobileDetail=true;
  const record=data().find(r=>r.id===selected);
  if(record&&record.steps.length&&!record.steps.includes(atStep())){
    const code=record.steps[0],idx=steps.findIndex(s=>s.code===code);
    if(idx>=0){followStep.previous=code;go(idx)}
  }
  refresh();
  hub.querySelector("#erDetail").scrollTop=0;
  if(record)window.dispatchEvent(new CustomEvent("sidReviewMode",{detail:{mode:record.origin==="expert"?"expert":"protocol"}}));
  return;
 }
 if(b.hasAttribute("data-er-back")){mobileDetail=false;refresh();return}
 if(b.hasAttribute("data-er-goto")){goStep(b.dataset.erGoto);return}
 if(b.classList.contains("er-expand")){expanded=!expanded;refresh();return}
}
function annotateDiagram(){
 document.querySelectorAll("#diagram .node").forEach(node=>{
  const n=expertRecords.filter(r=>r.steps.includes(node.dataset.code)).length;
  if(!n)return;
  node.classList.add("er-expert-node");
  let tag=node.querySelector(".er-expert-label");
  if(!tag){tag=document.createElement("span");tag.className="er-expert-label";node.append(tag)}
  tag.textContent="✎ "+n+" эксперт.";
  tag.title=n+" экспертных замечаний к шагу";
 });
}
function followStep(){
 const step=atStep();
 if(step!==followStep.previous){
  followStep.previous=step;
  if(scope==="step"){selected=null;mobileDetail=false}
  refresh();
 }
}
const title=document.getElementById("questionTitle");
if(title)new MutationObserver(followStep).observe(title,{childList:true,subtree:true,characterData:true});
window.addEventListener("storage",ev=>{if(ev.key==="sid-new-protocol-v1")refresh()});
window.addEventListener("pageshow",refresh);
if(new URLSearchParams(location.search).get("expert")==="1"){source="expert";scope="all"}
build();annotateDiagram();followStep();
})();
