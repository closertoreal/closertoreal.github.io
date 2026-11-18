/* Step-card source switcher.
 * Protocol: S0 -> current S1.
 * Expert: S0 -> expert draft on S0.
 * Combined: S0 -> current S1 plus ALL expert proposals (ambiguous ones as alternatives).
 * One immutable baseline for every comparison; MODEL itself is never mutated.
 */
(function(){
"use strict";
if(typeof MODEL==="undefined"||typeof CHANGE_BASELINE==="undefined"||typeof render!=="function")return;
const KEYS=["title","input","action","output"];
const EXP=window.EXPERT_REVIEW_DATA?.rows||[];
const encode=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let mode="combined",highlight=true;
let lastView="";const TOTAL=MODEL.steps.length;
function getProposals(code){
 return EXP.flatMap(record=>(record.proposals||[]).filter(p=>String(p.step)===String(code)).map(p=>({
   field:p.field,text:String(p.text||"").trim(),id:record.id,who:record.sourceColumn,status:record.status,note:p.note||""
 }))).filter(p=>KEYS.includes(p.field));
}
function baseline(step){
 const legacy=CHANGE_BASELINE[step.code]||{};
 const exact=window.SID_S0?.[step.code]||{};
 return Object.fromEntries(KEYS.map(k=>[k,exact[k]??legacy[k]??step[k]]));
}
function tokens(str){return String(str).match(/[^\s]+[ \t]*|\r?\n|[ \t]+/g)||[]}
function differ(before,after){
 if(before===after)return encode(after);
 const aa=tokens(before),bb=tokens(after),n=aa.length,m=bb.length;
 if(n*m>300000)return '<del class="diff-remove">'+encode(before)+'</del><ins class="diff-add">'+encode(after)+'</ins>';
 const w=m+1,dp=new Uint16Array((n+1)*w);
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
   dp[i*w+j]=aa[i]===bb[j]?dp[(i+1)*w+j+1]+1:Math.max(dp[(i+1)*w+j],dp[i*w+j+1]);
 const runs=[];function push(kind,t){const x=runs[runs.length-1];if(x&&x.kind===kind)x.text+=t;else runs.push({kind,text:t})}
 let i=0,j=0;while(i<n||j<m){
   if(i<n&&j<m&&aa[i]===bb[j]){push("same",aa[i]);i++;j++}
   else if(i<n&&(j>=m||dp[(i+1)*w+j]>=dp[i*w+j+1])){push("removed",aa[i]);i++}
   else{push("added",bb[j]);j++}
 }
 return runs.map(x=>x.kind==="same"?encode(x.text):x.kind==="removed"?'<del class="diff-remove">'+encode(x.text)+'</del>':'<ins class="diff-add">'+encode(x.text)+'</ins>').join("");
}
function simplify(str,field){
 return String(str||"").replace(field==="input"?/^Вход\s*\n/:field==="output"?/^Выход\s*\n/:/^(?!)$/,"");
}
function keyOf(p){
 const numbered=p.text.match(/^(\d+[а-я]?\.\d+)\.\s/);
 if(numbered)return"num:"+numbered[1];
 if(p.field==="title")return"title";
 if(/ЗЭН|ЭкоЗОС/i.test(p.text))return"same:ecology";
 if(/Паспорта трубопроводов/i.test(p.text))return"same:pipelines";
 if(/сопроводительное письмо/i.test(p.text))return"same:letter";
 return"unique:"+p.id+":"+p.text;
}
function apply(base,proposals,field,issues){
 let value=String(base??"");
 const grouped=new Map();
 for(const p of proposals){const k=keyOf(p);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(p)}
 for(const [key,list] of grouped){
   if(list.length>1){
     issues.conflicts.push({field,key,proposals:list});
     for(const p of list)value+="\n⚠ Альтернатива · эксперт "+p.who+" ("+p.id+", не выбрана): "+p.text;
     continue;
   }
   const p=list[0];
   if(field==="title"){value=p.text;continue}
   if(key.startsWith("num:")){
     const numbered=key.slice(4); // consists only of digits and Cyrillic letters
     const exp=new RegExp("(^|\\n)"+numbered+"\\.\\s[^\\n]*(?:\\n(?!\\d+[а-я]?\\.\\d+\\.\\s)[^\\n]*)*","u");
     if(exp.test(value)){value=value.replace(exp,(whole,prefix)=>prefix+p.text);continue}
   }
   if(!value.includes(p.text)){
     issues.excerpts.push(p);
     value+="\n✎ Предложение эксперта "+p.who+" ("+p.id+", место уточняется): "+p.text;
   }
 }
 return value;
}
function project(step,selected){
 const base=baseline(step),proposals=getProposals(step.code),draft={},
 issues={conflicts:[],excerpts:[],count:proposals.length};
 for(const field of KEYS){
   const seed=selected==="expert"?base[field]:step[field];
   draft[field]=(selected==="protocol")?seed:apply(seed,proposals.filter(x=>x.field===field),field,issues);
 }
 return{base,draft,issues,proposals};
}
function repaint(){
 const step=MODEL.steps[state.index],root=document.getElementById("newDiff");
 if(!step||!root)return;
 const oldStatus=root.querySelector(".diff-meta");
 const result=project(step,mode),{base,draft,issues}=result;
 const changed=KEYS.some(k=>base[k]!==draft[k]);
 const moved=OLD_SEQUENCE.indexOf(step.code)!==state.index;
 const haveProtocol=KEYS.some(k=>baseline(step)[k]!==step[k])||moved;
 const n=result.proposals.length;
 document.documentElement.classList.toggle("new-diff-active",Boolean(highlight&&changed));
 if(!haveProtocol&&!n){root.classList.add("hidden");return}
 root.classList.remove("hidden");
 const nProto=(PROTOCOL_CHANGE_IDS[step.code]||[]).length;
 const buttons=[["protocol","Протокол",nProto],["expert","Эксперты",n],["combined","Совмещённые",0]].map(([k,label,count])=>
   '<button type="button" data-change-view="'+k+'" class="source-compare-btn'+(mode===k?" active":"")+'" aria-pressed="'+String(mode===k)+'">'+label+
   (count?'<small>'+count+'</small>':"")+'</button>').join("");
 let description=mode==="protocol"?"Только изменения протокола.":"";
 if(mode==="expert")description="Только экспертные предложения, перенесённые на актуальные шаги. Их исходная точка - S0.";
 if(mode==="combined")description="Все изменения протокола и экспертные предложения. Ни один спорный вариант не принят автоматически.";
 const conflict=issues.conflicts.length?'<p class="source-compare-warning">⚠ '+issues.conflicts.length+' конфликт(ов) вариантов: все формулировки сохранены, решение ещё не принято.</p>':"";
 const uncertain=issues.excerpts.length?'<p class="source-compare-secondary">✎ '+issues.excerpts.length+' предложение(й) показано отдельно: точное место замены пока не определено.</p>':"";
 const order=moved&&mode!=="expert"?'<p class="new-diff-order">↕ Место шага изменено: было '+(OLD_SEQUENCE.indexOf(step.code)+1)+', стало '+(state.index+1)+'.</p>':"";
 root.innerHTML='<div class="source-compare-header"><strong>Изменения шага · сравнение с S0</strong>'+
 '<span><del class="diff-remove">Удалено</del><ins class="diff-add">Добавлено</ins></span></div>'+
 '<div class="source-compare-buttons" role="group" aria-label="Источник правок к карточке">'+buttons+'</div>'+
 '<div class="source-compare-about"><span>'+encode(description)+'</span>'+
 '<button type="button" id="changeDiffToggle">'+(highlight?"Показать текущую S1":"Показать изменения")+'</button></div>'+
 conflict+uncertain+order+
 '<div class="source-compare-baseline">База для всех трёх режимов: '+(window.SID_S0?'полная исходная схема S0 из Excel':window.SID_S0_ERROR?'⚠ Ошибка загрузки исходной S0; сравнение неполное':'исходная S0 загружается')+'. Экспертные предложения - неутверждённый проект.</div>';
 if(mode==="protocol"&&oldStatus)root.append(oldStatus); // preserve existing step-status editor and its listeners
 root.querySelectorAll("[data-change-view]").forEach(b=>b.addEventListener("click",()=>{
   mode=b.dataset.changeView;highlight=true;render();
 }));
 root.querySelector("#changeDiffToggle").addEventListener("click",()=>{highlight=!highlight;render()});
 if(!highlight){
   document.documentElement.classList.remove("new-diff-active");
   document.querySelectorAll(".quote-inline").forEach(b=>{b.disabled=false;b.removeAttribute("title")});
   return;
 }
 document.getElementById("questionTitle").innerHTML="Шаг "+encode(step.code)+". "+differ(base.title,draft.title);
 for(const field of ["input","action","output"]){
   document.getElementById(field).innerHTML='<div class="item new-inline-diff">'+differ(simplify(base[field],field),simplify(draft[field],field))+'</div>';
 }
 document.querySelectorAll(".quote-inline").forEach(b=>{b.disabled=true;b.title="Для цитирования переключись на чистовой текст"});
}
const previousRender=render;
render=function(){previousRender();repaint()};
window.addEventListener("sidReviewMode",ev=>{
 const requested=ev.detail?.mode;
 if(["protocol","expert","combined"].includes(requested)){mode=requested;highlight=true;render()}
});
window.SID_COMPARE_DEBUG={project,mode:()=>mode,proposals:getProposals};
window.addEventListener("sidBaselineReady",()=>render());
repaint();
})();
