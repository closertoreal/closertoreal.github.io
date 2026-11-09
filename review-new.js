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
  s.action="15.1. ПТО ЛОС собирает комплект документов на предъявляемый объём работ и, при наличии проекта акта, прикладывает его к комплекту.\nУ ПТО ЛОС: комплект к приёмочной инспекции с проектом акта при наличии и ссылками на документы предыдущих этапов.\n15.2. ПТО ЛОС формирует приёмочную инспекцию и уведомляет необходимых участников.\nУ участников инспекции: уведомление о приёмочной инспекции.";
  s.output="Выход\n• [Комплект] Документы к приёмочной инспекции на предъявляемый объём работ\n• [Проект ИД] Проект акта с приложениями (если подготовлен)\n• [Организационный документ] Уведомление участников инспекции";
});
captureChange("12",s=>{
 s.output="Выход\n• [ИД] Замечания строительного контроля и записи в ОЖР\n• [Документ контроля] Предписания ЛОС (при наличии)\n• [Документ контроля] Запись в реестре предписаний (при наличии)\n• [ИД] Запись об устранении замечаний в ОЖР (при наличии)\n• [Результат] Подтверждение устранения замечаний СК заказчика (при наличии)";
 s.action=s.action.replace("\nОснование исходника: ч. 7 ст. 53 ГрК РФ.", "");
});
captureChange("17",s=>{
 s.input="Вход\n• [Надзорный документ] Программа проверок (шаг 6)\n• [ПД] Проектная документация\n• [РД] Рабочая документация (при необходимости)\n• [Результат] Выполняемые СМР\n• [ИД] Исполнительная документация на объём СМР, в том числе ОЖР и СЖР";
 s.action=s.action.replace("выдаёт застройщику и ЛОС предписание при выявлении нарушений","выдаёт застройщику или техническому заказчику отдельное предписание по нарушениям, не устранённым в ходе проверки");
 s.output="Выход\n• [Надзорный документ] Акт проверки Ростехнадзора (включая нарушения, устранённые в ходе проверки)\n• [Надзорный документ] Отдельное предписание по неустранённым нарушениям (при наличии)";
});
captureChange("18",s=>{
 s.title="Приёмочная инспекция предъявленного объёма работ";
 s.action="18.1. ЛОС предъявляет участникам инспекции выполненный объём работ и комплект подтверждающих документов.\nУ участников: предъявленный объём и документы для проверки.\n18.2. ЛОС проводит предусмотренные РД испытания трубопроводов на прочность и герметичность, промывку, продувку, а для нетехнологических трубопроводов - очистку поршнями, если применимо.\nУ ЛОС: результаты выполненных испытаний и очистки.\n18.3. Уполномоченные участники приёмочной инспекции проверяют предъявленный объём работ и результаты применимых испытаний.\nУ участников: результат приёмочной проверки.\n18.4. При положительном результате участники фиксируют приёмку конкретного объёма в применяемой форме 4 и оформляют соответствующие виду работ акты.\nУ участников: результат инспекции и применимые акты приёмки и испытаний.\n18.5. При выявлении нарушений участники инспекции фиксируют замечания или предписания; ЛОС устраняет их и повторно предъявляет работы.\nУ участников: замечания/предписания, подтверждения устранения и результат повторной инспекции.";
 s.input=s.input.replace("• [Проект ИД] Проект акта с приложениями (шаг 15)","• [Проект ИД] Проект акта с приложениями (если подготовлен, шаг 15)").replace("• [ОРД] Приказы о полномочиях подписантов, включая представителя эксплуатирующей организации","• [ОРД] Документы, подтверждающие полномочия необходимых участников инспекции");
 s.output="Выход\n• [Результат] Успешно пройденная приёмочная инспекция на конкретный объём работ (форма 4)\n• [ИД] Применимые акты приёмки работ (АОСР, АОСК, АОУСИТО и другие в зависимости от вида работ)\n• [ИД] Акты испытаний, промывки и продувки технологических трубопроводов (если применимо)\n• [ИД] Акт очистки нетехнологических трубопроводов поршнями (если применимо)\n• [Документы качества монтажа] Свидетельство о монтаже или удостоверение о качестве монтажа технологических трубопроводов (по применимой нормативной документации)\n• [Документ контроля] Замечания/предписания, устранение и повторное предъявление работ (при наличии)";
});
captureChange("21",s=>{
 s.title="Внутритрубная диагностика нетехнологических трубопроводов (если предусмотрена ПД)";
 s.input="Вход\n• [Результат] Подготовленный трубопровод\n• [ПД] Требование о внутритрубной диагностике (если предусмотрено)\n• [РД] Требования к диагностике";
 s.action="21.1. Исполнитель проводит внутритрубную диагностику нетехнологического трубопровода в предусмотренном ПД объёме.\nУ исполнителя: результаты диагностики.\n21.2. Исполнитель оформляет технический отчёт по результатам диагностики.\nУ участников: технический отчёт.\n21.3. При выявлении дефектов ЛОС устраняет дефекты и оформляет дополнительный комплект ИД по выполненным исправлениям.\nУ участников: подтверждение устранения дефектов.";
 s.output="Выход\n• [ИД] Технический отчёт внутритрубной диагностики (если предусмотрено ПД)\n• [ИД] Дополнительный комплект документов по устранённым дефектам (при наличии)";
});
captureChange("22",s=>{
 s.input+="\n• [ИД] Исполнительная документация на монтаж оборудования, включая акт, подтверждающий монтаж";
 s.action=s.action.replace("22.2. Участники испытаний оформляют акты индивидуальных испытаний оборудования.","22.2. Участники испытаний фиксируют результаты, замечания и предписания при их наличии и оформляют акты индивидуальных испытаний оборудования.");
 s.output="Выход\n• [ИД] Акт индивидуальных испытаний оборудования (ИД 10)\n• [Документ контроля] Замечания и предписания по результатам испытаний (при наличии)";
});

