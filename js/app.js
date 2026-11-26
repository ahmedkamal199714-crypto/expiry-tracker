/* متابعة التواريخ: إقامات، رخص تجارية، سجلات تجارية. البيانات في localStorage على الجهاز. */
const KEY='expiry-tracker-v1';
const TYPES={iqama:{n:'إقامة',nn:'اسم صاحب الإقامة',num:'رقم الإقامة',p:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'},
 license:{n:'رخصة تجارية',nn:'اسم المنشأة',num:'رقم الرخصة',p:'M3 9l1-5h16l1 5M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-6h4v6'},
 cr:{n:'سجل تجاري',nn:'اسم المنشأة',num:'رقم السجل التجاري',p:'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8'}};
const $=s=>document.querySelector(s);
const validDate=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const[y,m,d]=v.split('-').map(Number);if(y<1900||y>2200)return false;const t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d};
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function clean(r){if(!r||typeof r!=='object'||Array.isArray(r))return null;
  if(!Object.prototype.hasOwnProperty.call(TYPES,r.type))return null;
  if(typeof r.name!=='string'||!r.name.trim()||r.name.length>200)return null;
  if(r.num!=null&&(typeof r.num!=='string'||r.num.length>60))return null;
  if(r.note!=null&&(typeof r.note!=='string'||r.note.length>1000))return null;
  if(!validDate(r.date))return null;
  return{id:(typeof r.id==='string'&&/^[a-z0-9]{1,24}$/.test(r.id))?r.id:newId(),type:r.type,name:r.name.trim(),num:(r.num||'').trim(),date:r.date,note:(r.note||'').trim()}}
