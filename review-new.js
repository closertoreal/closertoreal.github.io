/* NEW: модель процесса, разбор встречи 09.11.2026, панели комментариев и протокола.
   Отдельная экспериментальная ветка: master не затрагивается. */
(()=>{
"use strict";
const originalSnapshot=Object.fromEntries(MODEL.steps.map(x=>[x.code,{title:x.title,input:x.input,action:x.action,output:x.output}]));
const step=c=>MODEL.steps.find(x=>x.code===c);
const strip=(text,rx)=>text.split("\n").filter(line=>!rx.test(line)).join("\n");
const replace=(code,field,value)=>{step(code)[field]=value};
const append=(code,field,text)=>{step(code)[field]+="\n"+text};
const protocol=[
["01","AS IS","Приёмка работ выполняется отдельными объёмами; один акт может объединять несколько приёмочных инспекций.","18","04"],
["02","AS IS","Проект акта при предъявлении на инспекцию представляется не всегда; в нём могут быть ссылки на ранее принятые этапы.","15","04"],
["03","AS IS","Корпоративная форма 4 фиксирует результаты приёмочной инспекции и не является универсальной нормативной формой ИД.","18","03"],
["04","AS IS","В программе проверок Ростехнадзора обычно указаны укрупнённые виды работ; этап или титул может быть указан при поэтапном вводе.","17","01"],
["05","AS IS","Акт проверки Ростехнадзора фиксирует нарушения, включая устранённые на проверке. Отдельное предписание содержит неустранённые.","17","04"],
["06","AS IS","Документы качества монтажа технологических трубопроводов могут различаться: удостоверение либо свидетельство о монтаже.","18","03"],
["07","AS IS","Внутритрубная диагностика выполняется при наличии требований ПД. Итог - технический отчёт; при дефектах появляется дополнительный комплект ИД.","21","03"],
["08","AS IS","Некритичные замечания входного контроля оборудования могут устраняться при монтаже; критичные препятствуют монтажу.","22","04"],
["09","Правка схемы","Исключить наряд-допуск из входных документов, сохранив применимые документы допуска сварщиков и лабораторий.","5,16","01"],
["10","Правка схемы","Поменять порядок: выполнение СМР (16) прежде выборочных проверок (12). Авторский надзор (13) и проверки СК - параллельно и циклически.","16,12,13","01"],
["11","Правка схемы","Шаг 12 - «Выборочная проверка» СК заказчика (верификация операционного контроля). СП 48.13330.2019, п. 9.1.9.","12","01,Н"],
["12","Правка схемы","Для выборочной проверки предусмотреть замечания/предписания, устранение и повторную проверку.","12","01"],
["13","Правка схемы","Убрать внутренний операционный контроль подрядчика; сохранить исполнительную съёмку и лабораторный контроль.","14","01"],
["14","Правка схемы","В лабораторном контроле убрать слово «неразрушающий».","14","01"],
["15","Правка схемы","Выходы: «Протоколы ЛНК, СТЛ и ЭТЛ»; не перечислять РК/УЗК, не выделять профили самостоятельно.","14","01,03"],
["16","Правка схемы","Сохранить отдельный шаг подготовки комплекта к освидетельствованию.","15","01"],
["17","Правка схемы","15.2: «Формирует приёмочную инспекцию и уведомляет необходимых участников»; убрать перечисление.","15","01"],
["18","Правка схемы","На выходе указать уведомление участников инспекции.","15","01"],
["19","Правка схемы","Переименовать шаг 18 в «Приёмочная инспекция» вместо «Совместное освидетельствование».","18","01"],
["20","Правка схемы","Добавить выход «Успешно пройденная приёмочная инспекция на конкретный объём работ».","18","01"],
["21","Правка схемы","Отразить замечания/предписания, их устранение и повторное предъявление работ.","18","01"],
["22","Правка схемы","Удалить исходное действие 18.3 про отдельное подписание АОУСИТО представителем эксплуатирующей организации.","18","01"],
["23","Правка схемы","Удалить исходное действие 18.6 «Последующие работы».","18","01"],
["24","Правка схемы","Сократить действия шага 18: предъявление, инспекция, результат, оформление актов либо устранение замечаний.","18","01"],
["25","Правка схемы","Не ограничивать применимые акты приёмки АОСР, АОСК и АОУСИТО; уточнить виды по ПСД.","18","01,02"],
["26","Правка схемы","На вход шагу 17: ПД, при необходимости РД, ОЖР и СЖР.","17","01"],
["27","Правка схемы","Заменить «Предъявленная ИД» на «Исполнительная документация на объём СМР».","17","01"],
["28","Правка схемы","На выходе раздельно указать акт проверки Ростехнадзора и предписание при наличии.","17","01"],
["29","Правка схемы","Испытания технологических трубопроводов (прочность, герметичность, промывка, продувка) включить в шаг 18.","18,21","01"],
["30","Правка схемы","Очистку нетехнологических трубопроводов поршнями и соответствующий акт отнести к шагу 18.","18,21","01"],
["31","Правка схемы","Шаг 21 - внутритрубная диагностика нетехнологических трубопроводов при наличии требований ПД; итог технический отчёт.","21","01"],
["32","Правка схемы","Индивидуальные испытания оборудования сохранить отдельным шагом.","22","01"],
["33","Правка схемы","На вход 22 добавить ИД, включая акт, подтверждающий монтаж оборудования.","22","01"],
["34","Правка схемы","На выход 22 добавить замечания/предписания вместе с актом испытаний.","22","01"],
["35","TO BE","Лабораторные протоколы и заключения поступают в СИД готовыми; процессы лабораторий не автоматизируются.","14","05"],
["36","Требование к СИД","Связь нескольких приёмочных инспекций с одним актом, использование результатов инспекций.","15,18","04,05"],
["37","Предложение TO BE","Предзаполнение акта из инспекций и проверка согласованности данных; алгоритм и момент создания черновика не утверждены.","15,18","04,05"],
["38","TO BE","Загрузка актов проверок Ростехнадзора с реквизитами, отдельные связанные объекты пунктов предписания для контроля устранения.","17","04,05"],
["39","Классификация","Перечень видов актов приёмки уточнить по ПСД и сопоставить с видами работ, не считать АОСР/АОСК/АОУСИТО исчерпывающими.","18","02,03"],
["40","Классификация","Разделить применимость свидетельства о монтаже и удостоверения о качестве монтажа, их формы и подписантов.","18","03,Н"],
["41","Классификация","Различать акт очистки, акт испытаний и технический отчёт внутритрубной диагностики.","18,21","02,03"],
["42","Модель данных","Связь инспекция → объём → акт, включая документы предыдущих этапов; учёт результатов и замечаний.","15,18","04"],
["43","Модель данных","Акт проверки, предписание и отдельные пункты предписания - разные, связанные сущности.","17","04"],
["44","Модель данных","Привязка пункта предписания к площадке, титулу, марке или конкретной работе с подтверждением устранения.","17","04"],
["45","Вопрос","Нужны ли в СИД предписания Ростехнадзора непосредственно подрядчикам, минуя формальный адрес заказчика?","17","04,05"],
["46","Вопрос","Как и когда формируется черновик акта по одной или нескольким инспекциям?","15,18","04,05"],
["47","Вопрос","Какой целевой цифровой результат инспекции заменит или отразит форму 4?","18","04,05"],
["48","Оргзадача","Создать отдельный стрим по паспортизации трубопроводов; не включать паспорт в непосредственные выходы испытаний.","21","00"],
["49","Оргзадача","Проверить схему через инструмент-опрос и направить Excel до 13.11.2026.","","00"],
["50","Оргзадача","Передать внутреннюю процедуру по форме 4 (в короткой финальной MN отмечено «Готово»).","18","00"],
["51","Оргзадача","Предоставить пример программы Ростехнадзора (в короткой финальной MN отмечено «Готово»).","17","00"],
["52","Оргзадача","Приглашать профильных участников на обсуждение ИД сварки, отдельно уточнить состав ДГП-2.","","00"],
["53","Оргзадача","Продолжить рассмотрение комплектования ИД по титулам и системам, комплексного опробования; шаги 19–20 не рассмотрены.","19,20","00"],
["54","Предложение TO BE","В перспективе рассмотреть электронное получение актов и предписаний Ростехнадзора из госуслуг юрлица; интеграция не согласована.","17","05"],
["55","Проверка","Проверить сквозной путь СМР → выборочный контроль → приёмочная инспекция → акт, включая повторную приёмку.","16,12,18","06"],
["56","Проверка","Проверить испытания разных типов трубопроводов и соответствие выходных документов.","18,21","06"],
["57","Проверка","Проверить ИД монтажа до индивидуальных испытаний и связи замечаний с единицей оборудования.","22","06"]
];
const captureChange=(code,fn)=>{const s=step(code);fn(s)};
captureChange("5",s=>{
  s.action=strip(s.action,/^5\.4\.|^У ЛОС: наряды-допуски/);
  s.output=strip(s.output,/наряды-допуски/);
});
captureChange("16",s=>{
  s.input=s.input.replace(/^• \[Контекст процесса\] Документы допуска.*$/m,"• [Документы допуска] Применимые документы допуска сварщиков и лабораторий (шаг 5).");
  s.input=strip(s.input,/Замечания СК для устранения \(шаг 12/);
});
captureChange("14",s=>{
  s.title="Исполнительная съёмка и лабораторный контроль";
  s.action=s.action.replace(/14\.1\.[\s\S]*?У ЛОС: результаты операционного контроля\.\n?/,"")
     .replace(/14\.2\./g,"14.1.").replace(/14\.3\./g,"14.2.").replace(/14\.4\./g,"14.3.")
     .replaceAll("лабораторный неразрушающий контроль","лабораторный контроль")
     .replaceAll("результаты лабораторного неразрушающего контроля","результаты лабораторного контроля")
     .replace("Участники контроля передают ПТО ЛОС результаты контроля и исполнительной съёмки для подготовки освидетельствования.","ЛОС передаёт результаты исполнительной съёмки и готовые лабораторные документы для подготовки комплекта к освидетельствованию.");
  s.output="Выход\n• [ИД] Исполнительные геодезические схемы (ИД 8)\n• [ИД] Протоколы ЛНК, СТЛ и ЭТЛ (ИД 11)";
});
captureChange("15",s=>{
  s.input=s.input.replace("Исполнительные схемы, профили, протоколы контроля (шаг 14)","Исполнительные схемы и лабораторные протоколы (шаг 14)");
  s.action="15.1. ПТО ЛОС собирает проект акта с приложениями для предъявляемого объёма работ.\nУ ПТО ЛОС: проект акта с приложениями, при необходимости со ссылками на ранее принятые этапы СМР.\n15.2. ПТО ЛОС формирует приёмочную инспекцию и уведомляет необходимых участников.\nУ участников инспекции: уведомление о приёмочной инспекции.";
  s.output="Выход\n• [Проект ИД] Проект акта с приложениями (если подготовлен)\n• [Организационный документ] Уведомление участников инспекции";
});
captureChange("17",s=>{
 s.input="Вход\n• [Надзорный документ] Программа проверок (шаг 6)\n• [ПД] Проектная документация\n• [РД] Рабочая документация (при необходимости)\n• [Результат] Выполняемые СМР\n• [ИД] Исполнительная документация на объём СМР, в том числе ОЖР и СЖР";
 s.action=s.action.replace("выдаёт застройщику и ЛОС предписание при выявлении нарушений","выдаёт застройщику или техническому заказчику отдельное предписание по нарушениям, не устранённым в ходе проверки");
 s.output="Выход\n• [Надзорный документ] Акт проверки Ростехнадзора (включая нарушения, устранённые в ходе проверки)\n• [Надзорный документ] Отдельное предписание по неустранённым нарушениям (при наличии)";
});
captureChange("18",s=>{
 s.title="Приёмочная инспекция предъявленного объёма работ";
 s.action="18.1. Необходимые участники проводят приёмочную инспекцию предъявленного объёма работ и проверяют подтверждающие документы.\nУ участников: результат проверки объёма работ.\n18.2. При положительном результате фиксируется успешное прохождение приёмочной инспекции на конкретный объём работ (применяемая корпоративная форма 4) и оформляются применимые акты.\nУ участников: результат инспекции и акты по применимым видам работ.\n18.3. При наличии замечаний или предписаний ЛОС организует их устранение и повторное предъявление работ.\nУ участников: замечания/предписания и результат повторной инспекции.\n18.4. Для трубопроводов в составе СМР проводятся применимые испытания на прочность и герметичность, промывка, продувка, а для нетехнологических трубопроводов - очистка поршнями; оформляются соответствующие акты.\nУ участников: акты испытаний и очистки применимых трубопроводов.";
 s.output="Выход\n• [Результат] Успешно пройденная приёмочная инспекция на конкретный объём работ (форма 4)\n• [ИД] Применимые акты приёмки работ (АОСР, АОСК, АОУСИТО и другие в зависимости от вида работ)\n• [ИД] Акты испытаний, промывки и продувки технологических трубопроводов (если применимо)\n• [ИД] Акт очистки нетехнологических трубопроводов поршнями (если применимо)\n• [Документы качества монтажа] Свидетельство о монтаже или удостоверение о качестве монтажа технологических трубопроводов (по применимой нормативной документации)\n• [Документ контроля] Замечания/предписания, устранение и повторное предъявление работ (при наличии)";
});
captureChange("21",s=>{
 s.title="Внутритрубная диагностика нетехнологических трубопроводов (если предусмотрена ПД)";
 s.input="Вход\n• [Результат] Подготовленный трубопровод\n• [ПД] Требование о внутритрубной диагностике (если предусмотрено)\n• [РД] Требования к диагностике";
 s.action="21.1. Исполнитель проводит внутритрубную диагностику нетехнологического трубопровода в предусмотренном ПД объёме.\nУ исполнителя: результаты диагностики.\n21.2. Исполнитель оформляет технический отчёт по результатам диагностики.\nУ участников: технический отчёт.\n21.3. При выявлении дефектов организуется их устранение и оформление дополнительного комплекта ИД.\nУ участников: подтверждение устранения дефектов.";
 s.output="Выход\n• [ИД] Технический отчёт внутритрубной диагностики (если предусмотрено ПД)\n• [ИД] Дополнительный комплект документов по устранённым дефектам (при наличии)";
});
captureChange("22",s=>{
 s.input+="\n• [ИД] Исполнительная документация на монтаж оборудования, включая акт, подтверждающий монтаж";
 s.action=s.action.replace("22.2. Участники испытаний оформляют акты индивидуальных испытаний оборудования.","22.2. Участники испытаний фиксируют результаты, замечания и предписания при их наличии и оформляют акты индивидуальных испытаний оборудования.");
 s.output="Выход\n• [ИД] Акт индивидуальных испытаний оборудования (ИД 10)\n• [Документ контроля] Замечания и предписания по результатам испытаний (при наличии)";
});
const priorIndexCode=MODEL.steps[state.index]?.code;
const sm=MODEL.steps.findIndex(x=>x.code==="16"),target=MODEL.steps.findIndex(x=>x.code==="12");
if(sm>=0&&target>=0){const [sixteen]=MODEL.steps.splice(sm,1);MODEL.steps.splice(MODEL.steps.findIndex(x=>x.code==="12"),0,sixteen);}
const adjusted=MODEL.steps.findIndex(x=>x.code===priorIndexCode);if(adjusted>=0)state.index=adjusted;
const changes=Object.fromEntries(MODEL.steps.filter(s=>originalSnapshot[s.code]&&["title","input","action","output"].some(f=>originalSnapshot[s.code][f]!==s[f])).map(s=>[s.code,true]));
const protoCard=(p)=>'<article class="protocol-card type-'+(p[1]==="AS IS"?"asis":p[1].includes("Предложение")?"suggestion":p[1].includes("Орг")?"org":"rule")+'"><strong><span class="type">'+esc(p[0])+'. ['+esc(p[1])+']</span><span class="area-tag">Раздел '+esc(p[4])+(p[2]?' · Шаг '+esc(p[3]):'')+'</span></strong><p>'+esc(p[2])+'</p></article>';
const stepCodes=t=>t.split(",").map(x=>x.trim()).filter(Boolean);
const protocolFor=(code)=>protocol.filter(p=>stepCodes(p[3]).includes(code));
let protoMode="step",reviewMode="comments";
const stack=document.querySelector(".review-stack");
const stepPanel=stack.querySelector(".step-panel"),commentPanel=stack.querySelector(".comment-panel");
const questionScroll=stepPanel.querySelector(".question-scroll");
function createButton(text,onClick,title){const b=document.createElement("button");b.type="button";b.className="ghost";b.textContent=text;if(title)b.title=title;b.addEventListener("click",onClick);return b;}
const stepActions=document.createElement("div");stepActions.className="panel-actions";
const collapseButton=createButton("Свернуть шаг",()=>setCollapsed(true));
const modalButton=createButton("Шаг на весь экран",()=>openModal());
const cardSizeLabel=document.createElement("label");cardSizeLabel.textContent="Высота карточек";
const cardRange=document.createElement("input");cardRange.type="range";cardRange.min="170";cardRange.max="720";cardRange.value="320";cardRange.step="10";cardRange.setAttribute("aria-label","Высота карточек в пикселях");
cardSizeLabel.append(cardRange);stepActions.append(cardSizeLabel,modalButton,collapseButton);stepPanel.querySelector(".panel-head").append(stepActions);
const expandButton=createButton("Показать шаг",()=>setCollapsed(false));
expandButton.className="ghost";expandButton.hidden=true;
commentPanel.querySelector(".panel-head").append(expandButton);
const resizer=document.createElement("div");resizer.className="panel-resizer";resizer.setAttribute("role","separator");resizer.setAttribute("tabindex","0");resizer.setAttribute("aria-label","Изменить высоту блока шага");resizer.setAttribute("aria-orientation","horizontal");
stack.insertBefore(resizer,commentPanel);
function setCollapsed(collapsed){
 stack.classList.toggle("step-collapsed",collapsed);
 expandButton.hidden=!collapsed;
 if(collapsed){setReviewMode("protocol");}
}
let dragStart=null;
resizer.addEventListener("pointerdown",e=>{if(window.innerWidth<=1050)return;dragStart={y:e.clientY,height:stepPanel.getBoundingClientRect().height,container:stack.getBoundingClientRect().height};resizer.setPointerCapture(e.pointerId);});
resizer.addEventListener("pointermove",e=>{if(!dragStart)return;const newPct=Math.max(18,Math.min(76,100*(dragStart.height+e.clientY-dragStart.y)/dragStart.container));stack.style.setProperty("--new-step-height",newPct.toFixed(1)+"%");});
resizer.addEventListener("pointerup",()=>dragStart=null);
resizer.addEventListener("pointercancel",()=>dragStart=null);
resizer.addEventListener("keydown",e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();const now=parseFloat(stack.style.getPropertyValue("--new-step-height"))||52;stack.style.setProperty("--new-step-height",Math.min(76,Math.max(18,now+(e.key==="ArrowUp"?-4:4)))+"%");}});
cardRange.addEventListener("input",()=>document.documentElement.style.setProperty("--card-height",cardRange.value+"px"));
const reviewTabs=document.createElement("div");reviewTabs.className="review-tabs";reviewTabs.setAttribute("role","tablist");reviewTabs.setAttribute("aria-label","Комментарии или протокол");
const commentTop=document.createElement("button"),protoTop=document.createElement("button");
for(const [b,name] of [[commentTop,"Комментарии"],[protoTop,"Протокол"]]){b.className="review-tab";b.type="button";b.textContent=name;b.setAttribute("role","tab");reviewTabs.append(b)}
commentPanel.insertBefore(reviewTabs,commentPanel.querySelector(".comment-body"));
const protocolPane=document.createElement("section");protocolPane.className="protocol-view hidden";protocolPane.setAttribute("aria-label","Изменения по протоколу");
commentPanel.append(protocolPane);
commentTop.onclick=()=>setReviewMode("comments");protoTop.onclick=()=>setReviewMode("protocol");
function setReviewMode(mode){reviewMode=mode;commentTop.classList.toggle("active",mode==="comments");protoTop.classList.toggle("active",mode==="protocol");commentTop.setAttribute("aria-selected",String(mode==="comments"));protoTop.setAttribute("aria-selected",String(mode==="protocol"));commentPanel.querySelector(".comment-body").classList.toggle("hidden",mode!=="comments");protocolPane.classList.toggle("hidden",mode!=="protocol");commentPanel.querySelector("#commentsHeading").textContent=mode==="comments"?"Комментарии":"Протокол встречи";if(mode==="protocol")renderProtocol();}
function renderProtocol(){
 const current=MODEL.steps[state.index]?.code||"";
 const list=protoMode==="all"?protocol:protocolFor(current);
 protocolPane.innerHTML='<div class="protocol-toolbar"><div class="protocol-scope"><button type="button" id="protoStep" class="'+(protoMode==="step"?"active":"")+'">По шагу '+esc(current)+'</button><button type="button" id="protoAll" class="'+(protoMode==="all"?"active":"")+'">Весь протокол</button></div><span class="small">'+list.length+' записей</span></div>'
 +'<div class="protocol-summary"><span class="protocol-badge">09.11.2026</span><span class="protocol-badge">Аналитическая версия</span><span class="protocol-badge">01–06 / Н / 00</span></div>'
 +(list.length?list.map(protoCard).join(""):'<p class="nothing">Для этого шага в расширенной MN нет отдельного пункта. Можно перейти к полному протоколу.</p>')
 +(protoMode==="step"&&changes[current]?diffFor(current):'');
 protocolPane.querySelector("#protoStep").onclick=()=>{protoMode="step";renderProtocol()};
 protocolPane.querySelector("#protoAll").onclick=()=>{protoMode="all";renderProtocol()};
}
function diffFor(code){
 const o=originalSnapshot[code],n=step(code);
 const fields=[["title","Название"],["input","Вход"],["action","Действие"],["output","Выход"]].filter(([k])=>o[k]!==n[k]);
 return '<div class="protocol-diff"><h3>Сравнение редакций шага '+esc(code)+'</h3>'+fields.map(([k,label])=>'<details><summary>'+label+' · было / стало</summary><div class="two-cols"><div><strong>До встречи</strong><pre>'+esc(o[k])+'</pre></div><div><strong>NEW</strong><pre>'+esc(n[k])+'</pre></div></div></details>').join("")+'</div>';
}
const dialog=document.createElement("dialog");dialog.className="step-modal";
dialog.innerHTML='<header class="modal-bar"><h2>Просмотр шага на весь экран</h2><button type="button" class="ghost" id="modalCloseNew">Закрыть ✕</button></header><div class="modal-mount"></div>';
document.body.append(dialog);
dialog.querySelector("#modalCloseNew").onclick=()=>dialog.close();
dialog.addEventListener("close",()=>{const scroll=dialog.querySelector(".question-scroll");if(scroll)stepPanel.append(scroll);if(reviewMode==="protocol")renderProtocol();});
function openModal(){setCollapsed(false);const mount=dialog.querySelector(".modal-mount");mount.append(questionScroll);if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");}
function updateFlow(){
 const row=[...document.querySelectorAll(".diagram .parallel-row")].find(r=>r.querySelector('.node[data-code="16"]')&&r.querySelector('.node[data-code="12"]'));
 if(!row)return;
 const parent=row.parentElement,nums=["16","12","13","14","17"],nodes=Object.fromEntries(nums.map(k=>[k,row.querySelector('.node[data-code="'+k+'"]')]));
 const zone=document.createElement("div");zone.className="work-flow-logic";
 zone.innerHTML='<div class="parallel-marker">1. Начало выполнения работ</div><div class="single-node" id="newFlowStart"></div><div class="flow-arrow">↓</div><div class="parallel-marker">2. Параллельные и циклические проверки в ходе СМР</div><div class="parallel-row" id="newFlowChecks"></div>';
 row.replaceWith(zone);zone.querySelector("#newFlowStart").append(nodes["16"]);for(const n of ["12","13","14","17"])zone.querySelector("#newFlowChecks").append(nodes[n]);
}
function flagNodes(){document.querySelectorAll(".node").forEach(n=>{const p=protocolFor(n.dataset.code);n.classList.toggle("has-new-change",p.some(x=>x[1].includes("Правка")));n.title=(n.title||"")+(p.length?"\nПротокол: "+p.length+" записей":"")})}
const priorGo=go; /* навигация остаётся прежней; новый протокол обновляется после клика */
document.querySelector(".diagram").addEventListener("click",()=>setTimeout(()=>{if(reviewMode==="protocol")renderProtocol()},0));
["back","next"].forEach(id=>el(id).addEventListener("click",()=>setTimeout(()=>{if(reviewMode==="protocol")renderProtocol()},0)));
document.querySelector(".question-scroll").addEventListener("click",()=>setTimeout(()=>{if(reviewMode==="protocol")renderProtocol()},0));
document.querySelector(".question-scroll").addEventListener("click",e=>{if(e.target.closest("a.step-reference")&&reviewMode==="protocol")setTimeout(renderProtocol,0)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dialog.hasAttribute("open"))dialog.close()});
buildDiagram();updateFlow();flagNodes();
if(!el("work").classList.contains("hidden"))render();
setReviewMode("comments");
window.NEWReview={protocol,originalSnapshot,renderProtocol,openModal,setCollapsed};
})();
