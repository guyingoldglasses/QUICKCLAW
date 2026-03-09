/* QuickClaw Dashboard — Profile Wizard */
function ProfileWizard({profiles,onClose,toast,onCreated}){
  var[step,setStep]=useState(0);
  var[id,setId]=useState('');var[name,setName]=useState('');var[port,setPort]=useState('');
  var[importFrom,setImportFrom]=useState('');
  var[doSkills,setDoSkills]=useState(true);var[doSoul,setDoSoul]=useState(true);var[doEnv,setDoEnv]=useState(true);
  var[availSkills,setAvailSkills]=useState([]);var[selSkills,setSelSkills]=useState({});
  var[availKeys,setAvailKeys]=useState([]);var[selKeys,setSelKeys]=useState({});
  var[tgToken,setTgToken]=useState('');var[tgAuto,setTgAuto]=useState(true);
  var[busy,setBusy]=useState(false);var[result,setResult]=useState(null);
  useEffect(function(){var p=18802;while(profiles.some(function(x){return x.port===p;}))p++;setPort(String(p));},[]);
  useEffect(function(){
    if(!importFrom)return;
    api('/profiles/'+importFrom+'/skills/list').then(function(d){
      setAvailSkills(d.skills||[]);var s={};(d.skills||[]).forEach(function(sk){s[sk]=true;});setSelSkills(s);
    }).catch(function(){});
    api('/profiles/'+importFrom+'/env/keys').then(function(d){
      setAvailKeys(d.keys||[]);var s={};(d.keys||[]).forEach(function(k){s[k.key]=true;});setSelKeys(s);
    }).catch(function(){});
  },[importFrom]);
  function doCreate(){setBusy(true);
    var body={id:id,name:name||id,port:parseInt(port),importFrom:importFrom||undefined,
      importSkills:doSkills&&importFrom?Object.keys(selSkills).filter(function(k){return selSkills[k];}):undefined,
      importSoul:doSoul&&!!importFrom,importEnv:doEnv&&!!importFrom,
      importEnvKeys:doEnv&&importFrom?Object.keys(selKeys).filter(function(k){return selKeys[k];}):undefined,
      telegramBotToken:tgToken||undefined,telegramAutoApprove:tgAuto,autoApproveUserId:tgAuto?'6741444182':undefined};
    api('/profiles/wizard',{method:'POST',body:body}).then(function(r){setResult(r);toast('Profile created!','success');onCreated();setBusy(false);}).catch(function(e){toast(e.message,'error');setBusy(false);});}
  var steps=['Identity','Import','Telegram','Create'];
  function chk(label,val,set){return React.createElement('label',{className:'check-item'},React.createElement('input',{type:'checkbox',checked:val,onChange:function(e){set(e.target.checked);}}),label);}
  function rs(){
    if(result){return React.createElement('div',null,
      React.createElement('div',{style:{padding:20,background:'var(--green-d)',borderRadius:10,marginBottom:16}},
        React.createElement('div',{style:{fontSize:18,fontWeight:700,color:'var(--green)',marginBottom:10}},'✓ Profile Created!'),
        (result.actions||[]).map(function(a,i){return React.createElement('div',{key:i,style:{fontSize:12,color:'var(--text)',padding:'2px 0'}},'• '+a);})),
      React.createElement('div',{style:{display:'flex',gap:8,justifyContent:'flex-end'}},
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:onClose},'Done')));}
    if(step===0){return React.createElement('div',{style:{padding:16,background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}},
      React.createElement('div',{style:{fontSize:16,fontWeight:700,marginBottom:16}},'① Profile Identity'),
      React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Profile ID (lowercase, dashes ok)'),
          React.createElement('input',{className:'input',value:id,onChange:function(e){setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''));},placeholder:'e.g. research-bot'})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Display Name'),
          React.createElement('input',{className:'input',value:name,onChange:function(e){setName(e.target.value);},placeholder:'e.g. Research Agent'})),
        React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Gateway Port'),
          React.createElement('input',{className:'input',type:'number',value:port,onChange:function(e){setPort(e.target.value);}}))));}
    if(step===1){return React.createElement('div',{style:{padding:16,background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}},
      React.createElement('div',{style:{fontSize:16,fontWeight:700,marginBottom:6}},'② Import from Existing'),
      React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:16}},'Cherry-pick what to bring over, or start fresh.'),
      React.createElement('select',{className:'input',value:importFrom,onChange:function(e){setImportFrom(e.target.value);},style:{fontFamily:'inherit',marginBottom:12}},
        React.createElement('option',{value:''},'— Start fresh (no import) —'),
        profiles.map(function(p){return React.createElement('option',{key:p.id,value:p.id},'Import from: '+p.id+' (:'+p.port+')');})),
      importFrom?React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8}},
        React.createElement('label',{className:'check-item',style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8}},
          React.createElement('input',{type:'checkbox',checked:doSkills,onChange:function(e){setDoSkills(e.target.checked);}}),
          React.createElement('div',null,React.createElement('div',{style:{fontWeight:600}},'🛠 Skills'),React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},availSkills.length+' available'))),
        doSkills&&availSkills.length>0?React.createElement('div',{style:{marginLeft:36,display:'flex',flexDirection:'column',gap:2}},
          availSkills.map(function(sk){return React.createElement('label',{key:sk,className:'check-item',style:{padding:'4px 8px'}},
            React.createElement('input',{type:'checkbox',checked:!!selSkills[sk],onChange:function(e){var s=Object.assign({},selSkills);s[sk]=e.target.checked;setSelSkills(s);}}),sk);})):null,
        React.createElement('label',{className:'check-item',style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8}},
          React.createElement('input',{type:'checkbox',checked:doSoul,onChange:function(e){setDoSoul(e.target.checked);}}),
          React.createElement('div',null,React.createElement('div',{style:{fontWeight:600}},'👻 Soul / Personality'),React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},'Copy soul.md'))),
        React.createElement('label',{className:'check-item',style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8}},
          React.createElement('input',{type:'checkbox',checked:doEnv,onChange:function(e){setDoEnv(e.target.checked);}}),
          React.createElement('div',null,React.createElement('div',{style:{fontWeight:600}},'🔑 API Keys (.env)'),React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},availKeys.length+' keys'))),
        doEnv&&availKeys.length>0?React.createElement('div',{style:{marginLeft:36,display:'flex',flexDirection:'column',gap:2}},
          availKeys.map(function(k){return React.createElement('label',{key:k.key,className:'check-item',style:{padding:'4px 8px'}},
            React.createElement('input',{type:'checkbox',checked:!!selKeys[k.key],onChange:function(e){var s=Object.assign({},selKeys);s[k.key]=e.target.checked;setSelKeys(s);}}),
            React.createElement('span',{className:'mono',style:{fontSize:12}},k.key),
            k.sensitive?React.createElement('span',{className:'badge',style:{fontSize:9,color:'var(--amber)',background:'var(--amber-d)'}},'secret'):null);})):null
      ):React.createElement('div',{style:{padding:20,textAlign:'center',color:'var(--dim)',fontSize:13}},'Clean slate — add skills & keys later.'));}
    if(step===2){return React.createElement('div',{style:{padding:16,background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}},
      React.createElement('div',{style:{fontSize:16,fontWeight:700,marginBottom:6}},'③ Telegram Bot (Optional)'),
      React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:16}},'Skip if you don\'t need Telegram for this agent.'),
      React.createElement('div',{style:{marginBottom:12}},
        React.createElement('label',{className:'mono',style:{fontSize:11,color:'var(--dim)',display:'block',marginBottom:4}},'Bot Token from @BotFather'),
        React.createElement('input',{className:'input mono',value:tgToken,onChange:function(e){setTgToken(e.target.value);},placeholder:'Leave empty to skip'})),
      tgToken?React.createElement('label',{className:'check-item',style:{background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}},
        React.createElement('input',{type:'checkbox',checked:tgAuto,onChange:function(e){setTgAuto(e.target.checked);}}),
        React.createElement('div',null,React.createElement('div',{style:{fontWeight:600}},'Auto-approve my account'),
          React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},'Pre-authorizes 6741444182 (skip pairing)'))):null,
      !tgToken?React.createElement('div',{style:{padding:14,background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)',marginTop:8,fontSize:12,color:'var(--dim)',lineHeight:1.6}},
        'To create: Telegram → @BotFather → /newbot → copy token'):null);}
    if(step===3){
      var sum=[];sum.push('Profile: '+id+' ('+(name||id)+') port '+port);
      if(importFrom){sum.push('Import from: '+importFrom);
        if(doSkills)sum.push('  Skills: '+Object.keys(selSkills).filter(function(k){return selSkills[k];}).length);
        if(doSoul)sum.push('  Soul: yes');
        if(doEnv)sum.push('  Keys: '+Object.keys(selKeys).filter(function(k){return selKeys[k];}).length);
      }else sum.push('Fresh start');
      sum.push(tgToken?'Telegram: yes'+(tgAuto?' (auto-approved)':''):'Telegram: skip');
      return React.createElement('div',{style:{padding:16,background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}},
        React.createElement('div',{style:{fontSize:16,fontWeight:700,marginBottom:12}},'④ Review & Create'),
        React.createElement('pre',{className:'mono',style:{fontSize:12,lineHeight:1.8,color:'var(--text)',padding:14,background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}},sum.join('\n')));}
  }
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();},style:{maxWidth:580}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}},
        React.createElement('h3',{style:{fontSize:18}},'⚡ New Profile Wizard'),
        React.createElement('button',{className:'btn-ghost',onClick:onClose,style:{fontSize:18}},'✕')),
      React.createElement('div',{className:'wizard-stepper'},steps.map(function(s,i){return React.createElement('div',{key:i,className:'wizard-dot'+(i===step?' active':'')+(i<step?' done':'')});})),
      React.createElement('div',{style:{fontSize:11,color:'var(--dim)',textAlign:'center',marginBottom:12,marginTop:-8}},steps[step]),
      rs(),
      !result?React.createElement('div',{style:{display:'flex',gap:8,justifyContent:'space-between',marginTop:12}},
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:step>0?function(){setStep(step-1);}:onClose},step>0?'← Back':'Cancel'),
        step<3?React.createElement('button',{className:'btn btn-sm btn-primary',disabled:step===0&&(!id||!port),onClick:function(){setStep(step+1);}},'Next →'):
          React.createElement('button',{className:'btn btn-sm btn-green',disabled:busy,onClick:doCreate},busy?React.createElement('span',{className:'spinner'}):null,' Create Profile')):null));
}

