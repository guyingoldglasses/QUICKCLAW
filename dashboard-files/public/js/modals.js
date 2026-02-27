/* QuickClaw Dashboard — Modal Components */
function CopySkillModal({skill,profileId,profiles,onClose,toast}){
  var others=profiles.filter(function(p){return p.id!==profileId;});
  var[sel,setSel]=useState({});var[busy,setBusy]=useState(false);
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();}},
      React.createElement('h3',{style:{marginBottom:16}},'Copy "'+skill+'" to:'),
      others.map(function(p){return React.createElement('label',{key:p.id,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 0',cursor:'pointer',fontSize:13}},
        React.createElement('input',{type:'checkbox',checked:!!sel[p.id],onChange:function(e){var s=Object.assign({},sel);s[p.id]=e.target.checked;setSel(s);}}),
        React.createElement('b',null,p.id),
        React.createElement('span',{className:'mono',style:{color:'var(--dim)',fontSize:11}},':'+p.port)
      );}),
      React.createElement('div',{style:{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}},
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:onClose},'Cancel'),
        React.createElement('button',{className:'btn btn-sm btn-primary',disabled:busy,onClick:async function(){setBusy(true);var t=Object.entries(sel).filter(function(x){return x[1];}).map(function(x){return x[0];});if(t.length){await api('/profiles/'+profileId+'/skills/'+skill+'/copy',{method:'POST',body:{targets:t}});toast('Copied!','success');onClose();}setBusy(false);}},busy?React.createElement('span',{className:'spinner'}):null,' Copy')
      )
    )
  );
}

function CreateProfileModal({profiles,onClose,toast,onCreated}){
  var[id,setId]=useState('');var[name,setName]=useState('');var[port,setPort]=useState('');var[copyFrom,setCopyFrom]=useState('');var[busy,setBusy]=useState(false);
  useEffect(function(){var p=18802;while(profiles.some(function(x){return x.port===p;}))p++;setPort(String(p));},[]);
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();}},
      React.createElement('h3',{style:{marginBottom:16,fontSize:18}},'Create New Profile'),
      React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Profile ID'),React.createElement('input',{className:'input',value:id,onChange:function(e){setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''));},placeholder:'e.g. research-bot'})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Display Name'),React.createElement('input',{className:'input',value:name,onChange:function(e){setName(e.target.value);},placeholder:'e.g. Research Agent'})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Port'),React.createElement('input',{className:'input',type:'number',value:port,onChange:function(e){setPort(e.target.value);}})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Copy from'),
          React.createElement('select',{value:copyFrom,onChange:function(e){setCopyFrom(e.target.value);},className:'input',style:{fontFamily:'inherit'}},
            React.createElement('option',{value:''},'Start fresh'),
            profiles.map(function(p){return React.createElement('option',{key:p.id,value:p.id},p.id);})
          )),
        React.createElement('div',{style:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:onClose},'Cancel'),
          React.createElement('button',{className:'btn btn-sm btn-primary',disabled:busy,onClick:async function(){if(!id||!port)return;setBusy(true);try{await api('/profiles',{method:'POST',body:{id:id,name:name||id,port:parseInt(port),copyFrom:copyFrom||undefined}});toast('Created!','success');onCreated();onClose();}catch(e){toast(e.message,'error');}setBusy(false);}},busy?React.createElement('span',{className:'spinner'}):null,' Create')
        )
      )
    )
  );
}

