/* Overlay S0 -> S1. No changes to MODEL. */
(function(){
"use strict";
const DATA=window.EXPERT_REVIEW_DATA;
if(!DATA)return;
const rows=DATA.rows, allSteps=[...new Set(rows.flatMap(x=>x.target))];
const h=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let source="all",status="all",code="all",q="",neutral=false,openId="";
const n=document.createElement("button");
n.id="expertNav";n.type="button";n.className="expert-nav";n.textContent="✎ Экспертные правки · "+rows.length;
document.querySelector(".new-tabs").insertBefore(n,document.querySelector(".psd-mapping-tab"));
const el=document.createElement("section");
el.id="expertReview";el.className="er-shell hidden";
document.getElementById("work").append(el);
const stateTitle=x=>x==="disputed"?"На обсуждение":x==="ready"?"Проект правки":"Проверить";
const choices=(arr,all)=>'<option value="all">'+all+'</option>'+arr.map(x=>'<option value="'+h(x)+'">'+h(x)+'</option>').join("");
function showCards(){
 const selected=rows.filter(x=>(source==="all"||x.sourceColumn===source)&&(status==="all"||x.status===status)&&(code==="all"||x.target.includes(code))&&(!q||[x.comment,x.mapping,x.oldObject,...x.questions.map(y=>y.question+" "+y.answer)].join(" ").toLowerCase().includes(q)));
 el.querySelector("#erTotal").textContent="Показано "+selected.length+" из "+rows.length+" экспертных комментариев";
 let html=selected.map(x=>{
 const more=openId===x.id;
 const steps=x.target.map(s=>'<button type="button" data-er-step="'+h(s)+'" data-er-id="'+h(x.id)+'">Шаг '+h(s)+'</button>').join("");
 const questions=x.questions.map(y=>'<div class="er-question"><strong>'+h(y.id)+'. '+h(y.question)+'</strong><small>'+h(y.state)+'</small><p>'+h(y.answer)+'</p><span>Источник: '+h(y.source)+'</span></div>').join("");
 const proposals=x.proposals.map(y=>'<div class="er-proposal"><header><strong>'+h(y.type)+' · шаг '+h(y.step)+' · '+h(y.field)+'</strong><button type="button" data-er-step="'+h(y.step)+'" data-er-id="'+h(x.id)+'">На схему</button></header><pre>'+h(y.text)+'</pre><p>'+h(y.note)+'</p></div>').join("");
 return '<article class="er-card"><header><span class="er-tag">✎ ЭКСПЕРТНЫЕ ПРАВКИ · '+h(x.sourceColumn)+'</span><b>Старый шаг '+h(x.oldStep)+'</b><span class="er-state '+h(x.status)+'">'+stateTitle(x.status)+'</span></header><p class="er-comment">'+h(x.comment)+'</p>'+
 '<div class="er-mapping"><div><small>Исходный объект (S0)</small><p>'+h(x.oldObject)+'</p></div><div><small>После правок протокола (S1)</small><p>'+h(x.mapping)+'</p><div class="er-links">'+steps+'</div></div></div>'+
 '<footer><span>'+x.questions.length+' вопросов · '+x.proposals.length+' предложений</span><button type="button" data-er-open="'+h(x.id)+'">'+(more?"Скрыть детали":"Вопросы, ответы, проект правок")+'</button></footer>'+
 (more?'<div class="er-details"><h3>Атомарные вопросы</h3>'+questions+'<h3>Проект изменений к S1 (не применён)</h3>'+proposals+'</div>':"")+'</article>';
 }).join("");
 if(!selected.length)html='<p class="er-empty">По фильтрам нет содержательных комментариев.</p>';
 if(neutral){const a=DATA.neutral.filter(x=>(source==="all"||x.column===source)&&(code==="all"||x.step===code));
 html+='<div class="er-neutral"><h3>Нейтральные отметки (не отменяют другие правки)</h3>'+a.map(x=>'<span>Шаг '+h(x.step)+' · эксперт '+h(x.column)+': '+h(x.comment)+'</span>').join("")+'</div>';
 }
 el.querySelector("#erCards").innerHTML=html;
}
function build(){
 el.innerHTML='<header class="er-hero"><span class="er-tag">✎ ЭКСПЕРТНЫЕ ПРАВКИ</span><h1>Сопоставление экспертных комментариев с актуальной схемой</h1>'+
 '<p><strong>S0</strong> - старая схема из Excel, <strong>S1</strong> - редакция после протокола. Экспертные правки показаны как предложения, основной текст схемы не изменён.</p>'+
 '<div class="er-metrics"><div><b>'+rows.length+'</b><small>Содержательных комментариев</small></div><div><b>'+rows.filter(x=>x.status==="ready").length+'</b><small>Проекты к рассмотрению</small></div><div><b>'+rows.filter(x=>x.status==="disputed").length+'</b><small>На обсуждение</small></div><div><b>'+DATA.neutral.length+'</b><small>Нейтральных отметок</small></div></div></header>'+
 '<p class="er-info"><strong>«Правки не нужны»</strong> - нейтральное замечание конкретного эксперта. Оно не перекрывает содержательные правки другого эксперта. Метки «Экспертные правки» отличаются от изменений по протоколу.</p>'+
 '<div class="er-toolbar"><label>Эксперт<select id="erSource">'+choices(["К","Ю"],"Оба эксперта")+'</select></label><label>Состояние<select id="erStatus"><option value="all">Все</option><option value="ready">Проект правки</option><option value="disputed">На обсуждение</option></select></label>'+
 '<label>Шаг S1<select id="erStep">'+choices(allSteps.map(x=>x),"Все шаги")+'</select></label><label class="er-search">Поиск<input id="erSearch" type="search" placeholder="Слова комментария, вопроса…"></label><label class="er-check"><input id="erNeutral" type="checkbox"> Нейтральные отметки</label></div>'+
 '<p id="erTotal" class="er-total"></p><div id="erCards"></div>';
 for(const [id,handler] of [["erSource",v=>source=v],["erStatus",v=>status=v],["erStep",v=>code=v]])el.querySelector("#"+id).onchange=ev=>{handler(ev.target.value);showCards()};
 el.querySelector("#erSearch").oninput=ev=>{q=ev.target.value.toLowerCase();showCards()};
 el.querySelector("#erNeutral").onchange=ev=>{neutral=ev.target.checked;showCards()};
 el.addEventListener("click",ev=>{
  const expand=ev.target.closest("[data-er-open]");if(expand){openId=openId===expand.dataset.erOpen?"":expand.dataset.erOpen;showCards();return}
  const step=ev.target.closest("[data-er-step]");if(step){openStep(step.dataset.erStep,step.dataset.erId)}
 });
 showCards();
}
function review(){
 document.getElementById("work").classList.add("er-active");el.classList.remove("hidden");
 n.classList.add("active");document.getElementById("newViewProtocol").classList.remove("active");document.getElementById("newViewScheme").classList.remove("active");
}
function leave(){document.getElementById("work").classList.remove("er-active");el.classList.add("hidden");n.classList.remove("active")}
n.onclick=review;
for(const id of ["newViewProtocol","newViewScheme"])document.getElementById(id).addEventListener("click",leave);
function openStep(step,id){
 leave();document.getElementById("newViewScheme").click();
 const idx=MODEL.steps.findIndex(s=>s.code===step);
 if(idx>=0&&typeof go==="function")go(idx);
 document.querySelector(".step-panel .question-scroll")?.scrollTo({top:0,behavior:"smooth"});
 if(innerWidth<1050)document.getElementById("questionTitle")?.scrollIntoView({block:"start"});
}
function decorate(){
 document.querySelectorAll("#diagram .node").forEach(node=>{
  const code=node.dataset.code,related=rows.filter(r=>r.target.includes(code));
  if(!related.length)return;
  node.classList.add("er-node");
  let badge=node.querySelector(".er-node-label");
  if(!badge){badge=document.createElement("span");badge.className="er-node-label";node.append(badge)}
  badge.textContent="✎ экспертные правки · "+related.length;
 });
}
function stepReview(){
 if(document.getElementById("work").classList.contains("er-active"))return;
 const current=MODEL.steps[state.index];if(!current)return;
 let panel=document.getElementById("erStepPanel");
 if(!panel){panel=document.createElement("section");panel.id="erStepPanel";panel.className="er-step-panel";
 document.getElementById("prcSelection").insertAdjacentElement("afterend",panel);
 panel.addEventListener("click",ev=>{const b=ev.target.closest("[data-er-details]");if(b){code=b.dataset.erDetails;openId=b.dataset.erId;review();showCards()}});
 }
 const a=rows.filter(r=>r.target.includes(current.code));
 panel.classList.toggle("hidden",!a.length);
 panel.innerHTML=a.length?'<header><b>✎ Экспертные правки · '+a.length+'</b><small>Предложения к S1, отдельно от протокола</small></header>'+
 a.map(r=>'<div class="er-step-item"><span class="er-state '+h(r.status)+'">'+stateTitle(r.status)+'</span><span>Эксперт '+h(r.sourceColumn)+' · S0 шаг '+h(r.oldStep)+'</span><button type="button" data-er-details="'+h(current.code)+'" data-er-id="'+h(r.id)+'">Предложенная редакция</button></div>').join(""):"";
}
build();decorate();stepReview();
new MutationObserver(stepReview).observe(document.getElementById("questionTitle"),{childList:true,subtree:true,characterData:true});
if(new URLSearchParams(location.search).get("expert")==="1")review();
})();
