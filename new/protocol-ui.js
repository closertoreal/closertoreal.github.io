/* Протокол по разделам 00–06/Н. Исходные 63 пункта неизменны. */
(function(){
"use strict";
const KEY="sid-new-protocol-v1";
const CODES=PROTOCOL_BOXES.map(x=>x[0]),NAMES=Object.fromEntries(PROTOCOL_BOXES);
const BOX_STATES=["Статус не установлен","Не обсуждалось","Обсуждалось — нет изменений","Есть решения","Ожидает подтверждения"];
const REC_STATES=["Зафиксировано в источнике","Требует подтверждения","Подтверждено участниками","Есть противоречие","Поручено в работу","Внесено в проект артефакта","Согласовано для публикации","Отклонено"];
const TYPES=["AS IS","Правка схемы","Решение","Вопрос","Задача","Требование","Гипотеза","Риск","Проверка","Уточнение","Другое"];
const defaults=()=>({meeting:{title:"Разбор схемы СМР и артефактов СИД",date:"",participants:"",moderator:""},boxStatuses:{},edits:{},notes:[],imports:[],stepStatuses:{}});
let pr=defaults(),selected="all",search="";
try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");if(saved&&typeof saved==="object")pr={...defaults(),...saved,meeting:{...defaults().meeting,...saved.meeting}}}catch(e){}
const e=x=>esc(x??""),byUid={};
const sources=PROTOCOL_SOURCE.map(([n,box,kind,text,steps])=>({uid:"S-"+n,n,kind,text,sourceBox:box,source:"Исходный протокол, пункт "+n,steps:steps?steps.split(","):[]}));
sources.forEach(x=>byUid[x.uid]=x);
function entry(row){if(row.n){const d=pr.edits[row.uid]||{};return {...row,boxes:Array.isArray(d.boxes)?d.boxes:[row.sourceBox],status:d.status||"Зафиксировано в источнике",owner:d.owner||"",deadline:d.deadline||"",evidence:d.evidence||"",note:d.note||""}}return {...row,boxes:Array.isArray(row.boxes)?row.boxes:[],status:row.status||"Требует подтверждения",owner:row.owner||"",deadline:row.deadline||"",evidence:row.evidence||"",note:row.note||"",steps:Array.isArray(row.steps)?row.steps:[]}}
const entries=()=>sources.map(entry).concat(pr.notes.map(entry));
const unclassified=x=>!x.boxes.length||x.boxes.some(c=>!CODES.includes(c));
const matches=(x,c)=>c==="all"||c==="unclassified"&&unclassified(x)||x.boxes.includes(c);
const count=c=>entries().filter(x=>matches(x,c)).length;
const options=(values,current)=>values.map(x=>'<option value="'+e(x)+'"'+(x===current?' selected':'')+'>'+e(x)+'</option>').join("");
function save(){try{localStorage.setItem(KEY,JSON.stringify(pr))}catch(err){message("Не удалось сохранить локально. Экспортируйте JSON.")}}
function message(s){const x=document.getElementById("prFeedback");if(x)x.textContent=s}
function field(uid,key,value){if(uid.startsWith("S-")){pr.edits[uid]??={};pr.edits[uid][key]=value}else{const x=pr.notes.find(n=>n.uid===uid);if(x)x[key]=value}save()}
function renderMetrics(){const a=entries();document.getElementById("prMetrics").innerHTML=[[63,"пункта источника"],[pr.notes.length,"новых и импортированных"],[a.filter(unclassified).length,"не распределено"],[a.filter(x=>["Требует подтверждения","Есть противоречие"].includes(x.status)).length,"требуют подтверждения"]].map(([n,t])=>'<div class="pr-metric"><strong>'+n+'</strong><span>'+e(t)+'</span></div>').join("")}
function renderBoxes(){
  function box(code,name){const status=code==="all"?"Все записи и нераспределённые":code==="unclassified"?"Требует ручной классификации":pr.boxStatuses[code]||BOX_STATES[0];return '<button type="button" data-pr-box="'+e(code)+'" class="pr-box'+(selected===code?' active':'')+(code==="unclassified"?' unclassified':'')+'"><div class="pr-box-head"><span class="pr-box-code">'+e(code==="unclassified"?"! Вне структуры":code)+'</span><span class="pr-count">'+count(code)+'</span></div><div class="pr-box-title">'+e(name)+'</div><div class="pr-box-state">'+e(status)+'</div></button>'}
  document.getElementById("prBoxes").innerHTML=box("all","Все разделы и записи")+PROTOCOL_BOXES.map(x=>box(x[0],x[1])).join("")+box("unclassified","Не распределено / вне структуры");
}
function renderBoxStatus(){
  const root=document.getElementById("prBoxStatus");
  if(selected==="all"){root.innerHTML='<p class="pr-note">Одна запись может относиться к нескольким разделам. Статус раздела не определяется автоматически количеством записей.</p>';return}
  if(selected==="unclassified"){root.innerHTML='<div class="pr-box-status"><strong>Очередь классификации.</strong> Записи без подходящей категории сохраняются в протоколе и выгрузке.</div>';return}
  root.innerHTML='<div class="pr-box-status"><label for="prStatusSelect">Статус раздела '+e(selected)+'</label><select id="prStatusSelect" data-pr-box-status>'+options(BOX_STATES,pr.boxStatuses[selected]||BOX_STATES[0])+'</select><span class="pr-note">Устанавливается участником вручную.</span></div>';
}
function card(x){
  const tags=x.boxes.length?x.boxes.map(c=>'<span class="pr-pill'+(CODES.includes(c)?'':' unclassified')+'">'+e(c)+'</span>').join(""):'<span class="pr-pill unclassified">Не распределено</span>';
  const links=x.steps.filter(c=>MODEL.steps.some(s=>s.code===c)).map(c=>'<button type="button" class="pr-step-link" data-pr-step="'+e(c)+'">шаг '+e(c)+'</button>').join("");
  const cats=PROTOCOL_BOXES.map(([c,n])=>'<label title="'+e(n)+'"><input type="checkbox" data-pr-edit="'+e(x.uid)+'" data-pr-category="'+e(c)+'"'+(x.boxes.includes(c)?' checked':'')+'> '+e(c)+'</label>').join("");
  const input=(name,label,type="text")=>'<div><label>'+label+'</label><input type="'+type+'" data-pr-edit="'+e(x.uid)+'" data-pr-field="'+name+'" value="'+e(x[name])+'"></div>';
  return '<article class="pr-card"><div class="pr-card-head"><strong>'+e(x.n?"№ "+x.n:"Новая запись")+'</strong><span class="pr-pill kind">'+e(x.kind)+'</span>'+tags+'<span class="pr-pill">'+e(x.status)+'</span></div>'+
  '<p class="pr-source">'+e(x.text)+'</p><div class="pr-card-foot"><span>'+e(x.source||"Добавлено вручную")+'</span>'+links+(x.owner?'<span>Ответственный: '+e(x.owner)+'</span>':'')+(x.deadline?'<span>Срок: '+e(x.deadline)+'</span>':'')+'</div>'+
  '<details class="pr-editor"><summary>Классификация, подтверждение, задачи и доказательства</summary><div class="pr-editor-grid"><div class="wide"><label>Разделы Confluence (можно несколько)</label><div class="pr-category-choices">'+cats+'</div></div>'+
  '<div><label>Статус записи</label><select data-pr-edit="'+e(x.uid)+'" data-pr-field="status">'+options(REC_STATES,x.status)+'</select></div>'+
  input("owner","Ответственный")+input("deadline","Срок","date")+input("evidence","Источник / доказательство")+
  '<div class="wide"><label>Решение, поручение, конфликт, связь с артефактом</label><textarea rows="3" data-pr-edit="'+e(x.uid)+'" data-pr-field="note">'+e(x.note)+'</textarea></div>'+
  (x.n?'':'<div class="wide"><label>Формулировка новой записи</label><textarea rows="3" data-pr-edit="'+e(x.uid)+'" data-pr-field="text">'+e(x.text)+'</textarea></div>')+
  '</div></details></article>';
}
function renderList(){
  const a=entries().filter(x=>matches(x,selected)).filter(x=>!search||[x.text,x.kind,x.owner,x.note,x.source,...x.steps].join(" ").toLowerCase().includes(search));
  const name=selected==="all"?"Все записи":selected==="unclassified"?"Не распределено / вне структуры":selected+" · "+NAMES[selected];
  document.getElementById("prListTitle").textContent=name+" · "+a.length;
  document.getElementById("prList").innerHTML=a.length?a.map(card).join(""):'<div class="pr-empty">Записей нет. Это не означает, что тема проверена: статус обсуждения задаётся отдельно.</div>';
  renderMetrics();
}
function renderLog(){document.getElementById("prImportLog").innerHTML=pr.imports.length?'<strong>Импортов: '+pr.imports.length+'</strong><ul>'+pr.imports.slice(-5).map(x=>'<li>'+e(x.from)+' · '+e(x.date||"без даты")+' · '+x.added+' записей</li>').join("")+'</ul>':'<p>Импортов пока не было.</p>'}
function renderAll(){renderBoxes();renderBoxStatus();renderList();renderLog()}
function blob(name,content,type){const b=new Blob([content],{type}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportJson(){blob("СИД_протокол_NEW_"+(pr.meeting.date||"без_даты")+".json",JSON.stringify({format:"sid-protocol-new-v1",exportedAt:new Date().toISOString(),author:pr.meeting.moderator||state.fio||"",data:pr},null,2),"application/json;charset=utf-8")}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(36)}
function importJson(payload){
  if(payload?.format!=="sid-protocol-new-v1"||!payload.data||typeof payload.data!=="object")throw Error("Неподдерживаемый формат");
  const src=payload.data,from=payload.author||src.meeting?.moderator||"неизвестный участник";let added=0;
  function add(x){
    if(!x||!String(x.text||"").trim())return;
    const raw=Array.isArray(x.boxes)?x.boxes.map(String):[],unknown=raw.filter(c=>!CODES.includes(c));
    const item={uid:String(x.uid||"I-"+hash(JSON.stringify(x))),n:0,text:String(x.text),kind:String(x.kind||"Уточнение"),boxes:unknown.length?[]:raw,steps:Array.isArray(x.steps)?x.steps.map(String):[],source:String(x.source||"Импорт от "+from),status:String(x.status||"Требует подтверждения"),owner:String(x.owner||""),deadline:String(x.deadline||""),evidence:String(x.evidence||""),note:String(x.note||"")+(unknown.length?"\nНеизвестные исходные категории: "+unknown.join(", "):"")};
    const same=pr.notes.find(n=>n.uid===item.uid);
    if(same&&JSON.stringify(same)===JSON.stringify(item))return;
    if(same)item.uid="I-"+hash(JSON.stringify(item)+"|"+from);
    if(pr.notes.some(n=>n.uid===item.uid))return;
    pr.notes.push(item);added++;
  }
  if(Array.isArray(src.notes))src.notes.forEach(add);
  if(src.edits&&typeof src.edits==="object")for(const [uid,d] of Object.entries(src.edits)){
    if(!/^S-\d+$/.test(uid)||!d||typeof d!=="object")continue;
    const parts=Object.entries(d).filter(([k,v])=>v!==""&&v!=null&&!(Array.isArray(v)&&!v.length));
    if(!parts.length)continue;
    const details=parts.map(([k,v])=>k+": "+(Array.isArray(v)?v.join(", "):v)).join("\n");
    add({uid:"I-"+hash(from+"|"+uid+"|"+details),text:"Обратная связь к исходному пункту №"+uid.slice(2)+":\n"+details,kind:"Уточнение",boxes:Array.isArray(d.boxes)?d.boxes:(byUid[uid]?[byUid[uid].sourceBox]:[]),steps:byUid[uid]?.steps||[],source:"Импорт проработки "+uid+" от "+from});
  }
  if(src.boxStatuses&&typeof src.boxStatuses==="object")for(const [c,s] of Object.entries(src.boxStatuses)){if(s&&s!==BOX_STATES[0])add({uid:"I-"+hash(from+"|box|"+c+"|"+s),text:"Статус раздела "+c+" у участника: "+s,kind:"Уточнение",boxes:CODES.includes(c)?[c]:[],source:"Импорт статуса раздела от "+from})}
  if(src.stepStatuses&&typeof src.stepStatuses==="object")for(const [c,s] of Object.entries(src.stepStatuses)){if(s&&s!=="Требует подтверждения")add({uid:"I-"+hash(from+"|step|"+c+"|"+s),text:"Статус изменения шага "+c+" у участника: "+s,kind:"Уточнение",boxes:["01"],steps:[c],source:"Импорт статуса шага от "+from})}
  pr.imports.push({from,date:payload.exportedAt||"",added});save();renderAll();message("Объединено "+added+" записей. Исходные пункты не перезаписаны.");
}
function schemeView(view){
  const protocol=view==="protocol";
  document.getElementById("work").classList.toggle("pr-active",protocol);
  document.querySelector("#work .workspace").classList.toggle("hidden",protocol);
  document.getElementById("newProtocol").classList.toggle("hidden",!protocol);
  document.getElementById("newViewScheme").classList.toggle("active",!protocol);
  document.getElementById("newViewProtocol").classList.toggle("active",protocol);
  document.getElementById("download").classList.toggle("hidden",protocol);
  if(protocol)renderAll();
  window.scrollTo(0,0);
}
function goStep(code){const i=MODEL.steps.findIndex(s=>s.code===code);if(i<0)return;schemeView("scheme");go(i);document.getElementById("questionTitle").scrollIntoView({block:"start",behavior:"smooth"})}
/* Unified inline diff: the old text remains in place; deletions and insertions are marked in one reading flow. */
let diffMode=true;
function diffTokens(t){return String(t).match(/[^\s]+[ \t]*|\r?\n|[ \t]+/g)||[]}
function inlineDiff(before,after){
  if(before===after)return e(after);
  const aa=diffTokens(before),bb=diffTokens(after),n=aa.length,m=bb.length;
  if(n*m>360000)return '<del class="diff-remove">'+e(before)+'</del><ins class="diff-add">'+e(after)+'</ins>';
  const w=m+1,dp=new Uint16Array((n+1)*w);
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
    dp[i*w+j]=aa[i]===bb[j]?dp[(i+1)*w+j+1]+1:Math.max(dp[(i+1)*w+j],dp[i*w+j+1]);
  const runs=[];
  function push(kind,token){const last=runs[runs.length-1];if(last&&last.kind===kind)last.text+=token;else runs.push({kind,text:token})}
  let i=0,j=0;
  while(i<n||j<m){
    if(i<n&&j<m&&aa[i]===bb[j]){push("same",aa[i]);i++;j++}
    else if(i<n&&(j>=m||dp[(i+1)*w+j]>=dp[i*w+j+1])){push("remove",aa[i]);i++}
    else{push("add",bb[j]);j++}
  }
  return runs.map(x=>x.kind==="same"?e(x.text):x.kind==="remove"?'<del class="diff-remove">'+e(x.text)+'</del>':'<ins class="diff-add">'+e(x.text)+'</ins>').join("");
}
function fieldText(value,field){
  return String(value).replace(field==="input"?/^Вход\s*\n/:field==="output"?/^Выход\s*\n/:/^(?!)$/,"");
}
function diff(){
  const root=document.getElementById("newDiff"),s=MODEL.steps[state.index],base=CHANGE_BASELINE[s.code];
  if(!root)return;
  document.documentElement.classList.toggle("new-diff-active",!!base&&diffMode&&["title","input","action","output"].some(k=>base[k]!==s[k]));
  const oldIndex=OLD_SEQUENCE.indexOf(s.code),moved=oldIndex!==state.index;
  if(!base&&!moved){root.classList.add("hidden");return}
  root.classList.remove("hidden");
  const ids=PROTOCOL_CHANGE_IDS[s.code]||[];
  const changed=!!base&&["title","input","action","output"].some(k=>base[k]!==s[k]);
  root.innerHTML='<div class="new-diff-toolbar"><div><strong>Изменения относительно исходной схемы</strong>'+
    (ids.length?'<div class="new-diff-source">Пункты протокола: '+ids.map(e).join(", ")+'</div>':'<div class="new-diff-source">Изменён порядок отображения блоков</div>')+'</div>'+
    (changed?'<div class="new-diff-legend"><span><del class="diff-remove">Удалено</del></span><span><ins class="diff-add">Добавлено</ins></span></div><button type="button" class="pr-btn" id="prToggleDiff">'+(diffMode?"Показать чистовой текст":"Показать изменения")+'</button>':'<span class="new-diff-source">Текст блока не изменялся</span>')+
    '</div>'+
    (moved?'<p class="new-diff-order">↕ Положение в просмотре: было '+(oldIndex+1)+' из '+MODEL.steps.length+', стало '+(state.index+1)+'. Проверки относятся к выполнению СМР, а не к этапу до его начала.</p>':'')+
    '<div class="diff-meta"><label for="prStepStatus">Статус проверки изменения</label><select id="prStepStatus">'+options(["Требует подтверждения","На проверке","Есть противоречие","Согласовано для публикации","Отклонено"],pr.stepStatuses[s.code]||"Требует подтверждения")+'</select><span>Рабочий проект, не новая утверждённая версия.</span></div>';
  root.querySelector("#prStepStatus").addEventListener("change",ev=>{pr.stepStatuses[s.code]=ev.target.value;save()});
  const toggle=root.querySelector("#prToggleDiff");
  if(toggle)toggle.addEventListener("click",()=>{diffMode=!diffMode;render()});
  if(!changed||!diffMode){document.querySelectorAll(".quote-inline").forEach(b=>b.removeAttribute("title"));return}
  if(base.title!==s.title)document.getElementById("questionTitle").innerHTML='Шаг '+e(s.code)+'. '+inlineDiff(base.title,s.title);
  for(const k of ["input","action","output"]){
    if(base[k]===s[k])continue;
    document.getElementById(k).innerHTML='<div class="item new-inline-diff">'+inlineDiff(fieldText(base[k],k),fieldText(s[k],k))+'</div>';
  }
  /* A unified diff contains both historical and new text. Quoting is available in the clean version. */
  document.querySelectorAll(".quote-inline").forEach(b=>{b.disabled=true;b.title="Для цитирования переключись на чистовой текст"});
}
function init(){
  const root=document.getElementById("newProtocol");if(!root)return;
  root.innerHTML=[
    '<header class="pr-hero"><div class="pr-eyebrow">СИД · NEW · рабочий протокол</div><h1>Протокол встречи и карта аналитических артефактов</h1><p>Все 63 пункта исходного протокола сохранены в разделах 00–06 и Н. Новые сведения собираются здесь же. Нераспределённые пункты не исчезают: для них отдельная очередь. Протокол - первичный источник, не утверждённая версия схемы или Confluence.</p></header>',
    '<div class="pr-metrics" id="prMetrics"></div>',
    '<section class="pr-toolbar" aria-label="Реквизиты встречи"><div><label>Тема встречи</label><input data-pr-meeting="title"></div><div><label>Дата встречи</label><input type="date" data-pr-meeting="date"></div><div><label>Участники / источники</label><input data-pr-meeting="participants" placeholder="Укажите участников"></div><div><label>Составитель</label><input data-pr-meeting="moderator" placeholder="Укажите ФИО"></div></section>',
    '<div class="pr-actions"><button class="pr-btn primary" id="prExportXlsx" type="button">Выгрузить протокол XLSX</button><button class="pr-btn" id="prExportJson" type="button">Сохранить JSON для обмена</button><button class="pr-btn" id="prImportJson" type="button">Объединить JSON другого участника</button><input id="prImportFile" class="pr-hidden-file" type="file" accept=".json,application/json"><span id="prFeedback" class="pr-note" role="status" aria-live="polite"></span></div>',
    '<p class="pr-note">Шаги с проектом изменений: <span id="prChangedLinks"></span>. Решения, вопросы и гипотезы не смешиваются с утверждённой версией. Данные хранятся только в этом браузере; прямой синхронизации с Confluence и общей серверной базы нет.</p>',
    '<h2 style="font-size:17px;margin:18px 0 6px">Матрица полноты по разделам</h2><div class="pr-box-grid" id="prBoxes"></div>',
    '<div class="pr-main-grid"><div><div class="pr-section-title"><h2 id="prListTitle">Все записи</h2><div class="pr-search"><input id="prSearch" type="search" placeholder="Поиск по тексту, шагу, участнику" aria-label="Поиск по протоколу"></div></div><div id="prBoxStatus"></div><div id="prList"></div></div>',
    '<aside><form id="prCapture" class="pr-capture"><h3>+ Добавить пункт</h3><div class="pr-field"><label>Что зафиксировано</label><textarea id="prNewText" required placeholder="Факт, решение, вопрос, риск, поручение, противоречие..."></textarea></div>',
    '<div class="pr-field"><label>Тип записи</label><select id="prNewKind">'+options(TYPES,"Вопрос")+'</select></div><div class="pr-field"><label>Разделы Confluence (можно несколько)</label><div class="pr-category-choices" id="prNewBoxes">'+PROTOCOL_BOXES.map(([c,n])=>'<label title="'+e(n)+'"><input type="checkbox" value="'+e(c)+'"> '+e(c)+'</label>').join("")+'</div><p class="pr-help">Без категории запись попадёт в «Не распределено».</p></div>',
    '<div class="pr-field"><label>Шаги схемы (через запятую)</label><input id="prNewSteps" placeholder="14, 15, 18"></div><div class="pr-field"><label>Ответственный</label><input id="prNewOwner"></div><div class="pr-field"><label>Срок</label><input id="prNewDeadline" type="date"></div><div class="pr-field"><label>Источник / доказательство</label><input id="prNewEvidence" placeholder="Ссылка или реквизиты"></div><button class="pr-btn primary" type="submit">Сохранить пункт</button></form>',
    '<div class="pr-imports"><h3>Обмен и согласование</h3><p>JSON объединяет записи разных участников без молчаливой перезаписи локальных значений. Сначала протокол, затем решение, задача на изменение, проверка связей и только после согласования - новая версия артефакта.</p><div id="prImportLog"></div></div></aside></div>'
  ].join("");
  root.querySelectorAll("[data-pr-meeting]").forEach(x=>{x.value=pr.meeting[x.dataset.prMeeting]||"";x.addEventListener("input",()=>{pr.meeting[x.dataset.prMeeting]=x.value;save()})});
  document.getElementById("prSearch").addEventListener("input",ev=>{search=ev.target.value.toLowerCase().trim();renderList()});
  document.getElementById("prBoxes").addEventListener("click",ev=>{const b=ev.target.closest("[data-pr-box]");if(b){selected=b.dataset.prBox;renderBoxes();renderBoxStatus();renderList()}});
  document.getElementById("prBoxStatus").addEventListener("change",ev=>{if(ev.target.matches("[data-pr-box-status]")){pr.boxStatuses[selected]=ev.target.value;save();renderBoxes()}});
  document.getElementById("prList").addEventListener("click",ev=>{const b=ev.target.closest("[data-pr-step]");if(b)goStep(b.dataset.prStep)});
  document.getElementById("prList").addEventListener("input",ev=>{const x=ev.target;if(x.dataset.prEdit&&x.dataset.prField)field(x.dataset.prEdit,x.dataset.prField,x.value)});
  document.getElementById("prList").addEventListener("change",ev=>{const x=ev.target,uid=x.dataset.prEdit;if(!uid)return;if(x.dataset.prCategory){const item=entries().find(y=>y.uid===uid);if(!item)return;const set=new Set(item.boxes);x.checked?set.add(x.dataset.prCategory):set.delete(x.dataset.prCategory);field(uid,"boxes",[...set]);renderBoxes();renderList();return}if(x.dataset.prField){field(uid,x.dataset.prField,x.value);renderBoxes();renderMetrics()}});
  document.getElementById("prCapture").addEventListener("submit",ev=>{ev.preventDefault();const text=document.getElementById("prNewText").value.trim();if(!text)return;const boxes=[...root.querySelectorAll("#prNewBoxes input:checked")].map(x=>x.value);const steps=document.getElementById("prNewSteps").value.split(/[,;\s]+/).filter(Boolean);pr.notes.push({uid:"N-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),n:0,text,kind:document.getElementById("prNewKind").value,boxes,steps,source:"Новая запись: "+(pr.meeting.moderator||state.fio||"автор не указан"),status:"Требует подтверждения",owner:document.getElementById("prNewOwner").value.trim(),deadline:document.getElementById("prNewDeadline").value,evidence:document.getElementById("prNewEvidence").value.trim(),note:""});save();ev.target.reset();selected=boxes[0]||"unclassified";renderAll();message(boxes.length?"Запись сохранена в разделах "+boxes.join(", "):"Запись сохранена в «Не распределено».")});
  document.getElementById("prExportJson").onclick=exportJson;
  document.getElementById("prImportJson").onclick=()=>document.getElementById("prImportFile").click();
  document.getElementById("prImportFile").addEventListener("change",async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error("Файл больше 2 МБ");importJson(JSON.parse(await file.text()))}catch(err){message("Ошибка импорта: "+err.message)}ev.target.value=""});
  document.getElementById("prChangedLinks").innerHTML=[...new Set([...Object.keys(CHANGE_BASELINE),...MODEL.steps.filter((x,i)=>OLD_SEQUENCE.indexOf(x.code)!==i).map(x=>x.code)])].map(c=>'<button type="button" class="pr-step-link" data-pr-step="'+e(c)+'">шаг '+e(c)+'</button>').join(" ");
  document.getElementById("prChangedLinks").addEventListener("click",ev=>{const b=ev.target.closest("[data-pr-step]");if(b)goStep(b.dataset.prStep)});
  document.getElementById("newViewScheme").onclick=()=>schemeView("scheme");
  document.getElementById("newViewProtocol").onclick=()=>schemeView("protocol");
  document.querySelectorAll(".node").forEach(x=>{const code=x.dataset.code,old=OLD_SEQUENCE.indexOf(code),now=MODEL.steps.findIndex(s=>s.code===code);if(CHANGE_BASELINE[code])x.classList.add("new-modified");if(old!==now)x.classList.add("new-moved");if(CHANGE_BASELINE[code]||old!==now)x.title=(old!==now?"Перемещён: "+(old+1)+" → "+(now+1)+". ":"")+"Рабочая версия; требует проверки"});
  const oldRender=render;render=function(){oldRender();diff()};
  const oldGo=go;go=function(i,related=null){if(related)diffMode=false;return oldGo(i,related)};
  renderAll();if(state.fio)diff();
  window.prExportXlsx=function(){const a=entries(),rows=[["ID","Разделы","Тип","Формулировка","Статус","Ответственный","Срок","Шаги","Источник / доказательства","Проработка"],...a.map(x=>[x.n||x.uid,x.boxes.join(", ")||"НЕ РАСПРЕДЕЛЕНО",x.kind,x.text,x.status,x.owner,x.deadline,x.steps.join(", "),[x.source,x.evidence].filter(Boolean).join("\n"),x.note])],summary=[["Раздел","Название","Количество записей","Статус обсуждения"],...PROTOCOL_BOXES.map(([c,n])=>[c,n,count(c),pr.boxStatuses[c]||BOX_STATES[0]]),["!","Не распределено / вне структуры",count("unclassified"),"Требует классификации"]];return{rows,summary,date:pr.meeting.date,blob}};
}
init();
})();