/* Навигация и показ протокола: левая схема остаётся доступна, справа весь протокол. */
const selectedCode=MODEL.steps[state.index]?.code||"0";
const sm=MODEL.steps.findIndex(x=>x.code==="16");
if(sm>=0){const [sixteen]=MODEL.steps.splice(sm,1);MODEL.steps.splice(MODEL.steps.findIndex(x=>x.code==="12"),0,sixteen);}
state.index=Math.max(0,MODEL.steps.findIndex(x=>x.code===selectedCode));
const changed=Object.fromEntries(MODEL.steps.filter(s=>originalSnapshot[s.code]&&["title","input","action","output"].some(f=>originalSnapshot[s.code][f]!==s[f])).map(s=>[s.code,true]));
/* Поскольку входы/выходы изменились, удаляем только ставшие неверными ссылки на документы. */
for(const k of ["15|0|14","16|4|12","21|1|18","20|1|21"])delete STEP_REFERENCE_TARGETS[k];
for(const key of Object.keys(OUTPUT_REVERSE_REFERENCES))delete OUTPUT_REVERSE_REFERENCES[key];
for(const [key,outputs] of Object.entries(STEP_REFERENCE_TARGETS)){
 const [consumer,item,producer]=key.split("|");
 for(const i of outputs){
  if(!step(producer)||i>=lines(step(producer).output).length)continue;
  const k=producer+"|"+i;
  (OUTPUT_REVERSE_REFERENCES[k]??=[]).push({consumer,inputIndex:Number(item)});
 }
}
function changeCards(){document.querySelectorAll(".node").forEach(n=>{const related=protoFor(n.dataset.code);n.classList.toggle("has-new-change",related.some(p=>p[1]==="Правка схемы"));n.title="Шаг "+n.dataset.code+(related.length?" · "+related.length+" записей протокола":"");})}
function updateFlow(){
 const row=[...document.querySelectorAll(".diagram .parallel-row")].find(r=>r.querySelector('.node[data-code="16"]')&&r.querySelector('.node[data-code="12"]'));
 if(!row)return;
 const ids=["16","12","13","14","17"],nodes=Object.fromEntries(ids.map(k=>[k,row.querySelector('.node[data-code="'+k+'"]')]));
 const zone=document.createElement("div");zone.className="work-flow-logic";
 zone.innerHTML='<div class="parallel-marker">1. Выполнение СМР</div><div class="single-node" id="newFlowStart"></div><div class="flow-arrow">↓</div><div class="parallel-marker">2. Контроль в ходе СМР (параллельно, циклически)</div><div class="parallel-row" id="newFlowChecks"></div>';
 row.replaceWith(zone);zone.querySelector("#newFlowStart").append(nodes["16"]);
 for(const n of ["12","13","14","17"])zone.querySelector("#newFlowChecks").append(nodes[n]);
}
const protoFor=c=>protocol.filter(p=>p[3].split(",").map(x=>x.trim()).includes(c));
const protoCard=p=>{
 const cls=p[1]==="AS IS"?"asis":p[1].includes("Предложение")?"suggestion":p[1].includes("Орг")?"org":"rule";
 const codes=p[3].split(",").map(x=>x.trim()).filter(c=>step(c));
 const goButton=codes.length?'<button class="proto-open-step" type="button" data-open-code="'+esc(codes[0])+'">Открыть шаг '+esc(codes[0])+'</button>':"";
 return '<article class="protocol-card type-'+cls+'"><strong><span class="type">'+esc(p[0])+'. ['+esc(p[1])+']</span><span class="area-tag">Артефакт '+esc(p[4])+(p[3]?' · шаг '+esc(p[3]):'')+'</span></strong><p>'+esc(p[2])+'</p>'+goButton+'</article>';
};
function compareStep(c){
 const old=originalSnapshot[c],now=step(c);
 if(!old||!now)return "";
 return '<div class="protocol-diff"><h3>Изменения в шаге '+esc(c)+'</h3>'+[["title","Название"],["input","Вход"],["action","Действие"],["output","Выход"]].filter(([k])=>old[k]!==now[k]).map(([k,label])=>'<details><summary>'+label+' · было / стало</summary><div class="two-cols"><div><strong>Было</strong><pre>'+esc(old[k])+'</pre></div><div><strong>NEW</strong><pre>'+esc(now[k])+'</pre></div></div></details>').join("")+'</div>';
}
document.querySelector(".topbar .brand").textContent="Схема СМР · NEW";
const workspace=document.querySelector(".workspace");
const diagramPanel=workspace.querySelector(".diagram-panel");
const stack=workspace.querySelector(".review-stack");
const stepPanel=stack.querySelector(".step-panel");
const commentPanel=stack.querySelector(".comment-panel");
const commentBody=commentPanel.querySelector(".comment-body");
const questionScroll=stepPanel.querySelector(".question-scroll");
let protoMode="all";
const protocolView=document.createElement("div");protocolView.className="protocol-view";
commentPanel.querySelector(".panel-head h2").textContent="Протокол встречи · 09.11";
commentPanel.querySelector(".panel-head .panel-caption span:not(.panel-index)").textContent="Решения, факты AS IS и вопросы для дальнейшей детализации";
commentPanel.append(protocolView);
function renderProtocol(){
 const code=MODEL.steps[state.index]?.code||"0";
 const list=protoMode==="all"?protocol:protoFor(code);
 protocolView.innerHTML='<div class="protocol-toolbar"><div class="protocol-scope"><button id="showAllProtocol" type="button" class="'+(protoMode==="all"?"active":"")+'">Весь протокол</button><button id="showStepProtocol" type="button" class="'+(protoMode==="step"?"active":"")+'">По шагу '+esc(code)+'</button></div><span class="small">'+list.length+' записей</span></div>'
 +'<p class="protocol-summary"><span class="protocol-badge">Расширенная аналитическая MN</span><span class="protocol-badge">09.11.2026</span><span class="protocol-badge">00–06 / Н</span></p>'
 +(list.length?list.map(protoCard).join(""):'<p class="nothing">По выбранному шагу записей нет. Переключись на весь протокол.</p>')
 +(protoMode==="step"&&changed[code]?compareStep(code):"");
 protocolView.querySelector("#showAllProtocol").onclick=()=>{protoMode="all";renderProtocol()};
 protocolView.querySelector("#showStepProtocol").onclick=()=>{protoMode="step";renderProtocol()};
 protocolView.querySelectorAll("[data-open-code]").forEach(b=>b.onclick=()=>openStep(b.dataset.openCode));
}
/* Боковая колонка содержит ТОЛЬКО протокол; редактор и карточки шагов перемещаем в плавающее окно. */
const float=document.createElement("section");float.className="step-float hidden";float.setAttribute("aria-label","Редактор выбранного шага");
float.innerHTML='<header class="float-bar"><div class="float-drag"><span class="float-icon">◫</span><div><strong id="floatTitle">Шаг процесса</strong><small>Перетащи за заголовок · меняй размер за угол окна · протокол остаётся доступен</small></div></div><div class="float-bar-actions"><button class="ghost" type="button" id="floatMax">На весь экран</button><button class="ghost" type="button" id="floatMin">Свернуть</button><button class="ghost" type="button" id="floatClose">Закрыть</button></div></header><div class="float-content"><div class="float-step-slot"></div><div class="float-grip" tabindex="0" role="separator" aria-label="Изменить высоту карточек шага и комментариев" aria-orientation="horizontal"></div><section class="float-comment-slot"></section></div>';
document.body.append(float);
const floatContent=float.querySelector(".float-content"),floatBar=float.querySelector(".float-bar"),floatStep=float.querySelector(".float-step-slot"),floatComment=float.querySelector(".float-comment-slot");
floatStep.append(stepPanel);
floatComment.append(commentBody);
floatStep.querySelector(".panel-head .panel-caption h2").textContent="Детали шага";
const floatTitle=float.querySelector("#floatTitle");
const stepActions=document.createElement("div");stepActions.className="panel-actions";
const cardSlider=document.createElement("input");cardSlider.type="range";cardSlider.min="160";cardSlider.max="800";cardSlider.step="10";cardSlider.value="320";cardSlider.setAttribute("aria-label","Высота карточек Вход, Действие и Выход");
const sliderLabel=document.createElement("label");sliderLabel.textContent="Высота карточек";sliderLabel.append(cardSlider);
stepActions.append(sliderLabel);
stepPanel.querySelector(".panel-head").append(stepActions);
cardSlider.addEventListener("input",()=>float.style.setProperty("--card-height",cardSlider.value+"px"));
const notes=document.createElement("details");notes.className="float-notes";
notes.innerHTML='<summary>Пояснения и решения по этому шагу</summary><div id="stepNotes"></div>';
stepPanel.querySelector(".question-scroll").insertBefore(notes,stepPanel.querySelector(".reference-notice"));
function renderNotes(){
 const code=MODEL.steps[state.index]?.code||"0";
 floatTitle.textContent="Шаг "+code+" · "+step(code).title;
 const p=protoFor(code);
 notes.classList.toggle("hidden",p.length===0);
 notes.querySelector("#stepNotes").innerHTML=p.map(protoCard).join("")+(changed[code]?compareStep(code):"");
 notes.querySelectorAll("[data-open-code]").forEach(b=>b.onclick=()=>openStep(b.dataset.openCode));
}
function syncSelected(){renderNotes();if(protoMode==="step")renderProtocol();}
function openStep(code){
 const i=MODEL.steps.findIndex(x=>x.code===code);if(i<0)return;
 if(!el("work").classList.contains("hidden")){baseGo(i);showFloat();syncSelected();}
 else{state.index=i;showFloat();syncSelected();}
}
function showFloat(){float.classList.remove("hidden","is-minimized");float.querySelector("#floatMin").textContent="Свернуть";}
function closeFloat(){saveCurrent();saveOverall();float.classList.add("hidden");}
function toggleMin(){
 const minimized=float.classList.toggle("is-minimized");
 float.querySelector("#floatMin").textContent=minimized?"Развернуть":"Свернуть";
 if(!minimized)renderNotes();
}
function toggleMax(){
 float.classList.toggle("is-maximized");
 float.querySelector("#floatMax").textContent=float.classList.contains("is-maximized")?"Обычный размер":"На весь экран";
}
float.querySelector("#floatClose").onclick=closeFloat;
float.querySelector("#floatMin").onclick=toggleMin;
float.querySelector("#floatMax").onclick=toggleMax;
/* Открытие карточки на схеме вызывает то же go(), что и существующая навигация. */
const baseGo=go;
go=function(i,related=null){baseGo(i,related);if(!el("work").classList.contains("hidden")){showFloat();syncSelected();}};
/* Запуск без всплывашки: левая схема и правый протокол доступны сразу после ввода ФИО. */
el("start").addEventListener("submit",()=>{setTimeout(()=>{float.classList.add("hidden");renderProtocol();},0)});
/* Переходы вперёд/назад используют исходный go(). */
for(const id of ["back","next"])el(id).addEventListener("click",()=>setTimeout(syncSelected,0));
protocolView.addEventListener("click",e=>{const b=e.target.closest("[data-open-code]");if(b){e.preventDefault();openStep(b.dataset.openCode);}});
/* Перемещение: только за левую часть заголовка, не поверх кнопок. */
let drag=null;
const handle=float.querySelector(".float-drag");
handle.addEventListener("pointerdown",e=>{
 if(e.button!==0||float.classList.contains("is-maximized"))return;
 const box=float.getBoundingClientRect();
 drag={dx:e.clientX-box.left,dy:e.clientY-box.top};handle.setPointerCapture(e.pointerId);
 float.style.left=box.left+"px";float.style.top=box.top+"px";float.style.right="auto";float.style.bottom="auto";
});
handle.addEventListener("pointermove",e=>{
 if(!drag)return;
 const w=float.offsetWidth,h=float.querySelector(".float-bar").offsetHeight;
 const left=Math.min(window.innerWidth-120,Math.max(0,e.clientX-drag.dx));
 const top=Math.min(window.innerHeight-h,Math.max(0,e.clientY-drag.dy));
 float.style.left=left+"px";float.style.top=top+"px";
});
handle.addEventListener("pointerup",()=>drag=null);
handle.addEventListener("pointercancel",()=>drag=null);
/* Регулируем высоту между карточками и редактором. */
const grip=float.querySelector(".float-grip");let resizing=null;
grip.addEventListener("pointerdown",e=>{
 resizing={y:e.clientY,start:floatStep.getBoundingClientRect().height,total:floatContent.getBoundingClientRect().height};
 grip.setPointerCapture(e.pointerId);
});
grip.addEventListener("pointermove",e=>{
 if(!resizing)return;
 const pct=Math.max(27,Math.min(80,100*(resizing.start+e.clientY-resizing.y)/resizing.total));
 floatContent.style.setProperty("--float-step-percent",pct.toFixed(1)+"%");
});
grip.addEventListener("pointerup",()=>resizing=null);
grip.addEventListener("pointercancel",()=>resizing=null);
grip.addEventListener("keydown",e=>{
 if(e.key!=="ArrowUp"&&e.key!=="ArrowDown")return;e.preventDefault();
 const v=parseFloat(floatContent.style.getPropertyValue("--float-step-percent"))||65;
 floatContent.style.setProperty("--float-step-percent",Math.max(27,Math.min(80,v+(e.key==="ArrowUp"?-5:5)))+"%");
});
/* Escape закрывает только всплывающее окно, не стирая комментарии. */
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!float.classList.contains("hidden")){closeFloat();}});
/* Удаляем устаревший второй блок из правой колонки. */
stepPanel.classList.remove("hidden");
commentPanel.querySelector(".comment-body")?.remove();
buildDiagram();updateFlow();changeCards();
renderProtocol();
if(!el("work").classList.contains("hidden"))render();
window.NEWReview={protocol,originalSnapshot,renderProtocol,openStep,closeFloat,toggleMin,toggleMax};
})();