function ResetProfileModal({profileId,onClose,toast}){
  var[soul,setSoul]=useState(true);var[mem,setMem]=useState(true);var[sess,setSess]=useState(false);
  var[busy,setBusy]=useState(false);var[result,setResult]=useState(null);
  function mkOpt(label,desc,val,set){
    return React.createElement('label',{key:label,style:{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},
      React.createElement('input',{type:'checkbox',checked:val,onChange:function(e){set(e.target.checked);},style:{marginTop:3}}),
      React.createElement('div',null,React.createElement('div',{style:{fontWeight:600,fontSize:13}},label),React.createElement('div',{style:{color:'var(--dim)',fontSize:11,marginTop:2}},desc)));
  }
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();}},
      React.createElement('h3',{style:{marginBottom:4,fontSize:18}},'🔄 Reset Profile: '+profileId),
      React.createElement('p',{style:{color:'var(--dim)',fontSize:12,marginBottom:16}},'Backup is created automatically. API keys, skills, and service config are preserved.'),
      !result ? React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
          mkOpt('Reset Soul','Revert personality to default template',soul,setSoul),
          mkOpt('Clear Memory','Remove all memory/*.md files and MEMORY.md',mem,setMem),
          mkOpt('Clear Sessions','Wipe session history (fresh conversation start)',sess,setSess)),
        React.createElement('div',{style:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:onClose},'Cancel'),
          React.createElement('button',{className:'btn btn-sm btn-danger',style:{background:'rgba(248,113,113,.1)'},disabled:busy,onClick:async function(){if(!soul&&!mem&&!sess)return;setBusy(true);try{var r=await api('/profiles/'+profileId+'/reset',{method:'POST',body:{resetSoul:soul,resetMemory:mem,resetSessions:sess}});setResult(r);toast('Reset complete','success');}catch(e){toast(e.message,'error');}setBusy(false);}},busy?React.createElement('span',{className:'spinner'}):null,' Reset'))
      ) : React.createElement('div',null,
        React.createElement('div',{style:{padding:16,background:'var(--green-d)',borderRadius:8,marginBottom:12}},
          React.createElement('div',{style:{fontWeight:600,color:'var(--green)',marginBottom:8}},'✓ Reset Complete'),
          (result.actions||[]).map(function(a,i){return React.createElement('div',{key:i,className:'mono',style:{fontSize:12,color:'var(--text)',padding:'2px 0'}},'• '+a);}),
          React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:8}},'Backup: '+result.backupDir)),
        React.createElement('div',{style:{textAlign:'right'}},React.createElement('button',{className:'btn btn-sm btn-primary',onClick:onClose},'Done')))
    )
  );
}

function MemoryFileModal({profileId,file,onClose,toast}){
  var[content,setContent]=useState(null);var[editing,setEditing]=useState(false);var[editContent,setEditContent]=useState('');
  useEffect(function(){api('/profiles/'+profileId+'/memory/'+file.name).then(function(d){setContent(d.content);setEditContent(d.content);}).catch(function(){setContent('Failed to load');});},[]);
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();},style:{maxWidth:700}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
        React.createElement('h3',null,file.name),
        React.createElement('div',{style:{display:'flex',gap:6}},
          !editing&&content!==null?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(true);}},'✎ Edit'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-primary',onClick:async function(){await api('/profiles/'+profileId+'/memory/'+file.name,{method:'PUT',body:{content:editContent}});setContent(editContent);setEditing(false);toast('Saved','success');}},'💾 Save'):null,
          !editing&&file.location!=='workspace'?React.createElement('button',{className:'btn btn-xs btn-danger',onClick:async function(){if(!confirm('Archive '+file.name+'?'))return;await api('/profiles/'+profileId+'/memory/'+file.name,{method:'DELETE'});toast('Archived','success');onClose();}},'🗑'):null,
          React.createElement('button',{className:'btn btn-ghost',onClick:onClose,style:{fontSize:18}},'✕')
        )
      ),
      content===null?React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'})):
      editing?React.createElement('textarea',{value:editContent,onChange:function(e){setEditContent(e.target.value);},className:'mono',style:{width:'100%',minHeight:400,padding:14,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}):
      React.createElement('pre',{style:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:14,fontSize:12,lineHeight:1.7,maxHeight:'60vh',overflowY:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:"'JetBrains Mono',monospace",color:'var(--text)'}},content)
    )
  );
}