function cleanAll(a){if(!Array.isArray(a)||a.length>5000)return null;const out=[],ids=new Set();for(const r of a){const c=clean(r);if(!c)return null;if(ids.has(c.id))c.id=newId();ids.add(c.id);out.push(c)}return out}
let items=[];try{items=cleanAll(JSON.parse(localStorage.getItem(KEY)||'[]'))||[]}catch(e){items=[]}
let filter='all',editing=null,cal='g';
const MK='expiry-meta-v5',DK='expiry-dirty-v5',IK='expiry-imported-v5',PK='expiry-tracker-v1-pre-v5';
if(!localStorage.getItem(PK)&&localStorage.getItem(KEY))localStorage.setItem(PK,localStorage.getItem(KEY));
let meta={},dirty=new Set();
try{meta=JSON.parse(localStorage.getItem(MK)||'{}')||{};dirty=new Set(JSON.parse(localStorage.getItem(DK)||'[]'))}catch(e){meta={};dirty=new Set()}
items.forEach(i=>{if(!meta[i.id])meta[i.id]={u:0,d:false}});
const touch=id=>{meta[id]={u:Date.now(),d:false};dirty.add(id)};
const tomb=id=>{meta[id]={u:Date.now(),d:true};dirty.add(id)};
const persist=()=>{localStorage.setItem(KEY,JSON.stringify(items));localStorage.setItem(MK,JSON.stringify(meta));localStorage.setItem(DK,JSON.stringify([...dirty]))};
const save=()=>{persist();cloudSync()};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const today=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())};
const days=s=>Math.round((parse(s)-today())/864e5);
const status=n=>n<0?'exp':n<=30?'30':n<=90?'90':'ok';
const hf=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{year:'numeric',month:'numeric',day:'numeric'});
function toHijri(d){const p=Object.fromEntries(hf.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return{y:+p.year,m:+p.month,d:+p.day}}
function fromHijri(y,m,d){
  const est=new Date(Date.UTC(622,6,16)+(y-1+(m-1)/12)*354.367*864e5);
  const c=new Date(est.getUTCFullYear(),est.getUTCMonth(),est.getUTCDate());
  for(let i=-60;i<=60;i++){const t=new Date(c.getFullYear(),c.getMonth(),c.getDate()+i);const h=toHijri(t);if(h.y===y&&h.m===m&&h.d===d)return t}
  return null}
const fmtG=s=>parse(s).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'});
const fmtH=s=>{const h=toHijri(parse(s));return h.d+'/'+h.m+'/'+h.y+' هـ'};
function label(n){if(n<0)return'منتهية منذ '+(-n)+' يوم';if(n===0)return'تنتهي اليوم';if(n===1)return'تنتهي غداً';return'باقي '+n+' يوم'}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const q=$('#q').value.trim().toLowerCase(),st=$('#st').value;
  const cnt={all:items.length,iqama:0,license:0,cr:0};items.forEach(i=>cnt[i.type]++);
  for(const k in cnt)$('#c-'+k).textContent=cnt[k];
  const base=items.filter(i=>filter==='all'||i.type===filter);
  const sc={exp:0,30:0,90:0,ok:0};base.forEach(i=>sc[status(days(i.date))]++);
  $('#s-exp').textContent=sc.exp;$('#s-30').textContent=sc[30];$('#s-90').textContent=sc[90];$('#s-ok').textContent=sc.ok;
  const rows=base.filter(i=>(st==='all'||status(days(i.date))===st)&&(!q||(i.name+' '+i.num).toLowerCase().includes(q))).sort((a,b)=>a.date.localeCompare(b.date));
  $('#list').innerHTML=rows.length?rows.map(i=>{const n=days(i.date),s=status(n),t=TYPES[i.type];
    return `<div class="row s-${s}" data-id="${esc(i.id)}"><div class="ico"><svg viewBox="0 0 24 24"><path d="${t.p}"/></svg></div><div class="info"><b>${esc(i.name)}</b><small>${t.n}${i.num?' · '+esc(i.num):''}</small></div><div class="when"><span class="badge">${label(n)}</span><small>${fmtG(i.date)} · ${fmtH(i.date)}</small></div></div>`}).join(''):`<div class="empty">${items.length?'لا توجد نتائج':'لسه مفيش بيانات. اضغط «إضافة» وابدأ.'}</div>`;
}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1800)}
function setCal(c){cal=c;$('#cal-g').classList.toggle('on',c==='g');$('#cal-h').classList.toggle('on',c==='h');$('#box-g').hidden=c!=='g';$('#box-h').hidden=c!=='h';updConv()}
function curDate(){if(cal==='g')return $('#f-date').value||null;const y=+$('#h-y').value,m=+$('#h-m').value,d=+$('#h-d').value;if(!y||!m||!d)return null;const g=fromHijri(y,m,d);return g?iso(g):null}
function updConv(){const d=curDate();$('#conv').textContent=d?(cal==='g'?'يوافق '+fmtH(d):'يوافق '+fmtG(d)):''}
function typeUI(){const t=TYPES[$('#f-type').value];$('#l-name').textContent=t.nn;$('#l-num').textContent=t.num}
function open(id){editing=id||null;const i=items.find(x=>x.id===id)||{type:filter!=='all'?filter:'iqama',name:'',num:'',date:'',note:''};
  $('#m-title').textContent=id?'تعديل':'إضافة';$('#f-type').value=i.type;$('#f-name').value=i.name;$('#f-num').value=i.num;$('#f-date').value=i.date;$('#f-note').value=i.note||'';
  $('#h-y').value=$('#h-m').value=$('#h-d').value='';$('#m-del').hidden=!id;typeUI();setCal('g');$('#modal').hidden=false}
