/* NEW / master · Сопоставление ПСД: XLSM v6, локальный импорт */
(()=>{"use strict";
const el=id=>document.getElementById(id);
const steps=JSON.parse(el("seed-steps").textContent);
const sample=JSON.parse(el("seed-docs").textContent);
const keys=["done","quality","them","next"];
const classifier=window.PSDClassifier;
if(!classifier)throw Error("Не подключён модуль классификации ПСД");
const terms={done:"Факт выполнения конкретных видов и объёма работ",quality:"Соответствие проектной и нормативно-технической документации, требуемый уровень качества",them:"Участие конкретных исполнителей, организаций, подразделений или лиц",next:"Возможность производства последующих видов работ"};
const periods=[["Подготовка строительства",["0","1","2","3","4а","4б","4в","4г","5","6","7","8","9","10","11"]],["СМР и контроль",["16","12","13","17","14"]],["Приёмочная инспекция",["15","18"]],["Испытания и комплектование ИД",["21","22","20","19"]],["Приёмка и пусконаладка",["23","26","27","25","24","28"]],["Передача, ввод, хранение",["29","30","31"]]];
const RULES=[
["0",/экспертиз|проектная документация$/i],["1",/передач[аи] рабочей документации|рабочая документация со штампом/i],["2",/извещени[ея] о начале строител/i],
["3",/журнал авторского надзора|приказ.*авторск.*надзор/i],["4а",/проект производства работ|ппгр|технологическ(ая|ие) карт/i],
["4в",/приказ.*(назначен|ответственн|полномоч)/i],["4г",/специальн(ый|ого|ые) журнал.*работ/i],
["5",/акт[\s-]*допуск|допуск.*лаборатор|аттестаци.*сварщик/i],["6",/программ[аы] проверок|регистраци[яи].*общ.*журнал/i],
["7",/акт.*освидетельствовани.*(геодезическ.*основ|гро)/i],["8",/ос[\s-]*15|передач[аи].*оборудовани.*монтаж|м[\s-]*15/i],
["9",/акт.*разбивк.*ос|акт.*вынос.*в натуру/i],["10",/акт.*входн.*контрол|журнал.*входн.*контрол/i],
["16",/общий журнал работ|журнал.*бетонных работ|журнал.*сварочных работ|журнал производства работ/i],
["12",/предписание.*строител.*контрол|замечани.*строител.*контрол/i],
["13",/запис[ьи].*журнал.*авторск|ведомост.*отступлен.*рабочей документац/i],
["17",/акт.*проверк.*(ростехнадзор|госстройнадзор|гсн)|предписани.*ростехнадзор/i],
["14",/исполнительн(ая|ые|ой).*схем|исполнительн(ый|ые).*профил|протокол.*(лнк|стл|этл|неразрушающ|радиограф|ультразвук)|акт.*исполнительн.*съ[её]мк/i],
["15",/уведомлени.*(приемочн|приёмочн|освидетельствован)|проект.*акт.*освидетельствован/i],
["18",/акт.*освидетельствовани.*(скрыт|строительн|участков сет)|акт.*при[её]мк|акт.*промывк|акт.*продувк|акт.*очистк.*трубопровод|заключени.*при[её]мочн.*инспекц/i],
["21",/техническ.*отч[её]т.*внутритрубн|внутритрубн.*диагностик/i],
["22",/акт.*индивидуальн.*испытан.*оборудован/i],
["20",/комплект.*исполнительн.*документац|реестр.*исполнительн.*документац/i],
["19",/реестр замечани.*(ид|исполнительн)|замечани.*к комплект.*ид/i],
["23",/акт.*при[её]мк.*комплексн.*опробован/i],
["26",/протокол.*шеф[\s-]*наладк/i],["27",/акт.*комплексн.*опробован|протокол.*пусконаладочн/i],
["25",/ведомост.*недоделок|кс[\s-]*2|кс[\s-]*3/i],
["24",/акт.*при[её]мк.*объект.*капитальн|извещени.*окончан.*строител/i],
["28",/заключени.*соответстви.*(построенн|объект)|отказ.*выдач.*зос/i],
["29",/акт.*передач.*исполнительн.*документац/i],
["30",/разрешени.*ввод.*эксплуатац|отказ.*ввод.*эксплуатац/i]
];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const norm=s=>String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[\s.,;:()«»"'–—]+/g," ").trim();
const makeDemo=()=>{
 const groups=new Map();sample.forEach(d=>{const k=d.id.split("-").pop();if(!groups.has(k))groups.set(k,{});groups.get(k)[d.source]=d});
 return [...groups.values()].map((p,i)=>{
  const n=p["НКНХ"],d=p["ДГП"];return {id:"demo:"+i,nCode:n?.code||"",nName:n?.name||"",dCode:d?.code||"",dName:d?.name||"",comparison:n?.name===d?.name?"совпадает":"сопоставлено в демо",comment:"",row:i+1,order:i+1,path:n?.path||d?.path||"Примеры актов",category:false,demo:true}
 });
};
const EMPTY=()=>({docs:makeDemo(),scope:"demo",edits:{},distributed:false,focus:null,visible:{},selected:null,tagFilters:[],unmarked:false});
let state=EMPTY();
const STORE="sid-psd-paired-v6-20261117";
const stepBy=Object.fromEntries(steps.map(s=>[s.code,s]));
function persist(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){message("Хранилище браузера переполнено: сохрани CSV. Результат текущего сеанса остаётся доступен.")}}
function restore(){try{const x=JSON.parse(localStorage.getItem(STORE)||"null");if(x&&Array.isArray(x.docs)&&x.docs.length)state=Object.assign(EMPTY(),x)}catch(e){}}
function message(s){el("message").textContent=s}
function edited(d){return state.edits[d.id]||{}}
function patch(d,x){state.edits[d.id]=Object.assign({},edited(d),x);persist()}
function hasN(d){return !!(d.nCode||d.nName)}
function hasD(d){return !!(d.dCode||d.dName)}
function unique(d){return hasN(d)&&hasD(d)?"both":hasN(d)?"n":hasD(d)?"d":"none"}
function status(d){const x=edited(d);if(d.category)return"group";if(x.excluded)return"outside";if(x.confirmed&&x.step)return"confirmed";if(x.step)return"proposed";if((x.candidates||[]).length>1)return"ambiguous";if(state.distributed)return"missing";return"pending"}
function statusName(s){return {group:"Раздел",outside:"Вне схемы",confirmed:"Подтверждено",proposed:"Предложено",ambiguous:"Несколько шагов",missing:"Без шага",pending:"Не распределено"}[s]||s}

function effectiveFlags(d){const x=edited(d);return Object.assign({},x.autoFlags||{},x.flags||{})}
function autoClassify(){
 let touched=0;
 for(const d of state.docs){
  if(d.category)continue;
  const old=edited(d),classification=classifier.classify(d),mapped=classifier.route(d);
  const update={autoFlags:classification.flags,autoFlagsReason:classification.why,autoConfidence:mapped.confidence};
  if(!old.manual&&!old.confirmed&&!old.excluded){
    update.step=mapped.step;update.candidates=mapped.candidates;update.reason=mapped.reason;update.aggregate=mapped.confidence==="low";update.confirmed=false;
  }
  state.edits[d.id]=Object.assign({},old,update);
  touched++;
 }
 return touched;
}
function distribute(){
 autoClassify();
 state.distributed=true;persist();render();fly();
 message("Документы распределены по шагам. Это предварительная классификация; нераспределённые и спорные документы отдельно отмечены.");
}
function summary(){
 const out={all:0,placed:0,missing:0,ambiguous:0,confirmed:0};
 state.docs.forEach(d=>{if(d.category)return;out.all++;const s=status(d);if(["proposed","confirmed"].includes(s))out.placed++;if(s==="missing")out.missing++;if(s==="ambiguous")out.ambiguous++;if(s==="confirmed")out.confirmed++});return out;
}
function matchesFilters(d){
 const query=norm(el("search").value),source=el("sourceFilter").value,st=el("statusFilter").value,x=edited(d);
 if(query&&!norm([d.nCode,d.nName,d.dCode,d.dName,d.comparison,d.comment,d.path].join(" ")).includes(query))return false;
 if(source==="НКНХ"&&!hasN(d)||source==="ДГП"&&!hasD(d))return false;
 if(st&&status(d)!==st)return false;
 const matchType=el("uniqueFilter").value,qFilter=el("questionFilter").value,uni=unique(d);
 if(matchType==="n"&&uni!=="n"||matchType==="d"&&uni!=="d"||matchType==="both"&&uni!=="both"||matchType==="different"&&(uni!=="both"||!/(различи|не совпада|отлича)/i.test(d.comparison)))return false;
 if(qFilter==="has"&&!d.comment||qFilter==="none"&&d.comment)return false;
 /* Левая колонка сохраняет контекст при выборе шага. */
 if(state.unmarked&&keys.some(k=>effectiveFlags(d)[k]===1))return false;
 if(state.tagFilters.length&&!state.tagFilters.every(k=>effectiveFlags(d)[k]===1))return false;
 return true;
}
function groupOf(d){const parts=String(d.path||"").split(" / ");return parts.length>=2?parts.slice(0,2).join(" / "):parts[0]||"Раздел не определён"}
function tag(d,k){
 const x=effectiveFlags(d)[k],v=x==null?"?":String(x);
 return '<button type="button" class="flag" data-flag="'+k+'" data-id="'+esc(d.id)+'" data-v="'+v+'" data-k="'+k+'" title="'+esc(terms[k])+' · нажми для определения">'+(v==="1"?k:v==="0"?"−":"? "+k)+'</button>';
}
const options=()=>'<option value="">Не назначено</option>'+steps.map(s=>'<option value="'+esc(s.code)+'">Шаг '+esc(s.code)+' · '+esc(s.title.slice(0,38))+'</option>').join("");
function pairHtml(d){
 const e=edited(d),st=status(d),un=unique(d),badge=un==="n"?"Только НКНХ":un==="d"?"Только ДГП":d.category?"Категория":"Обе площадки";
 const comparison=String(d.comparison||"").trim(),hasComment=!!String(d.comment||"").trim();
 const primary=d.nName||d.dName;
 const different=hasN(d)&&hasD(d)&&norm(d.nName)!==norm(d.dName);
 const sides='<div class="pair-primary"><div class="source-stack">'+
 (hasN(d)?'<span class="source-stamp N">НКНХ</span>':'')+
 (hasD(d)?'<span class="source-stamp D">ДГП</span>':'')+
 '</div><h3>'+esc(primary)+'</h3>'+
 (different?'<div class="alternate-label">Формулировка ДГП отличается · нажми «Комментарий / вопрос» для полного сравнения</div>':'')+
 '<span class="pair-link-indicator">'+(e.step?'↗ Связано со шагом '+esc(e.step):'◇ Шаг не определён')+
 (e.autoConfidence==='low'?' · низкая уверенность':e.autoConfidence==='medium'?' · гипотеза':'')+'</span></div>';
 const controls=d.category?'<span class="note-status">Строка иерархии: не распределяется как документ</span>':
 '<select class="field pair-step-select" aria-label="Шаг сопоставления" data-step-assign="'+esc(d.id)+'">'+options().replace('<option value="'+esc(e.step||'')+'">','<option value="'+esc(e.step||'')+'" selected>')+'</select>'+
 '<button type="button" class="btn smol" data-confirm="'+esc(d.id)+'"'+(!e.step?" disabled":"")+'>✓</button>'+
 '<button type="button" class="btn smol" data-outside="'+esc(d.id)+'">'+(e.excluded?"Вернуть":"Вне")+'</button>';
 return '<article class="doc-row pair-row '+(un==="n"?"unique-n":un==="d"?"unique-d":"")+(state.selected===d.id?" selected":"")+'" data-record="'+esc(d.id)+'">'+
 '<div class="doc-head"><span class="mini">'+esc(d.row)+'</span><span class="mini status '+st+'">'+esc(statusName(st))+'</span><span class="pair-uniqueness '+(un==="n"?"n":un==="d"?"d":"both")+'">'+badge+'</span></div>'+
 sides+
 '<div class="paired-meta"><span>'+esc(comparison||"Текстовое соответствие не указано")+'</span>'+
 '<button type="button" class="pair-details" data-details="'+esc(d.id)+'" aria-haspopup="dialog">'+(hasComment?"<b>●</b> Комментарий / вопрос":"Подробнее о сопоставлении")+'</button></div>'+
 (!d.category?'<div class="flags">'+keys.map(k=>tag(d,k)).join("")+'</div>':"")+
 '<div class="doc-bottom">'+controls+'</div>'+
 (e.reason?'<div class="note-status">'+esc(e.reason)+'</div>':"")+
 '</article>';
}
function renderDocs(){
 const filtered=state.docs.filter(matchesFilters),groups=new Map();filtered.forEach(d=>{let g=groupOf(d);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(d)});
 let markup="";
 for(const [name,docs] of groups){
  const cap=state.visible[name]||70;
  markup+='<details class="group"'+(groups.size<5||!!el("search").value?" open":"")+'><summary><span>'+esc(name)+'</span><small>'+docs.length+' строк</small></summary><div class="group-content">'+docs.slice(0,cap).map(pairHtml).join("")+
  (docs.length>cap?'<button class="btn smol show-more" type="button" data-more="'+esc(name)+'">Показать ещё ('+(docs.length-cap)+' осталось)</button>':"")+'</div></details>';
 }
 el("docs").innerHTML=markup||'<div class="empty">По этим фильтрам строк нет</div>';
 el("filterCount").textContent="Показано по фильтрам: "+filtered.length+" / "+state.docs.length+" строк; категорий "+state.docs.filter(x=>x.category).length+".";
 // For each row, select the assigned step after HTML injection, avoiding regex substitutions.
 el("docs").querySelectorAll(".pair-step-select").forEach(x=>{const id=x.dataset.stepAssign,d=state.docs.find(z=>z.id===id);if(d)x.value=edited(d).step||""});
}

function showTagDefinition(key,anchor){
 if(!terms[key])return;
 const p=el("definition"),r=anchor.getBoundingClientRect();
 el("defHeading").textContent=key+" · юридическая функция ИД";
 el("defText").textContent=terms[key];
 p.style.left=Math.max(12,Math.min(window.innerWidth-365,r.left))+"px";
 p.style.top=Math.max(12,Math.min(window.innerHeight-160,r.bottom+9))+"px";
 p.classList.add("open");
}
function scoped(d){
 const v=el("uniqueFilter").value,u=unique(d);
 return !v||v==="union"||v==="both"&&u==="both"||v==="n"&&u==="n"||v==="d"&&u==="d"||v==="different"&&u==="both"&&/(различи|не совпада|отлича)/i.test(d.comparison);
}
function mappedDocs(){
 const by=Object.fromEntries(steps.map(s=>[s.code,[]]));
 if(state.distributed)for(const d of state.docs){if(d.category||!scoped(d))continue;const e=edited(d);if(e.step&&by[e.step]&&!e.excluded)by[e.step].push(d);}
 return by;
}
function stepFlagRows(rows){
 const counts={done:0,quality:0,them:0,next:0};
 for(const d of rows){const f=effectiveFlags(d);for(const k of keys)if(f[k]===1)counts[k]++;}
 return counts;
}
function stepLabels(rows){
 const c=stepFlagRows(rows);
 return keys.filter(k=>c[k]>0).map(k=>'<button type="button" class="map-tag" data-step-tag="'+k+'" title="'+esc(terms[k])+'">'+k+' <small>'+c[k]+'</small></button>').join("");
}
function stepMarkup(code,by){
 const s=stepBy[code],records=by[code]||[],flag=records.length;
 return '<div class="map-node'+(flag?" mapped":" unmapped")+(state.focus===code?" chosen":"")+'" data-step="'+esc(code)+'" tabindex="0" role="button" aria-label="Шаг '+esc(code)+'. '+esc(s.title)+'. Показать документы">'+
 '<div class="map-node-top"><b>Шаг '+esc(code)+'</b><span class="map-count'+(flag?'':' zero')+'">'+flag+' док.</span></div>'+
 '<div class="map-node-title">'+esc(s.title)+'</div>'+
 '<div class="map-tags">'+(flag?stepLabels(records):'<span class="map-empty">Нет назначенных документов</span>')+'</div></div>';
}
function seq(by,...codes){return codes.map((c,i)=>(i?'<div class="seq-arrow" aria-hidden="true">↓</div>':'')+stepMarkup(c,by)).join("")}
function stage(title,body){return '<section class="map-stage"><header>'+esc(title)+'</header>'+body+'</section>'}
function lane(title,html){return '<section class="map-lane"><div class="map-lane-title">'+esc(title)+'</div>'+html+'</section>'}
function arrow(){return '<div class="map-major-arrow" aria-hidden="true"><span>↓</span></div>'}
function parallel(by,codes){
 return '<div class="map-parallel" aria-label="Параллельные действия"><div class="parallel-track" aria-hidden="true"></div>'+codes.map(c=>stepMarkup(c,by)).join("")+'</div>';
}
function renderDiagram(){
 const by=mappedDocs();
 let html=seq(by,"0","1","2")+arrow();
 html+=stage("Подготовка к СМР · параллельные направления",
 '<div class="map-prep-grid">'+
 lane("Госстройнадзор",stepMarkup("6",by))+
 lane("Авторский надзор",stepMarkup("3",by))+
 lane("Организация СМР",seq(by,"4а","4б"))+
 lane("Ответственные и допуски",seq(by,"4в","4г","5"))+
 lane("Геодезическая подготовка",seq(by,"7","9"))+
 lane("МТР и оборудование",parallel(by,["8","11"])+'<div class="seq-arrow">↓</div>'+stepMarkup("10",by))+
 '</div>')+arrow();
 html+=stage("Выполнение СМР · текущий контроль",
 '<div class="map-phase-hint">1. Выполнение работ</div>'+stepMarkup("16",by)+
 '<div class="map-phase-hint">2. Контроль во время СМР, а не условие его начала</div>'+
 parallel(by,["12","13","17"])+
 '<div class="map-loop-hint">◇ Если есть замечания: устранение на шаге 16 → повторная проверка 12 / 13</div>'+
 '<div class="map-phase-hint">3. Исполнительная съёмка и лабораторный контроль</div>'+
 stepMarkup("14",by))+
 arrow()+seq(by,"15","18")+
 '<div class="map-loop-hint">◇ При отрицательной инспекции: шаг 16 → повторное предъявление на шаг 18</div>'+
 arrow()+stage("Испытания и диагностика · параллельные направления",parallel(by,["21","22"]))+
 arrow()+seq(by,"20","19","23")+
 arrow()+stage("Комплексное опробование · параллельные направления",parallel(by,["26","27"]))+
 arrow()+seq(by,"25","24","28")+
 arrow()+stage("Завершение строительства · две ветви",parallel(by,["29","30"]))+
 arrow()+stepMarkup("31",by);
 el("diagram").innerHTML='<div class="mapped-flow">'+html+'</div>';
 el("currentFocus").textContent=state.distributed?"Распределено по "+steps.length+" шагам · нажми карточку для состава":"Назначения подготовлены · нажми «Распределить по шагам»";
 const missing=state.docs.filter(d=>!d.category&&scoped(d)&&status(d)==="missing");
 const ambiguous=state.docs.filter(d=>!d.category&&scoped(d)&&status(d)==="ambiguous");
 const countEmpty=Object.keys(by).filter(k=>by[k].length===0).length;
 el("gapExplain").textContent=state.distributed?"Шаги без назначенных документов: "+countEmpty+"; документы без шага: "+missing.length+"; неоднозначные: "+ambiguous.length+". Пустой шаг не всегда ошибка (возможен вспомогательный процесс).":"Запусти распределение. Неоднозначные и отсутствующие соответствия останутся на проверку.";
 el("gapSamples").innerHTML=missing.slice(0,12).map(d=>'<button type="button" data-show="'+esc(d.id)+'" title="'+esc(d.path)+'">'+esc((d.nName||d.dName).slice(0,64))+'</button>').join("");
}
function stepModal(code){
 const step=stepBy[code];if(!step)return;
 const docs=(mappedDocs()[code]||[]);
 state.focus=code;renderDiagram();
 const panel=el("stepModal");
 if(!panel)return;
 panel.querySelector(".step-dialog-title").textContent="Шаг "+code+" · "+step.title;
 panel.querySelector(".step-dialog-caption").textContent=docs.length+" сопоставленных документов · "+(docs.filter(d=>edited(d).confirmed).length)+" подтверждено вручную";
 const content=panel.querySelector(".step-dialog-list");
 content.innerHTML=docs.length?docs.map(d=>{
 const flags=keys.filter(k=>effectiveFlags(d)[k]===1);
 const place=unique(d);
 return '<article class="step-doc" data-dialog-doc="'+esc(d.id)+'">'+
 '<div class="step-doc-head"><span class="doc-source '+(place==="n"?"src-n":place==="d"?"src-d":"")+'">'+(place==="both"?"НКНХ · ДГП":place==="n"?"НКНХ":"ДГП")+'</span>'+
 '<span class="mini">'+esc(d.nCode||d.dCode)+'</span><span class="mini">'+(edited(d).confirmed?"✓ Подтверждено":"Гипотеза")+'</span></div>'+
 '<strong>'+esc(d.nName||d.dName)+'</strong>'+
 (d.nName&&d.dName&&norm(d.nName)!==norm(d.dName)?'<div class="step-doc-alternate">ДГП: '+esc(d.dName)+'</div>':"")+
 '<div class="step-doc-flags">'+flags.map(k=>'<button type="button" class="map-tag" data-step-tag="'+k+'">'+k+'</button>').join("")+'</div>'+
 '<button class="step-doc-link" type="button" data-jump-doc="'+esc(d.id)+'">Показать в реестре ↗</button></article>';
 }).join(""):'<div class="empty">На этот шаг пока не назначено документов. Проверь, относится ли он к оформлению ИД либо является вспомогательным.</div>';
 panel.hidden=false;
 panel.querySelector(".step-dialog-close").focus({preventScroll:true});
 document.body.classList.add("dialog-open");
}
function closeStepModal(){const panel=el("stepModal");if(panel){panel.hidden=true;document.body.classList.remove("dialog-open");}}
function highlightDoc(d){
 state.selected=d.id;state.focus=edited(d).step||null;
 renderDocs();renderDiagram();
 const step=state.focus&&el("diagram").querySelector('[data-step="'+state.focus+'"]');
 if(step)step.scrollIntoView({behavior:"smooth",block:"center"});
 else message("Для этого документа пока не удалось определить шаг. Он остаётся кандидатом на уточнение.");
}
function jumpDoc(id){
 const doc=state.docs.find(d=>d.id===id);if(!doc)return;
 closeStepModal();state.selected=id;state.focus=null;
 // The record may be hidden by the current filter; reset only presentation filters.
 el("search").value=doc.nCode||doc.dCode||doc.nName;
 el("statusFilter").value="";el("questionFilter").value="";el("uniqueFilter").value="union";
 render();
 const record=el("docs").querySelector('[data-record="'+CSS.escape(id)+'"]');
 if(record)record.scrollIntoView({behavior:"smooth",block:"center"});
}

function render(){
 const z=summary();for(const k of ["All","Placed","Missing","Ambiguous","Confirmed"])el("count"+k).textContent=z[k.toLowerCase()];
 const n=state.docs.filter(d=>unique(d)==="n").length,d=state.docs.filter(d=>unique(d)==="d").length,comments=state.docs.filter(x=>x.comment).length;
 el("bannerText").textContent=state.scope==="demo"?"Демо-данные: 40 пар актов. Чтобы увидеть уникальные позиции и вопросы, загрузи XLSM v6 (Лист1).":
 "Загружено "+state.docs.length+" строк сопоставления · только НКНХ: "+n+" · только ДГП: "+d+" · с вопросом: "+comments+". Данные остаются в браузере.";
 el("banner").classList.toggle("ok",state.scope!=="demo");
 renderDocs();renderDiagram();
 document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",state.tagFilters.includes(x.dataset.filter)));
 const leaf=state.docs.filter(d=>!d.category),N=leaf.filter(d=>unique(d)==="n").length,D=leaf.filter(d=>unique(d)==="d").length,B=leaf.filter(d=>unique(d)==="both").length;
 el("vennUnion").textContent=leaf.length;el("vennBoth").textContent=B;el("vennN").textContent=N;el("vennD").textContent=D;
 const chosen=el("uniqueFilter").value||"union";
 document.querySelectorAll("[data-venn]").forEach(button=>button.classList.toggle("active",button.dataset.venn===chosen));
 el("unmarked").classList.toggle("active",state.unmarked);
}
function showDetails(d,anchor){
 const p=el("pairPopover"),un=unique(d);
 const st=un==="n"?"Есть только в НКНХ":un==="d"?"Есть только в ДГП":"Присутствует в обоих перечнях";
 p.innerHTML='<div class="pair-popover-head"><div><small>СТРОКА '+esc(d.row)+' · СОПОСТАВЛЕНИЕ ПСД</small><h4>'+esc(st)+'</h4></div><button class="pop-close" type="button" aria-label="Закрыть">×</button></div>'+
 '<div class="pair-popover-sides"><div><strong>НКНХ</strong><small>'+esc(d.nCode||"Нет")+'</small><p>'+esc(d.nName||"Не найдено в НКНХ")+'</p></div>'+
 '<div><strong>ДГП</strong><small>'+esc(d.dCode||"Нет")+'</small><p>'+esc(d.dName||"Не найдено в ДГП")+'</p></div></div>'+
 '<div class="pair-popover-diff"><strong>Результат сравнения</strong><p>'+esc(d.comparison||"Не отмечено")+'</p></div>'+
 '<div class="pair-popover-question"><strong>Твой комментарий / вопрос</strong><p>'+esc(d.comment||"Комментария нет")+'</p></div>'+

 '<div class="pair-editor"><strong>Юридические функции ИД · предварительная оценка</strong><p>'+esc(edited(d).autoFlagsReason||"Назначение требует проверки")+'</p>'+
 '<div class="pair-edit-grid">'+keys.map(key=>{
  const manual=edited(d).flags||{},v=Object.prototype.hasOwnProperty.call(manual,key)?(manual[key]===1?"1":manual[key]===0?"0":"?"):"auto";
  return '<label><span>'+key+'</span><select class="field" data-edit-flag="'+key+'"><option value="auto"'+(v==="auto"?" selected":"")+'>Авто</option>'+
  '<option value="1"'+(v==="1"?" selected":"")+'>Да</option><option value="0"'+(v==="0"?" selected":"")+'>Нет</option>'+
  '<option value="?"'+(v==="?"?" selected":"")+'>Не определено</option></select></label>';
 }).join("")+'</div><p class="pair-edit-disclaimer">«Авто» возвращает предварительную оценку. Выбор сохраняется только в твоём браузере.</p></div>'+

 '<div class="pair-popover-footer">Исходная формулировка сохранена. Распределение по шагам: '+esc(statusName(status(d)))+(edited(d).step?" · шаг "+esc(edited(d).step):"")+'.</div>';
 p.dataset.recordId=d.id;
 p.hidden=false;const r=anchor.getBoundingClientRect();
 p.style.width=Math.min(440,window.innerWidth-24)+"px";p.style.left=Math.max(12,Math.min(r.left,window.innerWidth-p.offsetWidth-12))+"px";
 let top=r.bottom+9;if(top+p.offsetHeight>window.innerHeight-12)top=Math.max(12,r.top-p.offsetHeight-10);
 p.style.top=top+"px";p.querySelector(".pop-close").focus({preventScroll:true});
 state.selected=d.id;renderDocs();
}
function closePopover(){el("pairPopover").hidden=true;}
function sourceRows(table){
 const allN=new Map(),allD=new Map(),preN=new Set(),preD=new Set();
 table.forEach(r=>{const a=String(r["Код"]||"").trim(),b=String(r["Код_1"]||r["Код.1"]||"").trim();
  if(a&&r["НКНХ"])allN.set(a,String(r["НКНХ"]));if(b&&r["ДГП"])allD.set(b,String(r["ДГП"]));
  for(const [v,set]of [[a,preN],[b,preD]]){const q=v.split(".");for(let i=1;i<q.length;i++)set.add(q.slice(0,i).join("."));}
 });
 const pathOf=(code,map)=>{
  if(!code)return"Без кода";
  const arr=code.split("."),p=[];
  for(let i=1;i<arr.length;i++){const k=arr.slice(0,i).join(".");if(map.has(k))p.push(k+" "+map.get(k));}
  return p.length?p.join(" / "):code.split(".").slice(0,2).join(".");
 };
 return table.map((r,index)=>{
  const a=String(r["Код"]||"").trim(),b=String(r["Код_1"]||r["Код.1"]||"").trim();
  const n=String(r["НКНХ"]||"").trim(),d=String(r["ДГП"]||"").trim();
  const row=Number(r["Порядок"])||index+1;
  return {id:"matched:"+row+":"+a+":"+b,nCode:a,nName:n,dCode:b,dName:d,comparison:String(r["Совпадение по тексту"]||"").trim(),
    comment:String(r["Вопрос"]||"").trim(),row:row+1,order:row,path:pathOf(a,allN)!=="Без кода"?pathOf(a,allN):pathOf(b,allD),
    category:preN.has(a)&&!!a||preD.has(b)&&!!b,demo:false};
 }).filter(d=>hasN(d)||hasD(d));
}
function parseDelimited(text){
 const delim=(text.split("\n")[0].match(/;/g)||[]).length>(text.split("\n")[0].match(/,/g)||[]).length?";":",";
 const rows=[];let cells=[],part="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){part+='"';i++}else q=!q;}
 else if(c===delim&&!q){cells.push(part);part="";}
 else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&text[i+1]==="\n")i++;cells.push(part);if(cells.some(x=>x))rows.push(cells);cells=[];part="";}
 else part+=c;}
 if(part||cells.length){cells.push(part);rows.push(cells);}
 const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,"").trim()),seen=new Map();
 const names=headers.map(x=>{const n=seen.get(x)||0;seen.set(x,n+1);return n?x+"_"+n:x});
 return rows.map(line=>Object.fromEntries(names.map((name,i)=>[name,line[i]||""])));
}
async function importFile(files){
 const aggregate=[],errors=[];
 for(const file of files){
 try{
  const ext=file.name.split(".").pop().toLowerCase();
  if(["xlsm","xlsx","xls"].includes(ext)){
   if(!window.XLSX){errors.push("Не загрузилась библиотека Excel: попробуй CSV.");continue;}
   const workbook=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellFormula:false});
   let matched=false;
   for(const name of workbook.SheetNames){
    const rows=window.XLSX.utils.sheet_to_json(workbook.Sheets[name],{defval:""});
    if(!rows.length)continue;
    if(["НКНХ","ДГП","Вопрос","Совпадение по тексту"].every(k=>Object.hasOwn(rows[0],k))){
       aggregate.push(...sourceRows(rows));matched=true;break;
    }
   }
   if(!matched)errors.push(file.name+": нет листа с колонками НКНХ, ДГП и Вопрос.");
  }else if(["csv","tsv"].includes(ext)){
   const rows=parseDelimited(await file.text());
   if(!rows.length||!Object.hasOwn(rows[0],"НКНХ")||!Object.hasOwn(rows[0],"ДГП"))errors.push(file.name+": нужен CSV с колонками НКНХ и ДГП");
   else aggregate.push(...sourceRows(rows));
  }else errors.push(file.name+": формат не поддерживается");
 }catch(err){errors.push(file.name+": "+String(err.message||err));}
 }
 if(!aggregate.length){message("Загрузка не завершена: "+errors.join(" "));return;}
 state=EMPTY();state.docs=aggregate;state.scope="xlsm";state.distributed=false;autoClassify();persist();render();
 message("Импортировано "+aggregate.length+" строк из сопоставленного XLSM. Макросы не запускались. "+errors.join(" "));
}
function cell(v){return '"'+String(v??"").replace(/"/g,'""')+'"'}
function exportCsv(kind){
 const head=kind==="questions"?["Строка","Код НКНХ","НКНХ","Код ДГП","ДГП","Различие","Комментарий","Статус","Шаг","Вопрос для уточнения"]:
 ["Строка","Код НКНХ","НКНХ","Код ДГП","ДГП","Различие","Комментарий","Путь","Категория","Шаг","Статус","Основание","done","quality","them","next"];
 const list=kind==="questions"?state.docs.filter(d=>!!d.comment||(!d.category&&["missing","ambiguous"].includes(status(d)))):state.docs;
 const rows=[head,...list.map(d=>{const x=edited(d),f=effectiveFlags(d);
 const start=[d.row,d.nCode,d.nName,d.dCode,d.dName,d.comparison,d.comment];
 return kind==="questions"?[...start,statusName(status(d)),x.step||"",(d.comment||"Где в процессе оформляется этот документ, и применим ли он к данному виду работ?")]:
 [...start,d.path,d.category?"Категория":"Документ",x.step||"",statusName(status(d)),x.reason||"",...keys.map(k=>f[k]===1?k:f[k]===0?"нет":"не оценено")];
 })];
 const content="\uFEFF"+rows.map(r=>r.map(cell).join(";")).join("\r\n");
 const blob=new Blob([content],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=kind==="questions"?"Вопросы_по_пробелам_ПСД.csv":"Матрица_НКНХ_ДГП_по_шагам.csv";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 message("CSV выгружен: "+list.length+" строк. Исходные вопросы и оба названия сохранены.");
}
function fly(){
 const groups=Object.entries(mappedDocs()).filter(([,records])=>records.length);
 const area=el("docs").getBoundingClientRect();
 if(!groups.length){message("Не найдено назначений: проверь документы без шага.");return;}
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   message("Распределение завершено: "+groups.length+" шагов получили документы. Анимация отключена настройками системы.");return;
 }
 groups.forEach(([code,rows],i)=>setTimeout(()=>{
  const target=el("diagram").querySelector('[data-step="'+code+'"]');if(!target)return;
  const to=target.getBoundingClientRect(),f=document.createElement("div");
  const flags=keys.filter(k=>rows.some(d=>effectiveFlags(d)[k]===1));
  f.className="fly group-fly";
  f.innerHTML='<strong>'+rows.length+' док.</strong>'+
    '<span>'+flags.map(k=>'<i class="fly-flag fly-'+k+'">'+k+'</i>').join("")+'</span>';
  const sx=Math.max(12,Math.min(window.innerWidth-185,area.left+20)),sy=Math.max(20,Math.min(window.innerHeight-38,area.top+35+i%3*21));
  f.style.left=sx+"px";f.style.top=sy+"px";
  document.body.append(f);
  const destX=Math.max(15,Math.min(window.innerWidth-185,to.left+Math.min(to.width/2,50))),
        destY=Math.max(12,Math.min(window.innerHeight-55,to.top+Math.min(to.height/2,35)));
  const dx=destX-sx,dy=destY-sy;
  if(typeof f.animate!=="function"){f.remove();return;}
  const animation=f.animate([
   {opacity:0,transform:"translate(0,0) scale(.7)"},
   {opacity:1,transform:"translate(10px,0) scale(1)",offset:.15},
   {opacity:1,transform:"translate("+dx+"px,"+dy+"px) scale(.85)",offset:.86},
   {opacity:0,transform:"translate("+dx+"px,"+dy+"px) scale(.65)"}
  ],{duration:810,easing:"cubic-bezier(.29,.68,.31,1)",fill:"forwards"});
  animation.onfinish=()=>{
    f.remove();
    if(target.isConnected){target.classList.add("node-target");setTimeout(()=>target.classList.remove("node-target"),1000);}
  };
 },Math.min(i,23)*80));
 message("Распределены "+state.docs.filter(d=>!d.category&&edited(d).step).length+
 " документа по "+groups.length+" шагам; цветные метки на шагах показывают, какие функции подтверждают связанные документы.");
}
el("docs").addEventListener("click",event=>{
 const more=event.target.closest("[data-more]");if(more){state.visible[more.dataset.more]=(state.visible[more.dataset.more]||70)+70;renderDocs();return;}
 const detail=event.target.closest("[data-details]");
 if(detail){const d=state.docs.find(x=>x.id===detail.dataset.details);if(d)showDetails(d,detail);return;}
 const tagButton=event.target.closest("[data-flag]");
 if(tagButton){event.stopPropagation();showTagDefinition(tagButton.dataset.flag,tagButton);return;}
 const yes=event.target.closest("[data-confirm]");
 if(yes){const d=state.docs.find(x=>x.id===yes.dataset.confirm);if(d){patch(d,{confirmed:true,excluded:false,manual:true});render();}return;}
 const no=event.target.closest("[data-outside]");
 if(no){const d=state.docs.find(x=>x.id===no.dataset.outside);if(d){patch(d,{excluded:!edited(d).excluded,confirmed:false,manual:true});render();}return;}
 const card=event.target.closest("[data-record]");
 if(card&&!event.target.closest("select,button,input")){const d=state.docs.find(x=>x.id===card.dataset.record);if(d)highlightDoc(d);}
});
el("docs").addEventListener("change",event=>{
 const select=event.target.closest("[data-step-assign]");if(!select)return;
 const d=state.docs.find(x=>x.id===select.dataset.stepAssign);
 if(d){patch(d,{step:select.value,confirmed:false,excluded:false,manual:true,candidates:[],reason:"Ручное назначение, ожидает подтверждения"});render();}
});
el("search").addEventListener("input",renderDocs);
document.querySelectorAll("[data-venn]").forEach(button=>button.addEventListener("click",()=>{el("uniqueFilter").value=button.dataset.venn;render();}));
 el("sourceFilter").addEventListener("change",renderDocs);
el("statusFilter").addEventListener("change",renderDocs);
el("uniqueFilter").addEventListener("change",render);
el("questionFilter").addEventListener("change",renderDocs);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>{
const k=button.dataset.filter;state.tagFilters=state.tagFilters.includes(k)?state.tagFilters.filter(x=>x!==k):[...state.tagFilters,k];render();
}));
el("unmarked").addEventListener("click",()=>{state.unmarked=!state.unmarked;render()});
el("diagram").addEventListener("click",event=>{
 const tag=event.target.closest("[data-step-tag]");
 if(tag){event.stopPropagation();showTagDefinition(tag.dataset.stepTag,tag);return;}
 const b=event.target.closest("[data-step]");if(b)stepModal(b.dataset.step);
});
el("diagram").addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-step]")){event.preventDefault();stepModal(event.target.dataset.step);}});
el("stepModal").addEventListener("click",event=>{
 const tag=event.target.closest("[data-step-tag]");if(tag){showTagDefinition(tag.dataset.stepTag,tag);return;}
 const link=event.target.closest("[data-jump-doc]");if(link){jumpDoc(link.dataset.jumpDoc);return;}
 if(event.target===el("stepModal")||event.target.closest(".step-dialog-close"))closeStepModal();
});
el("gapSamples").addEventListener("click",e=>{const b=e.target.closest("[data-show]");if(!b)return;
 const d=state.docs.find(x=>x.id===b.dataset.show);if(!d)return;state.focus=null;el("search").value=d.nCode||d.dCode;render();el("docs").scrollIntoView({behavior:"smooth",block:"start"});
});
el("clearFocus").addEventListener("click",()=>{state.focus=null;persist();render()});
el("resetMapping").addEventListener("click",()=>{if(!confirm("Сбросить автоматические предложения? Ручные решения и функции ИД сохранятся."))return;
for(const d of state.docs){const e=edited(d);if(e.manual)continue;delete e.step;delete e.candidates;delete e.reason;delete e.confirmed;}
state.distributed=false;state.focus=null;persist();render();
});
el("distribute").addEventListener("click",distribute);
el("upload").addEventListener("change",async e=>{await importFile([...e.target.files]);e.target.value=""});
el("export").addEventListener("click",()=>exportCsv("matrix"));
el("exportQuestions").addEventListener("click",()=>exportCsv("questions"));
el("resetDemo").addEventListener("click",()=>{if(state.scope!=="demo"&&!confirm("Заменить загруженный реестр демонстрационными документами? Перед этим сохрани матрицу."))return;state=EMPTY();autoClassify();persist();render()});
el("closeDef").addEventListener("click",()=>el("definition").classList.remove("open"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closePopover();closeStepModal();el("definition").classList.remove("open")}});
document.addEventListener("click",e=>{if(!e.target.closest(".pair-row")&&!e.target.closest("#pairPopover"))closePopover()});
el("pairPopover").addEventListener("click",e=>{if(e.target.closest(".pop-close"))closePopover()});
el("pairPopover").addEventListener("change",e=>{
 const s=e.target.closest("[data-edit-flag]");if(!s)return;
 const doc=state.docs.find(d=>d.id===el("pairPopover").dataset.recordId);if(!doc)return;
 const f=Object.assign({},edited(doc).flags||{}),key=s.dataset.editFlag;
 if(s.value==="auto")delete f[key];else f[key]=s.value==="1"?1:s.value==="0"?0:null;
 patch(doc,{flags:f});renderDocs();renderDiagram();
});

restore();autoClassify();render();
})();