function CronAddModal({profileId,onClose,toast,onAdded}){
  var[name,setName]=useState('');var[schedType,setSchedType]=useState('cron');var[schedule,setSchedule]=useState('');
  var[tz,setTz]=useState('Pacific/Honolulu');var[session,setSession]=useState('isolated');var[message,setMessage]=useState('');
  var[busy,setBusy]=useState(false);
  var presets=[{l:'Every hour',s:'0 * * * *'},{l:'Morning 7am',s:'0 7 * * *'},{l:'Evening 6pm',s:'0 18 * * *'},{l:'Weekdays 9am',s:'0 9 * * 1-5'},{l:'Every 30min',s:'*/30 * * * *'},{l:'Monday 8am',s:'0 8 * * 1'}];
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();},style:{maxWidth:600}},
      React.createElement('h3',{style:{marginBottom:16}},'⏰ Add Cron Job'),
      React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Name'),React.createElement('input',{className:'input',value:name,onChange:function(e){setName(e.target.value);},placeholder:'e.g. Morning Briefing'})),
        React.createElement('div',null,
          React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Schedule Type'),
          React.createElement('div',{style:{display:'flex',gap:6}},
            ['cron','at','every'].map(function(v){var labels={cron:'Cron',at:'One-time',every:'Interval'};return React.createElement('button',{key:v,className:'btn btn-sm '+(schedType===v?'btn-primary':'btn-default'),onClick:function(){setSchedType(v);}},labels[v]);}))),
        schedType==='cron'?React.createElement('div',null,
          React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Cron Expression'),
          React.createElement('input',{className:'input',value:schedule,onChange:function(e){setSchedule(e.target.value);},placeholder:'0 7 * * * (min hour day month weekday)'}),
          React.createElement('div',{style:{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}},presets.map(function(p){return React.createElement('button',{key:p.l,className:'btn btn-xs btn-default',onClick:function(){setSchedule(p.s);}},p.l);}))
        ):schedType==='at'?React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'When'),React.createElement('input',{className:'input',value:schedule,onChange:function(e){setSchedule(e.target.value);},placeholder:'2026-02-17T10:00:00Z or 20m'})):
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Interval'),React.createElement('input',{className:'input',value:schedule,onChange:function(e){setSchedule(e.target.value);},placeholder:'30m, 1h, 6h'})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Timezone'),React.createElement('input',{className:'input',value:tz,onChange:function(e){setTz(e.target.value);}})),
        React.createElement('div',null,
          React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Session'),
          React.createElement('div',{style:{display:'flex',gap:6}},
            React.createElement('button',{className:'btn btn-sm '+(session==='isolated'?'btn-primary':'btn-default'),onClick:function(){setSession('isolated');}},'Isolated (background)'),
            React.createElement('button',{className:'btn btn-sm '+(session==='main'?'btn-primary':'btn-default'),onClick:function(){setSession('main');}},'Main (alert)')),
          React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)',marginTop:4}},session==='isolated'?"Runs independently, won't clutter your chat":'Runs in main conversation as a system event')),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Task / Message'),
          React.createElement('textarea',{className:'input mono',value:message,onChange:function(e){setMessage(e.target.value);},placeholder:'What should the agent do?',style:{minHeight:80,resize:'vertical',lineHeight:1.5}})),
        React.createElement('div',{style:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:onClose},'Cancel'),
          React.createElement('button',{className:'btn btn-sm btn-primary',disabled:busy,onClick:async function(){if(!name||!schedule||!message)return;setBusy(true);try{var r=await api('/profiles/'+profileId+'/cron/add',{method:'POST',body:{name:name,schedule:schedule,scheduleType:schedType,timezone:tz,session:session,message:message}});toast(r.ok?'Cron job added!':'Failed: '+(r.output||''),'success');onAdded();onClose();}catch(e){toast(e.message,'error');}setBusy(false);}},busy?React.createElement('span',{className:'spinner'}):null,' Create Job'))
      )
    )
  );
}
