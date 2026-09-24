const SHEETS = ['Learners','Activity','Submissions'];
function doGet(e){
  const p=e&&e.parameter||{};
  if(p.type==='admin_summary') return json_(adminSummary_(p.key||''));
  return json_({ok:true,service:'ByteLab analytics',message:'ByteLab endpoint is running.'});
}
function doPost(e){
  try{
    const data=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    setup_();
    if(data.type==='registration') return json_(register_(data));
    if(data.type==='event') return json_(logEvent_(data));
    if(data.type==='submission') return json_(submission_(data));
    return json_({ok:false,error:'Unknown request type'});
  }catch(err){return json_({ok:false,error:String(err)});}
}
function setup_(){
  const ss=SpreadsheetApp.getActive();
  const headers={
    Learners:['Timestamp','Name','Email','Course','Visitor ID','Learner ID'],
    Activity:['Timestamp','Event','Visitor ID','Learner ID','Course','Page','Extra'],
    Submissions:['Timestamp','Name','Type','Link','Visitor ID','Learner ID']
  };
  Object.keys(headers).forEach(n=>{let sh=ss.getSheetByName(n);if(!sh)sh=ss.insertSheet(n);if(sh.getLastRow()===0)sh.appendRow(headers[n]);});
}
function register_(d){
  const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName('Learners');
  const id='BL-'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();
  sh.appendRow([new Date(),d.name||'',d.email||'',d.course||'',d.visitorId||'',id]);
  return {ok:true,learnerId:id};
}
function logEvent_(d){
  const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName('Activity');
  const extra=Object.assign({},d);['type','event','visitorId','learnerId','course','page','timestamp'].forEach(k=>delete extra[k]);
  sh.appendRow([new Date(d.timestamp||Date.now()),d.event||'',d.visitorId||'',d.learnerId||'',d.course||'',d.page||'',JSON.stringify(extra)]);
  return {ok:true};
}
function submission_(d){
  SpreadsheetApp.getActive().getSheetByName('Submissions').appendRow([new Date(d.timestamp||Date.now()),d.name||'',d.submissionType||'',d.link||'',d.visitorId||'',d.learnerId||'']);
  return {ok:true};
}
function adminSummary_(key){
  const expected=PropertiesService.getScriptProperties().getProperty('BYTELAB_ADMIN_KEY');
  if(!expected||key!==expected)return {ok:false,error:'Unauthorized'};
  const ss=SpreadsheetApp.getActive(),activity=ss.getSheetByName('Activity'),learners=ss.getSheetByName('Learners');
  const a=activity?activity.getDataRange().getValues():[],l=learners?learners.getDataRange().getValues():[];
  const visitors=new Set(),events={};
  a.slice(1).forEach(r=>{if(r[2])visitors.add(String(r[2]));if(r[1])events[r[1]]=(events[r[1]]||0)+1;});
  return {ok:true,uniqueVisitors:visitors.size,registeredLearners:Math.max(0,l.length-1),events};
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