const close=()=>$('#modal').hidden=true;
$('#btn-add').onclick=()=>open();
$('#m-cancel').onclick=close;
$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
$('#list').onclick=e=>{const r=e.target.closest('.row');if(r)open(r.dataset.id)};
$('#f-type').onchange=typeUI;
$('#cal-g').onclick=()=>{const d=curDate();setCal('g');if(d)$('#f-date').value=d;updConv()};
$('#cal-h').onclick=()=>{const d=$('#f-date').value;setCal('h');if(d){const h=toHijri(parse(d));$('#h-y').value=h.y;$('#h-m').value=h.m;$('#h-d').value=h.d}updConv()};
['f-date','h-y','h-m','h-d'].forEach(id=>$('#'+id).addEventListener('input',updConv));
$('#form').onsubmit=e=>{e.preventDefault();const date=curDate();if(!date){toast('أدخل تاريخ انتهاء صحيح');return}
  const rec={type:$('#f-type').value,name:$('#f-name').value.trim(),num:$('#f-num').value.trim(),date,note:$('#f-note').value.trim()};
  const ok=clean({id:editing||undefined,...rec});if(!ok){toast('بيانات غير صالحة');return}
  if(editing){Object.assign(items.find(x=>x.id===editing),ok)}else items.push(ok);
  touch(ok.id);
  save();close();render();toast('تم الحفظ')};
