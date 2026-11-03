const APP_NAME="Jammy's Signature Salon";
const ROOT="Jammy's Signature Salon - Invoices";
const TZ="Asia/Kolkata";
function doGet(){return HtmlService.createHtmlOutputFromFile('Index').setTitle(APP_NAME+' | Billing').addMetaTag('viewport','width=device-width, initial-scale=1');}
function setupInvoiceApp(){const p=PropertiesService.getScriptProperties();let id=p.getProperty('ROOT_ID'),f=null;if(id){try{f=DriveApp.getFolderById(id)}catch(e){}}if(!f){const it=DriveApp.getFoldersByName(ROOT);f=it.hasNext()?it.next():DriveApp.createFolder(ROOT);p.setProperty('ROOT_ID',f.getId())}return {folderName:f.getName(),url:f.getUrl()};}
function getAppConfig(){const p=PropertiesService.getScriptProperties();return {config:JSON.parse(p.getProperty('SALON_CONFIG')||JSON.stringify({name:APP_NAME,address:'195, Justice Rathinavel Pandian Rd, Golden George Nagar, Mogappair East, Chennai, Tamil Nadu 600107',phone:'098406 70014',gstin:'',gstEnabled:false,gstRate:5})),services:JSON.parse(p.getProperty('SALON_SERVICES')||'[]').map(s=>({name:s.name||'',memberPrice:Number(s.memberPrice??s.price??0),nonMemberPrice:Number(s.nonMemberPrice??s.price??0)}))};}
function saveAppSettings(x){if(!x||!x.config)throw Error('Invalid settings');const p=PropertiesService.getScriptProperties();p.setProperty('SALON_CONFIG',JSON.stringify(x.config));p.setProperty('SALON_SERVICES',JSON.stringify(x.services||[]));return {ok:true};}
function createInvoice(d){if(!d||!d.items||!d.items.length)throw Error('Add at least one service');setupInvoiceApp();const p=PropertiesService.getScriptProperties(),cfg=getAppConfig().config,now=new Date(),yr=Utilities.formatDate(now,TZ,'yyyy'),mo=Utilities.formatDate(now,TZ,'MM'),key='COUNT_'+yr+mo,lock=LockService.getScriptLock();lock.waitLock(20000);let no;try{const n=Number(p.getProperty(key)||0)+1;p.setProperty(key,String(n));no='JSS-'+yr+mo+'-'+String(n).padStart(4,'0')}finally{lock.releaseLock()}
const items=d.items.map(x=>{const qty=Math.max(1,Number(x.qty)||1),price=Math.max(0,Number(x.price)||0);return {name:String(x.name||'Service').slice(0,100),category:String(x.category||'Other'),gender:String(x.gender||'unisex'),qty,price,amount:qty*price}}),sub=items.reduce((a,x)=>a+x.amount,0),disc=Math.min(sub,Math.max(0,Number(d.discount)||0)),rate=cfg.gstEnabled?Math.max(0,Number(cfg.gstRate)||0):0,tax=(sub-disc)*rate/100,total=sub-disc+tax,paid=Math.min(total,Math.max(0,Number(d.amountPaid)||0));
const inv={invoiceNo:no,date:Utilities.formatDate(now,TZ,'dd MMM yyyy, hh:mm a'),createdAt:now.toISOString(),salon:cfg,customer:{name:String(d.customerName||'Walk-in Customer'),phone:String(d.customerPhone||''),membership:d.membership||'Non-member'},items,subtotal:sub,discount:disc,gstRate:rate,tax,total,amountPaid:paid,balance:total-paid,paymentMethod:d.paymentMethod||'Cash',notes:String(d.notes||'')};
const t=HtmlService.createTemplateFromFile('InvoicePdf');t.invoice=inv;const blob=t.evaluate().getBlob().getAs(MimeType.PDF).setName(no+'.pdf'),root=DriveApp.getFolderById(p.getProperty('ROOT_ID')),it=root.getFoldersByName(yr),folder=it.hasNext()?it.next():root.createFolder(yr),file=folder.createFile(blob);let linkSharingEnabled=false,sharingError='';try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);linkSharingEnabled=true}catch(e){sharingError=String(e.message||e)}saveInvoiceToReportBook_(inv,file.getUrl());return {ok:true,invoiceNo:no,fileId:file.getId(),fileUrl:file.getUrl(),shareUrl:'https://drive.google.com/file/d/'+file.getId()+'/view',downloadUrl:'https://drive.google.com/uc?export=download&id='+file.getId(),linkSharingEnabled,sharingError,total};}
function listInvoices(){setupInvoiceApp();const root=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ROOT_ID')),ys=root.getFolders(),out=[];while(ys.hasNext()){const fs=ys.next().getFilesByType(MimeType.PDF);while(fs.hasNext()){const f=fs.next();out.push({name:f.getName(),url:f.getUrl(),date:f.getDateCreated().toISOString()})}}return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,200);}


// REPORTING DATABASE: one invoice row plus one row per service line.
function getReportBook_(){
  const p=PropertiesService.getScriptProperties(); let id=p.getProperty('REPORT_BOOK_ID'), ss=null;
  if(id){try{ss=SpreadsheetApp.openById(id)}catch(e){}}
  if(!ss){const root=DriveApp.getFolderById(p.getProperty('ROOT_ID'));ss=SpreadsheetApp.create("Jammy's Salon - Reporting Database");const f=DriveApp.getFileById(ss.getId());root.addFile(f);DriveApp.getRootFolder().removeFile(f);p.setProperty('REPORT_BOOK_ID',ss.getId());}
  const invHeaders=['Invoice No','Created At','Customer Name','Phone','Membership','Subtotal','Discount','GST Rate','GST Amount','Invoice Total','Amount Received','Outstanding','Payment Method','PDF URL','Notes'];
  const lineHeaders=['Invoice No','Created At','Customer Name','Phone','Membership','Service','Category','Gender','Quantity','Unit Price','Line Amount'];
  let a=ss.getSheetByName('Invoices');if(!a)a=ss.insertSheet('Invoices');if(a.getLastRow()===0)a.appendRow(invHeaders);
  let b=ss.getSheetByName('Service Lines');if(!b)b=ss.insertSheet('Service Lines');if(b.getLastRow()===0)b.appendRow(lineHeaders);
  return ss;
}
function saveInvoiceToReportBook_(inv,pdfUrl){
  const ss=getReportBook_(),a=ss.getSheetByName('Invoices'),b=ss.getSheetByName('Service Lines');
  if(a.createTextFinder(inv.invoiceNo).matchEntireCell(true).findNext())throw new Error('Invoice already recorded in reporting database: '+inv.invoiceNo);
  a.appendRow([inv.invoiceNo,inv.createdAt,inv.customer.name,inv.customer.phone,inv.customer.membership,inv.subtotal,inv.discount,inv.gstRate,inv.tax,inv.total,inv.amountPaid,inv.balance,inv.paymentMethod,pdfUrl,inv.notes]);
  const rows=inv.items.map(x=>[inv.invoiceNo,inv.createdAt,inv.customer.name,inv.customer.phone,inv.customer.membership,x.name,x.category||'Other',x.gender||'unisex',x.qty,x.price,x.amount]);
  if(rows.length)b.getRange(b.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}
function getSalonReports(filters){
  const ss=getReportBook_(),from=filters&&filters.from?new Date(filters.from+'T00:00:00+05:30'):new Date('2000-01-01T00:00:00+05:30'),to=filters&&filters.to?new Date(filters.to+'T23:59:59+05:30'):new Date('2100-01-01T00:00:00+05:30');
  const sh=ss.getSheetByName('Invoices'),ls=ss.getSheetByName('Service Lines');const iv=sh.getDataRange().getValues(),lv=ls.getDataRange().getValues();
  const invoices=iv.slice(1).filter(r=>{const d=new Date(r[1]);return r[0]&&d>=from&&d<=to});const ids=new Set(invoices.map(r=>String(r[0])));const lines=lv.slice(1).filter(r=>ids.has(String(r[0])));
  const sum=(idx)=>invoices.reduce((a,r)=>a+(Number(r[idx])||0),0);const count=invoices.length;
  const by=(arr,key,val)=>{const m={};arr.forEach(r=>{const k=String(r[key]||'Unknown');m[k]=(m[k]||0)+(val===null?1:(Number(r[val])||0))});return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))};
  const report=filters&&filters.report||'summary';let rows=[],headers=[];
  if(report==='summary'){headers=['Metric','Amount'];rows=[['Invoice count',count],['Gross sales / subtotal',sum(5)],['Discounts',sum(6)],['Taxable value',sum(5)-sum(6)],['GST amount',sum(8)],['Invoice total',sum(9)],['Amount received',sum(10)],['Outstanding',sum(11)]]}
  else if(report==='collection'){headers=['Metric','Amount'];rows=[['Invoice total',sum(9)],['Amount received',sum(10)],['Outstanding',sum(11)],['Collection rate',sum(9)?(sum(10)/sum(9)*100).toFixed(2)+'%':'0%']]}
  else if(report==='services'){headers=['Service','Quantity','Revenue'];const m={};lines.forEach(r=>{const k=String(r[5]);if(!m[k])m[k]=[0,0];m[k][0]+=Number(r[8])||0;m[k][1]+=Number(r[10])||0});rows=Object.entries(m).sort((a,b)=>b[1][1]-a[1][1]).map(([k,v])=>[k,v[0],v[1]])}
  else if(report==='customers'){headers=['Customer type','Invoices','Invoice total','Amount received','Outstanding'];['Member','Non-member'].forEach(k=>{const a=invoices.filter(r=>r[4]===k);rows.push([k,a.length,a.reduce((s,r)=>s+(+r[9]||0),0),a.reduce((s,r)=>s+(+r[10]||0),0),a.reduce((s,r)=>s+(+r[11]||0),0)])})}
  else if(report==='payments'){headers=['Payment method','Invoices','Invoice total','Amount received'];const m={};invoices.forEach(r=>{const k=String(r[12]||'Unknown');if(!m[k])m[k]=[0,0,0];m[k][0]++;m[k][1]+=Number(r[9])||0;m[k][2]+=Number(r[10])||0});rows=Object.entries(m).map(([k,v])=>[k,...v])}
  else if(report==='discounts'){headers=['Invoice No','Customer','Subtotal','Discount','Discount %','Invoice Total'];rows=invoices.filter(r=>Number(r[6])>0).map(r=>[r[0],r[2],r[5],r[6],r[5]?((r[6]/r[5])*100).toFixed(2)+'%':'0%',r[9]])}
  else if(report==='outstanding'){headers=['Invoice No','Date','Customer','Phone','Invoice Total','Received','Outstanding'];rows=invoices.filter(r=>Number(r[11])>0).map(r=>[r[0],r[1],r[2],r[3],r[9],r[10],r[11]])}
  else if(report==='gst'){headers=['Invoice No','Date','Customer','Taxable Value','GST Rate','GST Amount','Invoice Total'];rows=invoices.filter(r=>Number(r[8])>0).map(r=>[r[0],r[1],r[2],Number(r[5])-Number(r[6]),r[7],r[8],r[9]])}
  else if(report==='daily'){headers=['Date','Invoices','Invoice Total','Received','Outstanding'];const m={};invoices.forEach(r=>{const k=Utilities.formatDate(new Date(r[1]),TZ,'yyyy-MM-dd');if(!m[k])m[k]=[0,0,0,0];m[k][0]++;m[k][1]+=+r[9]||0;m[k][2]+=+r[10]||0;m[k][3]+=+r[11]||0});rows=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,...v])}
  else {headers=['Invoice No','Date','Customer','Phone','Membership','Subtotal','Discount','GST','Total','Received','Outstanding','Payment','PDF'];rows=invoices.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[8],r[9],r[10],r[11],r[12],r[13]])}
  return {report,from:filters&&filters.from||'',to:filters&&filters.to||'',headers,rows,totals:{invoiceCount:count,subtotal:sum(5),discount:sum(6),gst:sum(8),total:sum(9),received:sum(10),outstanding:sum(11)},spreadsheetUrl:ss.getUrl()};
}
function exportReportPdf(filters){
  const r=getSalonReports(filters),t=HtmlService.createTemplate('<html><head><style>body{font:10px Arial;padding:24px;color:#222}h1{color:#987638}table{border-collapse:collapse;width:100%;margin-top:18px}th{background:#222;color:#e0bd78}td,th{padding:7px;border:1px solid #ddd;text-align:left}</style></head><body><h1>JAMMY\'S SIGNATURE SALON</h1><h2>'+String(r.report).toUpperCase()+' REPORT</h2><p>Period: '+(r.from||'All dates')+' to '+(r.to||'All dates')+'</p><table><tr>'+r.headers.map(x=>'<th>'+x+'</th>').join('')+'</tr>'+r.rows.map(row=>'<tr>'+row.map(v=>'<td>'+String(v==null?'':v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</td>').join('')+'</tr>').join('')+'</table></body></html>');
  return Utilities.base64Encode(t.evaluate().getBlob().getAs(MimeType.PDF).getBytes());
}