$('#m-del').onclick=()=>{if(confirm('حذف هذا السجل؟')){tomb(editing);items=items.filter(x=>x.id!==editing);save();close();render();toast('تم الحذف')}};
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('on'));b.classList.add('on');filter=b.dataset.f;$('#title').textContent=filter==='all'?'كل التواريخ':b.firstChild.textContent.trim();closeSide();render()});
$('#q').oninput=render;$('#st').onchange=render;
const closeSide=()=>{$('#side').classList.remove('open');$('#scrim').classList.remove('open')};
$('#menu').onclick=()=>{$('#side').classList.add('open');$('#scrim').classList.add('open')};$('#scrim').onclick=closeSide;
function dl(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
$('#btn-bak').onclick=()=>dl('expiry-backup-'+iso(today())+'.json',new Blob([JSON.stringify(items)],{type:'application/json'}));
$('#file-res').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2e6)throw 0;const d=cleanAll(JSON.parse(await f.text()));if(!d)throw 0;if(confirm('استرجاع '+d.length+' سجل؟ هيستبدل البيانات الحالية.')){const keep=new Set(d.map(x=>x.id));items.forEach(x=>{if(!keep.has(x.id))tomb(x.id)});items=d;d.forEach(x=>touch(x.id));save();render();toast('تم الاسترجاع')}}catch(_){toast('ملف غير صالح، لم يتم تغيير بياناتك')}e.target.value=''};
$('#btn-xls').onclick=()=>{const rows=[['النوع','الاسم','الرقم','تاريخ الانتهاء (ميلادي)','تاريخ الانتهاء (هجري)','الأيام المتبقية','ملاحظات']].concat([...items].sort((a,b)=>a.date.localeCompare(b.date)).map(i=>[TYPES[i.type].n,i.name,i.num,i.date,fmtH(i.date),days(i.date),i.note||'']));
  const cell=c=>{let t=String(c);if(typeof c==='string'&&/^[\s]*[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
  const csv='\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');dl('expiry-list-'+iso(today())+'.csv',new Blob([csv],{type:'text/csv;charset=utf-8'}))};
render();

/* ---------- مزامنة Firebase (مجموعة expiry، للمالك فقط) ---------- */
const OWNER='ahmedkamal199714@gmail.com';
let fb=null,cloudUser=null,unsub=null,syncing=false,syncAgain=false;
const setSync=(t,k)=>{const e=$('#sync-s');e.textContent=t;e.className='sync '+(k||'')};
const stamp=()=>new Date().toLocaleTimeString('ar-SA-u-nu-latn',{hour:'2-digit',minute:'2-digit'});
async function initCloud(){
  try{
    const cfg=await import('./firebase-config.js');
    const B='https://www.gstatic.com/firebasejs/10.12.2/';
    const[a,au,fs]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
    const app=a.initializeApp(cfg.firebaseConfig,'expiry');
    fb={au,fs,auth:au.getAuth(app),db:fs.getFirestore(app)};
    au.onAuthStateChanged(fb.auth,onUser);
    $('#btn-auth').onclick=async()=>{
      if(cloudUser){await au.signOut(fb.auth);return}
      try{await au.signInWithPopup(fb.auth,new au.GoogleAuthProvider())}
      catch(e){try{await au.signInWithRedirect(fb.auth,new au.GoogleAuthProvider())}catch(_){toast('تعذر تسجيل الدخول')}}
    };
  }catch(e){setSync('المزامنة غير متاحة','err');$('#btn-auth').hidden=true}
}
async function onUser(u){
  if(unsub){unsub();unsub=null}
  if(!u){cloudUser=null;setSync('غير متزامن (البيانات على هذا الجهاز)');$('#btn-auth').textContent='دخول بجوجل للمزامنة';return}
  if(u.email!==OWNER){await fb.au.signOut(fb.auth);toast('هذا الحساب غير مصرّح له');return}
  cloudUser=u;$('#btn-auth').textContent='تسجيل الخروج';setSync('جاري المزامنة...');
  const{collection,onSnapshot}=fb.fs;
  unsub=onSnapshot(collection(fb.db,'expiry'),snap=>applyRemote(snap),()=>setSync('فشلت المزامنة، البيانات محفوظة على الجهاز','err'));
}
function applyRemote(snap){
  const fromCache=snap.metadata.fromCache,seen=new Set();
  snap.forEach(d=>{
    const x=d.data(),id=d.id,u=Number(x.u)||0;seen.add(id);
    const m=meta[id];
    if(dirty.has(id)&&m&&m.u>u)return;            // تعديلي المحلي أحدث وسيُرفع
    if(m&&m.u===u&&!!m.d===!!x.d)return;          // نفس النسخة
    if(m&&m.u>u&&!dirty.has(id))return;
    if(x.d){meta[id]={u,d:true};items=items.filter(i=>i.id!==id);dirty.delete(id);return}
    const c=clean({id,type:x.type,name:x.name,num:x.num,date:x.date,note:x.note});
    if(!c)return;                                  // صف تالف في السحابة: يتجاهل ولا يمس المحلي
    meta[id]={u,d:false};dirty.delete(id);
    const k=items.findIndex(i=>i.id===id);if(k>=0)items[k]=c;else items.push(c);
  });
  if(!fromCache){
    const first=!localStorage.getItem(IK);
    items.slice().forEach(i=>{
      if(seen.has(i.id))return;
      if(first||dirty.has(i.id)){if(first&&!dirty.has(i.id)){meta[i.id]={u:Date.now(),d:false}}dirty.add(i.id)}
      else{items=items.filter(z=>z.id!==i.id);delete meta[i.id]}   // محذوف نهائياً من السحابة
    });
    localStorage.setItem(IK,'1');
  }
  persist();render();cloudSync();
}
async function cloudSync(){
  if(!fb||!cloudUser)return;
  if(syncing){syncAgain=true;return}
  syncing=true;let ok=true;
  try{
    const{doc,setDoc}=fb.fs;
    for(const id of [...dirty]){
      const m=meta[id];if(!m){dirty.delete(id);continue}
      const it=items.find(i=>i.id===id);
      if(m.d||!it)await setDoc(doc(fb.db,'expiry',id),{d:true,u:m.u});
      else{const{id:_,...rest}=it;await setDoc(doc(fb.db,'expiry',id),{...rest,u:m.u,d:false})}
      if(meta[id]&&meta[id].u===m.u)dirty.delete(id);
    }
    persist();
  }catch(e){ok=false}
  syncing=false;
  setSync(ok?'متزامن ✓ '+stamp():'فشلت المزامنة، البيانات محفوظة على الجهاز',ok?'ok':'err');
  if(syncAgain){syncAgain=false;cloudSync()}
}
initCloud();
