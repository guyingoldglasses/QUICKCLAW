/* QuickClaw Dashboard — Profile Panel */
function PanelProfile({profileId,profiles,toast,onNav}){
  var p=profiles.find(function(x){return x.id===profileId;});
  var[tab,setTab]=useState('overview');var[envVars,setEnvVars]=useState(null);var[envRevealed,setEnvRevealed]=useState(false);
  var[config,setConfig]=useState(null);var[soul,setSoul]=useState(null);var[skills,setSkills]=useState(null);
  var[logs,setLogs]=useState('');var[models,setModels]=useState(null);var[loading,setLoading]=useState(false);
  var[addingEnv,setAddingEnv]=useState(false);var[newEnvKey,setNewEnvKey]=useState('');var[newEnvVal,setNewEnvVal]=useState('');
  var[copyModal,setCopyModal]=useState(null);var[resetModal,setResetModal]=useState(false);
  var[usage,setUsage]=useState(null);var[channels,setChannels]=useState(null);var[tgUsers,setTgUsers]=useState(null);
  var[pairing,setPairing]=useState(null);var[sessions,setSessions]=useState(null);var[memModal,setMemModal]=useState(null);
  var[cronData,setCronData]=useState(null);var[cronAddModal,setCronAddModal]=useState(false);
  var[tgEditing,setTgEditing]=useState(false);var[tgToken,setTgToken]=useState('');var[tgBusy,setTgBusy]=useState(false);var[addUserId,setAddUserId]=useState('');var[showAddUser,setShowAddUser]=useState(false);var[apiKeyProv,setApiKeyProv]=useState(null);var[apiKeyIn,setApiKeyIn]=useState('');
  var[activity,setActivity]=useState(null);var[commsChannel,setCommsChannel]=useState('telegram');
  var[discordData,setDiscordData]=useState(null);var[discordEditing,setDiscordEditing]=useState(false);var[discordForm,setDiscordForm]=useState({botToken:'',applicationId:'',guildId:''});
  var[whatsappData,setWhatsappData]=useState(null);var[whatsappEditing,setWhatsappEditing]=useState(false);var[whatsappForm,setWhatsappForm]=useState({phoneNumber:'',apiKey:'',bridgeType:'baileys'});
  var[imessageData,setImessageData]=useState(null);var[imessageEditing,setImessageEditing]=useState(false);var[imessageForm,setImessageForm]=useState({serverUrl:'',password:''});
  var[termInput,setTermInput]=useState('');
  var[oauthStep,setOauthStep]=useState(0);var[discoveredId,setDiscoveredId]=useState(null);var[customClientId,setCustomClientId]=useState('');var[authUrlState,setAuthUrlState]=useState('');var[manualMode,setManualMode]=useState(false);var[manualToken,setManualToken]=useState('');var[manualRefresh,setManualRefresh]=useState('');
  var[ftpData,setFtpData]=useState(null);var[ftpEditing,setFtpEditing]=useState(false);var[ftpForm,setFtpForm]=useState({host:'',user:'',pass:'',port:'21'});var[ftpTesting,setFtpTesting]=useState(false);var[ftpTestResult,setFtpTestResult]=useState(null);
  var[smtpData,setSmtpData]=useState(null);var[smtpEditing,setSmtpEditing]=useState(false);var[smtpForm,setSmtpForm]=useState({host:'',port:'587',user:'',pass:'',from:'',secure:true});var[smtpTesting,setSmtpTesting]=useState(false);var[smtpTestResult,setSmtpTestResult]=useState(null);
  var[authData,setAuthData]=useState(null);var[oauthFlow,setOauthFlow]=useState(null);var[oauthCallbackUrl,setOauthCallbackUrl]=useState('');var[oauthPolling,setOauthPolling]=useState(false);var[oauthMsg,setOauthMsg]=useState(null);
  var[memFilter,setMemFilter]=useState('');var[cronExpanded,setCronExpanded]=useState(null);
  if(!p)return React.createElement('div',{style:{color:'var(--dim)'}},'Not found');

  var loadTab=useCallback(async function(t){setLoading(true);try{
    if(t==='env')setEnvVars((await api('/profiles/'+profileId+'/env'+(envRevealed?'?reveal=true':''))).vars);
    else if(t==='config')setConfig(JSON.stringify((await api('/profiles/'+profileId+'/config')).config,null,2));
    else if(t==='soul')setSoul((await api('/profiles/'+profileId+'/soul')).content);
    else if(t==='skills')setSkills((await api('/profiles/'+profileId+'/skills')).skills);
    else if(t==='logs')setLogs((await api('/profiles/'+profileId+'/logs?lines=150')).logs);
    else if(t==='models'){setModels((await api('/profiles/'+profileId+'/models')).models);try{setEnvVars((await api('/profiles/'+profileId+'/env')).vars);}catch(ex){}}
    else if(t==='usage')setUsage(await api('/profiles/'+profileId+'/usage'));
    else if(t==='comms'){setChannels((await api('/profiles/'+profileId+'/channels')).channels);setTgUsers(await api('/profiles/'+profileId+'/telegram/info'));setPairing(await api('/profiles/'+profileId+'/pairing'));try{setDiscordData(await api('/profiles/'+profileId+'/channel/discord'));}catch(e){setDiscordData({enabled:false});}try{setWhatsappData(await api('/profiles/'+profileId+'/channel/whatsapp'));}catch(e){setWhatsappData({enabled:false});}try{setImessageData(await api('/profiles/'+profileId+'/channel/bluebubbles'));}catch(e){setImessageData({enabled:false});}}
    else if(t==='history')setSessions(await api('/profiles/'+profileId+'/sessions'));
    else if(t==='cron')setCronData(await api('/profiles/'+profileId+'/cron'));
    else if(t==='activity')setActivity(await api('/profiles/'+profileId+'/activity'));
    else if(t==='ftp'){var fd=await api('/profiles/'+profileId+'/ftp');setFtpData(fd);setFtpForm({host:fd.host||'',user:fd.user||'',pass:'',port:fd.port||'21'});setFtpEditing(!fd.hasCredentials);}
    else if(t==='smtp'){var sd=await api('/profiles/'+profileId+'/smtp');setSmtpData(sd);setSmtpForm({host:sd.host||'',port:sd.port||'587',user:sd.user||'',pass:'',from:sd.from||'',secure:sd.secure!==false});setSmtpEditing(!sd.hasCredentials);}
    else if(t==='auth'){var ad=await api('/profiles/'+profileId+'/auth');setAuthData(ad);setOauthMsg(null);setOauthCallbackUrl('');}
  }catch(e){toast('Load failed','error');}setLoading(false);},[profileId,envRevealed]);
  useEffect(function(){if(tab!=='overview')loadTab(tab);},[tab]);

  var doAction=async function(a){setLoading(true);try{await api('/profiles/'+profileId+'/'+a,{method:'POST'});toast(a+' → '+profileId,'success');onNav('refresh');}catch(e){toast(e.message,'error');}setLoading(false);};

  var tabs=[{id:'overview',l:'Overview'},{id:'files',l:'Files',ic:'folder'},{id:'activity',l:'Live',ic:'activity'},{id:'cron',l:'Cron',ic:'calendar'},{id:'usage',l:'Usage',ic:'dollarSign'},{id:'comms',l:'Comms',ic:'messageCircle'},{id:'history',l:'Memory',ic:'database'},{id:'env',l:'Keys',ic:'key'},{id:'auth',l:'Auth',ic:'lock'},{id:'models',l:'Models',ic:'cpu'},{id:'config',l:'Config',ic:'settings'},{id:'soul',l:'Soul',ic:'heart'},{id:'skills',l:'Skills',ic:'tool'},{id:'logs',l:'Logs',ic:'fileText'},{id:'ftp',l:'FTP',ic:'globe'},{id:'smtp',l:'Email',ic:'mail'}];

  function renderTabContent(){
    if(tab==='overview'){
      return React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10}},
        [{l:'Port',v:p.port,c:'var(--accent)'},{l:'Skills',v:p.skillCount,c:'var(--purple)'},{l:'Cost',v:fmtCost(p.totalCost),c:'var(--amber)',s:16},{l:'Tokens',v:fmtTokens(p.totalInput+p.totalOutput),c:'var(--blue)',s:14},{l:'Crons',v:p.cronCount||0,c:'var(--green)'},{l:'Uptime',v:p.uptime||'down',c:'var(--dim)',s:12}].map(function(s,i){return React.createElement(StatCard,{key:i,value:s.v,label:s.l,color:s.c,size:s.s});}));
    }
    if(tab==='files'){return React.createElement(FileBrowser,{profileId:profileId,toast:toast});}
    if(tab==='activity'){
      return React.createElement('div',null,
        React.createElement('div',{className:'section-title'},React.createElement('h3',null,'📡 Activity Feed'),React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('activity');}},'↻')),
        activity&&activity.events&&activity.events.length>0?React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden',maxHeight:500,overflowY:'auto'}},
          activity.events.map(function(ev,i){var bgMap={error:'var(--red-d)',message:'var(--accent-d)',tool:'var(--purple-d)',cron:'var(--amber-d)',status:'var(--green-d)',system:'var(--border)'};
            return React.createElement('div',{key:i,className:'feed-item'},
              React.createElement('div',{className:'feed-icon',style:{background:bgMap[ev.type]||'var(--border)'}},ev.icon),
              React.createElement('div',{style:{flex:1,minWidth:0}},React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},ev.time),React.createElement('div',{style:{fontSize:12,marginTop:2,wordBreak:'break-word'}},ev.message)));})):
        React.createElement('div',{className:'card',style:{padding:30,textAlign:'center',color:'var(--dim)'}},'No recent activity.'),
        activity&&activity.channelLogs?React.createElement('div',{style:{marginTop:16}},React.createElement('div',{style:{fontSize:13,fontWeight:600,marginBottom:8}},'📱 Channel Logs'),React.createElement('div',{className:'log-area',style:{maxHeight:200}},activity.channelLogs||'No channel activity')):null);
    }
    if(tab==='cron'){
      var hasJobs=cronData&&((cronData.output&&!cronData.output.includes('No cron'))||(cronData.jobs&&cronData.jobs.length>0)||cronData.heartbeat);
      return React.createElement('div',null,
        React.createElement('div',{className:'section-title'},React.createElement('h3',null,'⏰ Cron Jobs'),React.createElement('div',{style:{display:'flex',gap:6}},
          React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){setCronAddModal(true);}},'+ Add Job'),
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('cron');}},'↻'))),
        cronData&&cronData.heartbeat?React.createElement('div',{className:'card card-click',style:{padding:16,marginBottom:12,borderColor:'rgba(74,222,128,.15)'},onClick:function(){setCronExpanded(cronExpanded==='hb'?null:'hb');}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
            React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
              React.createElement('span',{style:{color:'var(--dim)',fontSize:11,transition:'transform .2s',transform:cronExpanded==='hb'?'rotate(90deg)':'rotate(0)'}},'▶'),
              React.createElement('span',{style:{fontSize:18}},'💓'),
              React.createElement('div',null,
                React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Heartbeat'),
                React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},'Schedule: '+(cronData.heartbeat.schedule||cronData.heartbeat.config?.every||'?')))),
            React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)'}},'Active')),
          cronExpanded==='hb'?React.createElement('div',{style:{marginTop:12,padding:12,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'},onClick:function(e){e.stopPropagation();}},
            React.createElement('div',{style:{fontSize:12,color:'var(--dim)',lineHeight:1.6}},
              'The heartbeat is an automatic periodic check-in that keeps your bot alive and responsive. It runs on a timer and ensures the bot gateway stays connected and processes queued messages.'),
            cronData.heartbeat.config?React.createElement('div',{style:{marginTop:8}},
              React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase',marginBottom:4}},'Configuration'),
              React.createElement('pre',{className:'mono',style:{fontSize:11,color:'var(--text)',padding:8,background:'var(--surface)',borderRadius:6,whiteSpace:'pre-wrap'}},JSON.stringify(cronData.heartbeat.config,null,2))):null):null):null,
        cronData&&cronData.output?React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden',marginBottom:16}},
          React.createElement('pre',{className:'mono',style:{padding:14,fontSize:11,lineHeight:1.7,color:'var(--text)',whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0}},cronData.output)):null,
        cronData&&cronData.jobs&&cronData.jobs.length>0?React.createElement('div',{style:{marginBottom:16}},
          cronData.jobs.map(function(j,i){var isExp=cronExpanded===i;return React.createElement('div',{key:i,className:'card card-click',style:{padding:14,marginBottom:6},onClick:function(){setCronExpanded(isExp?null:i);}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
                React.createElement('span',{style:{color:'var(--dim)',fontSize:11,transition:'transform .2s',transform:isExp?'rotate(90deg)':'rotate(0)'}},'▶'),
                React.createElement('div',null,React.createElement('div',{style:{fontSize:13,fontWeight:600}},j.name||j.id||'Job '+(i+1)),React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},j.schedule||j.cron||j.every||j.scheduleType||''))),
              React.createElement('span',{className:'badge',style:{color:j.enabled!==false?'var(--green)':'var(--dim)',background:j.enabled!==false?'var(--green-d)':'var(--border)'}},j.enabled!==false?'Active':'Paused'),
              j.isSystem?React.createElement('span',{className:'badge',style:{color:'var(--purple)',background:'var(--purple-d)',fontSize:9,marginLeft:4}},'System'):null),
            isExp?React.createElement('div',{style:{marginTop:12,padding:12,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'},onClick:function(e){e.stopPropagation();}},
              j.message?React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase',marginBottom:4}},j.isSystem?'Description':'Message'),React.createElement('div',{style:{fontSize:12,color:'var(--text)',lineHeight:1.5}},j.message)):null,
              j.script?React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase',marginBottom:4}},'Script'),React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--accent)',padding:'6px 10px',background:'var(--surface)',borderRadius:6}},j.script)):null,
              j.services&&j.services.length>0?React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase',marginBottom:4}},'Monitored Services'),React.createElement('div',{style:{display:'flex',gap:4,flexWrap:'wrap'}},j.services.map(function(s){return React.createElement('span',{key:s,className:'badge',style:{fontSize:10,color:'var(--green)',background:'var(--green-d)'}},s);}))):null,
              j.timezone?React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Timezone: '+j.timezone):null,
              j.session?React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:8}},'Session: '+j.session):null,
              j.lastRun?React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:8}},'Last run: '+new Date(j.lastRun).toLocaleString()):null,
              !j.isSystem?React.createElement('div',{style:{display:'flex',gap:6}},
                React.createElement('button',{className:'btn btn-xs '+(j.enabled!==false?'btn-default':'btn-green'),onClick:async function(){try{await api('/profiles/'+profileId+'/cron/'+(j.id||j.name)+'/toggle',{method:'POST',body:{enabled:j.enabled===false}});toast(j.enabled===false?'Resumed':'Paused','success');loadTab('cron');}catch(er){toast('Not supported yet','error');}}},j.enabled!==false?'⏸ Pause':'▶ Resume'),
                React.createElement('button',{className:'btn btn-xs btn-danger',onClick:async function(){if(!confirm('Delete cron job "'+(j.name||j.id)+'"?'))return;try{await api('/profiles/'+profileId+'/cron/'+(j.id||j.name),{method:'DELETE'});toast('Deleted','success');loadTab('cron');}catch(er){toast('Not supported yet','error');}}},IC('trash2',12))):null):null);})):null,
        !hasJobs?React.createElement('div',{className:'card',style:{padding:30,textAlign:'center'}},
          React.createElement('div',{style:{fontSize:32,marginBottom:8}},'⏰'),
          React.createElement('div',{style:{color:'var(--dim)',marginBottom:16}},'No cron jobs yet. Schedule automated tasks for this profile.'),
          React.createElement('div',{style:{fontSize:12,color:'var(--muted)',maxWidth:400,margin:'0 auto',lineHeight:1.6}},'Examples: Morning briefing, inbox check, weekly report, nightly backup')):null);
    }
    if(tab==='usage'&&usage){
      return React.createElement('div',null,
        React.createElement('div',{className:'section-title'},
          React.createElement('h3',null,'Usage & Cost'),
          React.createElement('div',{style:{display:'flex',gap:6,alignItems:'center'}},
            usage.lastModified?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},'Updated: '+new Date(usage.lastModified).toLocaleTimeString()):null,
            usage.sources&&usage.sources.length>0?React.createElement('span',{className:'badge',style:{fontSize:9,color:'var(--green)',background:'var(--green-d)'}},usage.sources.length+' source'+(usage.sources.length>1?'s':'')):null,
            React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){loadTab('usage');}},'↻'))),
        usage.noData?React.createElement('div',{className:'card',style:{padding:24,textAlign:'center'}},
          React.createElement('div',{style:{fontSize:32,marginBottom:8}},'📊'),
          React.createElement('div',{style:{color:'var(--dim)',marginBottom:8}},'No usage data found'),
          React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--muted)',lineHeight:1.6}},usage.hint||'Ensure the profile is on the latest OpenClaw version.')):null,
        !usage.noData?React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:20}},
          [{v:fmtCost(usage.totals.estimatedCostUsd),l:'Total Cost',c:'var(--amber)'},{v:fmtTokens(usage.totals.inputTokens),l:'Tokens In',c:'var(--accent)'},{v:fmtTokens(usage.totals.outputTokens),l:'Tokens Out',c:'var(--green)'},{v:usage.daysTracked,l:'Days',c:'var(--purple)'},{v:fmtCost(usage.avgDailyCost),l:'Avg/Day',c:'var(--blue)'},{v:fmtCost(usage.projected30d),l:'~30d Est',c:'var(--amber)'}].map(function(s,i){return React.createElement(StatCard,{key:i,value:s.v,label:s.l,color:s.c,size:16});})):null,
        !usage.noData&&Object.keys(usage.byModel).length>0?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
          React.createElement('div',{style:{fontSize:13,fontWeight:600,marginBottom:12}},'By Model'),
          Object.entries(usage.byModel).sort(function(a,b){return b[1].cost-a[1].cost;}).map(function(entry){var model=entry[0],data=entry[1];var pct=usage.totals.estimatedCostUsd>0?(data.cost/usage.totals.estimatedCostUsd*100):0;
            return React.createElement('div',{key:model,style:{marginBottom:12}},
              React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}},
                React.createElement('span',null,React.createElement('b',{style:{color:'var(--accent)'}},model),React.createElement('span',{style:{color:'var(--dim)',marginLeft:8}},data.sessions+' sess')),
                React.createElement('span',{className:'mono',style:{color:'var(--amber)'}},fmtCost(data.cost))),
              React.createElement('div',{className:'bar-wrap'},React.createElement('div',{className:'bar',style:{width:Math.max(pct,2)+'%',background:'var(--purple)'}})));})):null,
        !usage.noData&&usage.recentSessions&&usage.recentSessions.length>0?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
          React.createElement('div',{style:{fontSize:13,fontWeight:600,marginBottom:12}},'Recent Sessions'),
          React.createElement('div',{style:{maxHeight:200,overflowY:'auto'}},
            usage.recentSessions.map(function(s,i){return React.createElement('div',{key:i,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:i<usage.recentSessions.length-1?'1px solid var(--border)':'none',fontSize:12}},
              React.createElement('div',null,
                React.createElement('span',{style:{color:'var(--accent)',fontWeight:600}},s.model),
                React.createElement('span',{className:'mono',style:{color:'var(--dim)',marginLeft:8,fontSize:11}},fmtTokens(s.tokens)+' tok')),
              React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center'}},
                React.createElement('span',{className:'mono',style:{color:'var(--amber)',fontSize:11}},fmtCost(s.cost)),
                s.timestamp?React.createElement('span',{className:'mono',style:{color:'var(--dim)',fontSize:10}},s.timestamp.slice(0,10)):null));}))):null,
        !usage.noData&&usage.byDay.length>0?React.createElement('div',{className:'card',style:{padding:16}},
          React.createElement('div',{style:{fontSize:13,fontWeight:600,marginBottom:12}},'Daily Cost (last 30d)'),
          React.createElement('div',{style:{display:'flex',alignItems:'flex-end',gap:2,height:80}},
            usage.byDay.map(function(d,i){var max=Math.max.apply(null,usage.byDay.map(function(x){return x.cost;}).concat([0.001]));var h=Math.max((d.cost/max)*70,2);
              return React.createElement('div',{key:i,title:d.date+': '+fmtCost(d.cost),style:{flex:1,minWidth:3,height:h,background:'var(--accent)',borderRadius:'2px 2px 0 0',opacity:.8}});})),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginTop:4}},
            React.createElement('span',{className:'mono',style:{fontSize:9,color:'var(--dim)'}},usage.byDay[0]&&usage.byDay[0].date),
            React.createElement('span',{className:'mono',style:{fontSize:9,color:'var(--dim)'}},usage.byDay[usage.byDay.length-1]&&usage.byDay[usage.byDay.length-1].date))):null);
    }
    if(tab==='comms'){
      var channels_list=[
        {id:'telegram',l:'Telegram',ic:'smartphone',color:'#26a5e4',desc:'Real-time messaging via Telegram bots'},
        {id:'discord',l:'Discord',ic:'globe',color:'#5865f2',desc:'Chat through Discord bot integration'},
        {id:'whatsapp',l:'WhatsApp',ic:'smartphone',color:'#25d366',desc:'Connect via WhatsApp Business API'},
        {id:'imessage',l:'iMessage',ic:'messageCircle',color:'#34c759',desc:'Apple iMessage via BlueBubbles bridge'}
      ];
      var cc=commsChannel;
      var tgEnabled=tgUsers&&tgUsers.enabled;var tgHasToken=tgUsers&&tgUsers.hasToken;
      var chStatus={telegram:tgEnabled,discord:discordData&&discordData.enabled,whatsapp:whatsappData&&whatsappData.enabled,imessage:imessageData&&imessageData.enabled};
      return React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}},
          channels_list.map(function(ch){var active=chStatus[ch.id];return React.createElement('button',{key:ch.id,className:'btn btn-sm '+(cc===ch.id?'btn-primary':'btn-default'),style:cc===ch.id?{background:ch.color,borderColor:ch.color,color:'#fff'}:{},onClick:function(){setCommsChannel(ch.id);}},IC(ch.ic,13),' ',ch.l,active?React.createElement('span',{style:{marginLeft:4,fontSize:8,color:cc===ch.id?'#fff':'var(--green)'}},'●'):null);})),

        cc==='telegram'?React.createElement('div',null,
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,background:'var(--surface)',border:'1px solid rgba(38,165,228,.15)'}},
            React.createElement('div',{style:{fontSize:14,fontWeight:700,marginBottom:10}},IC('smartphone',15),' Telegram Setup Guide'),
            React.createElement('div',{style:{fontSize:12,color:'var(--dim)',lineHeight:1.8}},
              React.createElement('div',{style:{marginBottom:8,fontWeight:600,color:'var(--text)'}},'How to connect Telegram:'),
              [{n:'1',t:'Open Telegram and search for @BotFather.'},{n:'2',t:'Send /newbot and follow the prompts to name your bot.'},{n:'3',t:'BotFather will give you a Bot Token (looks like 123456789:ABCdef...). Copy it.'},{n:'4',t:'Paste the token below in Bot Configuration and click Save & Restart.'},{n:'5',t:'To find your Telegram User ID: message @userinfobot on Telegram — it replies with your numeric ID.'},{n:'6',t:'Add your user ID to Approved Users below so the bot will respond to you.'},{n:'7',t:'Open a chat with your bot in Telegram and send /start, then send any message. If you see a pairing code, enter it in the Pairing section below and click Approve.'}].map(function(s){
                return React.createElement('div',{key:s.n,style:{display:'flex',gap:10,alignItems:'flex-start',marginBottom:6}},
                  React.createElement('span',{style:{width:20,height:20,borderRadius:'50%',background:'rgba(38,165,228,.15)',color:'#26a5e4',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}},s.n),
                  React.createElement('span',null,s.t));}))),
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:tgEnabled?'rgba(52,211,153,.15)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},IC('settings',15),' Bot Configuration'),
                tgUsers?React.createElement('span',{className:'badge',style:{color:tgEnabled?'var(--green)':'var(--red)',background:tgEnabled?'var(--green-d)':'var(--red-d)'}},tgEnabled?'● Enabled':'○ Disabled'):null),
              tgHasToken&&!tgEditing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setTgEditing(true);setTgToken('');}},'Change Token'):null),
            tgUsers&&tgUsers.botToken&&!tgEditing?React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',marginBottom:8}},
              React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Bot Token'),
              React.createElement('div',{className:'mono',style:{fontSize:13,color:'var(--accent)'}},tgUsers.botToken)):null,
            !tgHasToken&&!tgEditing?React.createElement('div',{style:{padding:16,textAlign:'center',background:'var(--bg)',borderRadius:8,border:'1px dashed var(--border)',marginBottom:8}},
              React.createElement('div',{style:{fontSize:13,color:'var(--dim)',marginBottom:10}},'No bot token configured'),
              React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){setTgEditing(true);setTgToken('');}},'+ Add Bot Token')):null,
            tgEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',marginTop:8,marginBottom:8}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:8}},'Bot Token from @BotFather'),
              React.createElement('input',{className:'input mono',placeholder:'123456789:ABCdef...',value:tgToken,onChange:function(e){setTgToken(e.target.value);},style:{marginBottom:10,fontSize:13}}),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('button',{className:'btn btn-sm btn-primary',disabled:tgBusy||!tgToken.includes(':'),onClick:async function(){setTgBusy(true);try{
                  await api('/profiles/'+profileId+'/telegram/setup',{method:'PUT',body:{botToken:tgToken,enabled:true,autoApproveUserId:'6741444182'}});
                  toast('Saved! Restarting gateway...','success');setTgEditing(false);
                  await api('/profiles/'+profileId+'/restart',{method:'POST'});
                  setTimeout(function(){loadTab('comms');},2000);
                }catch(e){toast(e.message,'error');}setTgBusy(false);}},tgBusy?'Saving…':'Save & Restart'),
                React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setTgEditing(false);}},'Cancel'))):null),
          tgUsers?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
              React.createElement('div',{style:{fontSize:14,fontWeight:600}},IC('users',14),' Approved Users ('+(tgUsers.users?tgUsers.users.length:0)+')'),
              React.createElement('button',{className:'btn btn-xs '+(showAddUser?'btn-default':'btn-primary'),onClick:function(){setShowAddUser(!showAddUser);}},showAddUser?'✕':'+ Add')),
            React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:10}},'Your Telegram user ID is needed here. Message @userinfobot on Telegram to get it.'),
            showAddUser?React.createElement('div',{style:{display:'flex',gap:8,marginBottom:12}},
              React.createElement('input',{className:'input mono',placeholder:'Telegram user ID (numeric)',value:addUserId,onChange:function(e){setAddUserId(e.target.value);},style:{flex:1}}),
              React.createElement('button',{className:'btn btn-sm btn-primary',disabled:!addUserId,onClick:async function(){try{await api('/profiles/'+profileId+'/telegram/users/add',{method:'POST',body:{userId:addUserId}});toast('Added','success');setAddUserId('');setShowAddUser(false);loadTab('comms');}catch(e){toast(e.message,'error');}}},'Add')):null,
            tgUsers.users&&tgUsers.users.length>0?React.createElement('div',{style:{border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}},
              tgUsers.users.map(function(u,i){var uid=String(u);return React.createElement('div',{key:i,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderBottom:i<tgUsers.users.length-1?'1px solid var(--border)':'none'}},
                React.createElement('span',{className:'mono',style:{fontSize:13,color:'var(--accent)'}},uid),
                React.createElement('button',{className:'btn btn-xs btn-default',style:{color:'var(--red)'},onClick:async function(){if(!confirm('Remove?'))return;try{await api('/profiles/'+profileId+'/telegram/users/'+i,{method:'DELETE'});toast('Removed','success');loadTab('comms');}catch(e){toast(e.message,'error');}}},'✕'));})):
            React.createElement('div',{style:{padding:16,textAlign:'center',color:'var(--dim)',fontSize:12}},'No approved users yet.')):null,
          pairing?React.createElement('div',{className:'card',style:{padding:16}},
            React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:8}},IC('link',14),' Pairing'),
            React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:8}},'When you first message your bot, it sends a pairing code. Enter it below and click Approve to authorize your Telegram account.'),
            React.createElement('div',{className:'mono',style:{fontSize:12,color:'var(--dim)',whiteSpace:'pre-wrap',padding:'10px 14px',background:'var(--bg)',borderRadius:8,marginBottom:12}},pairing.output||'No pending requests'),
            React.createElement('div',{style:{display:'flex',gap:8}},
              React.createElement('input',{id:'pairCode',className:'input mono',placeholder:'Pairing code...',style:{flex:1}}),
              React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){var code=document.getElementById('pairCode').value;if(!code)return;var r=await api('/profiles/'+profileId+'/pairing/approve',{method:'POST',body:{code:code}});toast(r.output||'Approved','success');loadTab('comms');}},'Approve'))):null
        ):null,

        cc==='discord'?React.createElement('div',null,
          React.createElement('details',{style:{marginBottom:16}},
            React.createElement('summary',{className:'card',style:{padding:14,cursor:'pointer',listStyle:'none',display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}},IC('info',14),' Discord Setup Guide'),
            React.createElement('div',{style:{padding:16,border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 10px 10px',fontSize:12,color:'var(--dim)',lineHeight:1.8}},
              [{n:'1',t:'Go to discord.com/developers/applications and click "New Application".'},{n:'2',t:'Give it a name, go to the Bot tab, click "Add Bot", then copy the Bot Token.'},{n:'3',t:'Under Privileged Gateway Intents, enable "Message Content Intent" and "Server Members Intent".'},{n:'4',t:'Go to OAuth2 → URL Generator. Select "bot" scope and "Send Messages", "Read Message History" permissions.'},{n:'5',t:'Copy the generated invite URL and open it to add the bot to your Discord server.'},{n:'6',t:'Enter the Bot Token and Application ID below, then Save & Restart.'}].map(function(s){
                return React.createElement('div',{key:s.n,style:{display:'flex',gap:10,alignItems:'flex-start',marginBottom:6}},
                  React.createElement('span',{style:{width:20,height:20,borderRadius:'50%',background:'rgba(88,101,242,.15)',color:'#5865f2',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}},s.n),
                  React.createElement('span',null,s.t));}))),
          discordData?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:discordData.enabled?'rgba(88,101,242,.2)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},IC('settings',15),' Discord Configuration'),
                React.createElement('span',{className:'badge',style:{color:discordData.enabled?'var(--green)':'var(--red)',background:discordData.enabled?'var(--green-d)':'var(--red-d)'}},discordData.enabled?'● Enabled':'○ Disabled')),
              !discordEditing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setDiscordEditing(true);setDiscordForm({botToken:'',applicationId:discordData.applicationId||'',guildId:discordData.guildId||''});}},discordData.hasToken?'Edit':'+ Setup'):null),
            discordData.hasToken&&!discordEditing?React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',marginBottom:8}},
              React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Bot Token'),
              React.createElement('div',{className:'mono',style:{fontSize:13,color:'var(--accent)'}},discordData.botToken),
              discordData.applicationId?React.createElement('div',{style:{marginTop:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:2}},'Application ID'),React.createElement('div',{className:'mono',style:{fontSize:12}},discordData.applicationId)):null):null,
            discordEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:10}},'Discord Bot Credentials'),
              React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Bot Token *'),React.createElement('input',{className:'input mono',type:'password',placeholder:'Paste Discord bot token...',value:discordForm.botToken,onChange:function(e){setDiscordForm(Object.assign({},discordForm,{botToken:e.target.value}));},style:{fontSize:12}})),
              React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Application ID'),React.createElement('input',{className:'input mono',placeholder:'Optional — from Developer Portal',value:discordForm.applicationId,onChange:function(e){setDiscordForm(Object.assign({},discordForm,{applicationId:e.target.value}));},style:{fontSize:12}})),
              React.createElement('div',{style:{marginBottom:12}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Guild / Server ID'),React.createElement('input',{className:'input mono',placeholder:'Optional — right-click server → Copy ID',value:discordForm.guildId,onChange:function(e){setDiscordForm(Object.assign({},discordForm,{guildId:e.target.value}));},style:{fontSize:12}})),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('button',{className:'btn btn-sm btn-primary',disabled:loading||(!discordForm.botToken&&!discordData.hasToken),onClick:async function(){setLoading(true);try{
                  await api('/profiles/'+profileId+'/channel/discord/setup',{method:'PUT',body:{enabled:true,botToken:discordForm.botToken||undefined,applicationId:discordForm.applicationId,guildId:discordForm.guildId}});
                  toast('Discord saved! Restarting...','success');setDiscordEditing(false);
                  await api('/profiles/'+profileId+'/restart',{method:'POST'});setTimeout(function(){loadTab('comms');},2000);
                }catch(e){toast(e.message,'error');}setLoading(false);}},loading?'Saving...':'Save & Restart'),
                React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setDiscordEditing(false);}},'Cancel'))):null,
            discordData.hasToken?React.createElement('div',{style:{marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600}},'Discord Enabled'),
              React.createElement('button',{className:'toggle '+(discordData.enabled?'on':'off'),onClick:async function(){var ns=!discordData.enabled;await api('/profiles/'+profileId+'/channel/discord/setup',{method:'PUT',body:{enabled:ns}});toast(ns?'Discord enabled':'Discord disabled','success');await api('/profiles/'+profileId+'/restart',{method:'POST'});loadTab('comms');}},React.createElement('div',{className:'toggle-dot'}))):null
          ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'}))
        ):null,

        cc==='whatsapp'?React.createElement('div',null,
          React.createElement('details',{style:{marginBottom:16}},
            React.createElement('summary',{className:'card',style:{padding:14,cursor:'pointer',listStyle:'none',display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}},IC('info',14),' WhatsApp Setup Guide'),
            React.createElement('div',{style:{padding:16,border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 10px 10px',fontSize:12,color:'var(--dim)',lineHeight:1.8}},
              [{n:'1',t:'WhatsApp uses the Baileys bridge (open-source WA Web connector) or the official Business API.'},{n:'2',t:'For Baileys: run "openclaw onboard" via SSH and select WhatsApp when prompted. A QR code will appear.'},{n:'3',t:'Scan the QR with WhatsApp on your phone (Settings → Linked Devices → Link a Device).'},{n:'4',t:'For Business API: get credentials from Meta Business Suite and enter them below.'},{n:'5',t:'Enter your phone number and any required API key below, then Save & Restart.'},{n:'6',t:'Note: Baileys sessions can disconnect. If that happens, re-run the QR pairing via SSH.'}].map(function(s){
                return React.createElement('div',{key:s.n,style:{display:'flex',gap:10,alignItems:'flex-start',marginBottom:6}},
                  React.createElement('span',{style:{width:20,height:20,borderRadius:'50%',background:'rgba(37,211,102,.15)',color:'#25d366',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}},s.n),
                  React.createElement('span',null,s.t));}))),
          whatsappData?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:whatsappData.enabled?'rgba(37,211,102,.2)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},IC('settings',15),' WhatsApp Configuration'),
                React.createElement('span',{className:'badge',style:{color:whatsappData.enabled?'var(--green)':'var(--red)',background:whatsappData.enabled?'var(--green-d)':'var(--red-d)'}},whatsappData.enabled?'● Enabled':'○ Disabled')),
              !whatsappEditing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setWhatsappEditing(true);setWhatsappForm({phoneNumber:whatsappData.phoneNumber||'',apiKey:'',bridgeType:whatsappData.bridgeType||'baileys'});}},whatsappData.hasApiKey||whatsappData.sessionExists?'Edit':'+ Setup'):null),
            whatsappData.sessionExists?React.createElement('div',{style:{padding:10,background:'var(--green-d)',borderRadius:8,marginBottom:8,fontSize:12,color:'var(--green)'}},IC('check',12),' WhatsApp session found on server'):null,
            whatsappEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:10}},'WhatsApp Credentials'),
              React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Bridge Type'),
                React.createElement('div',{style:{display:'flex',gap:8}},
                  ['baileys','business-api'].map(function(bt){return React.createElement('button',{key:bt,className:'btn btn-xs '+(whatsappForm.bridgeType===bt?'btn-primary':'btn-default'),onClick:function(){setWhatsappForm(Object.assign({},whatsappForm,{bridgeType:bt}));}},bt);}))),
              React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Phone Number'),React.createElement('input',{className:'input mono',placeholder:'+1234567890',value:whatsappForm.phoneNumber,onChange:function(e){setWhatsappForm(Object.assign({},whatsappForm,{phoneNumber:e.target.value}));},style:{fontSize:12}})),
              whatsappForm.bridgeType==='business-api'?React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'API Key / Access Token'),React.createElement('input',{className:'input mono',type:'password',placeholder:'From Meta Business Suite...',value:whatsappForm.apiKey,onChange:function(e){setWhatsappForm(Object.assign({},whatsappForm,{apiKey:e.target.value}));},style:{fontSize:12}})):null,
              React.createElement('div',{style:{display:'flex',gap:8,marginTop:12}},
                React.createElement('button',{className:'btn btn-sm btn-primary',disabled:loading,onClick:async function(){setLoading(true);try{
                  await api('/profiles/'+profileId+'/channel/whatsapp/setup',{method:'PUT',body:{enabled:true,phoneNumber:whatsappForm.phoneNumber,apiKey:whatsappForm.apiKey||undefined,bridgeType:whatsappForm.bridgeType}});
                  toast('WhatsApp saved! Restarting...','success');setWhatsappEditing(false);
                  await api('/profiles/'+profileId+'/restart',{method:'POST'});setTimeout(function(){loadTab('comms');},2000);
                }catch(e){toast(e.message,'error');}setLoading(false);}},loading?'Saving...':'Save & Restart'),
                React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setWhatsappEditing(false);}},'Cancel'))):null,
            (whatsappData.hasApiKey||whatsappData.sessionExists)?React.createElement('div',{style:{marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600}},'WhatsApp Enabled'),
              React.createElement('button',{className:'toggle '+(whatsappData.enabled?'on':'off'),onClick:async function(){var ns=!whatsappData.enabled;await api('/profiles/'+profileId+'/channel/whatsapp/setup',{method:'PUT',body:{enabled:ns}});toast(ns?'WhatsApp enabled':'WhatsApp disabled','success');await api('/profiles/'+profileId+'/restart',{method:'POST'});loadTab('comms');}},React.createElement('div',{className:'toggle-dot'}))):null
          ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'}))
        ):null,

        cc==='imessage'?React.createElement('div',null,
          React.createElement('details',{style:{marginBottom:16}},
            React.createElement('summary',{className:'card',style:{padding:14,cursor:'pointer',listStyle:'none',display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}},IC('info',14),' iMessage Setup Guide'),
            React.createElement('div',{style:{padding:16,border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 10px 10px',fontSize:12,color:'var(--dim)',lineHeight:1.8}},
              [{n:'1',t:'iMessage requires BlueBubbles — a self-hosted bridge running on a Mac with iMessage signed in.'},{n:'2',t:'Install BlueBubbles on a Mac (can be a Mac Mini or old MacBook): bluebubbles.app'},{n:'3',t:'In BlueBubbles, enable the API server and note the Server URL and Password.'},{n:'4',t:'Enter the Server URL and Password below, then Save & Restart.'},{n:'5',t:'The Mac running BlueBubbles must stay online. If it sleeps, the bridge stops.'},{n:'6',t:'Tip: Set the Mac to never sleep (System Settings → Energy) and enable "Wake for network access".'}].map(function(s){
                return React.createElement('div',{key:s.n,style:{display:'flex',gap:10,alignItems:'flex-start',marginBottom:6}},
                  React.createElement('span',{style:{width:20,height:20,borderRadius:'50%',background:'rgba(52,199,89,.15)',color:'#34c759',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}},s.n),
                  React.createElement('span',null,s.t));}))),
          imessageData?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:imessageData.enabled?'rgba(52,199,89,.2)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},IC('settings',15),' iMessage / BlueBubbles Configuration'),
                React.createElement('span',{className:'badge',style:{color:imessageData.enabled?'var(--green)':'var(--red)',background:imessageData.enabled?'var(--green-d)':'var(--red-d)'}},imessageData.enabled?'● Enabled':'○ Disabled')),
              !imessageEditing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setImessageEditing(true);setImessageForm({serverUrl:imessageData.serverUrl||'',password:''});}},imessageData.hasPassword?'Edit':'+ Setup'):null),
            imessageData.serverUrl&&!imessageEditing?React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',marginBottom:8}},
              React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Server URL'),
              React.createElement('div',{className:'mono',style:{fontSize:13,color:'var(--accent)'}},imessageData.serverUrl),
              React.createElement('div',{style:{marginTop:6}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:2}},'Password'),React.createElement('div',{className:'mono',style:{fontSize:12}},imessageData.password||'••••••'))):null,
            imessageEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:10}},'BlueBubbles Credentials'),
              React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Server URL *'),React.createElement('input',{className:'input mono',placeholder:'https://your-mac-ip:1234',value:imessageForm.serverUrl,onChange:function(e){setImessageForm(Object.assign({},imessageForm,{serverUrl:e.target.value}));},style:{fontSize:12}})),
              React.createElement('div',{style:{marginBottom:12}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Password *'),React.createElement('input',{className:'input mono',type:'password',placeholder:'BlueBubbles API password',value:imessageForm.password,onChange:function(e){setImessageForm(Object.assign({},imessageForm,{password:e.target.value}));},style:{fontSize:12}})),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('button',{className:'btn btn-sm btn-primary',disabled:loading||(!imessageForm.serverUrl&&!imessageData.serverUrl),onClick:async function(){setLoading(true);try{
                  await api('/profiles/'+profileId+'/channel/bluebubbles/setup',{method:'PUT',body:{enabled:true,serverUrl:imessageForm.serverUrl,password:imessageForm.password||undefined}});
                  toast('iMessage saved! Restarting...','success');setImessageEditing(false);
                  await api('/profiles/'+profileId+'/restart',{method:'POST'});setTimeout(function(){loadTab('comms');},2000);
                }catch(e){toast(e.message,'error');}setLoading(false);}},loading?'Saving...':'Save & Restart'),
                React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setImessageEditing(false);}},'Cancel'))):null,
            imessageData.hasPassword?React.createElement('div',{style:{marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',{style:{fontSize:12,fontWeight:600}},'iMessage Enabled'),
              React.createElement('button',{className:'toggle '+(imessageData.enabled?'on':'off'),onClick:async function(){var ns=!imessageData.enabled;await api('/profiles/'+profileId+'/channel/bluebubbles/setup',{method:'PUT',body:{enabled:ns}});toast(ns?'iMessage enabled':'iMessage disabled','success');await api('/profiles/'+profileId+'/restart',{method:'POST'});loadTab('comms');}},React.createElement('div',{className:'toggle-dot'}))):null
          ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'}))
        ):null);
    }
    if(tab==='history'&&sessions){
      return React.createElement('div',null,
        sessions.specialFiles&&sessions.specialFiles.length>0?React.createElement('div',{style:{marginBottom:20}},
          React.createElement('div',{className:'section-title'},React.createElement('h3',null,'📌 Special Files')),
          React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8}},
            sessions.specialFiles.map(function(f){return React.createElement('div',{key:f.name,className:'card card-click',style:{padding:12},onClick:function(){setMemModal(f);}},
              React.createElement('div',{style:{fontWeight:600,fontSize:13,color:'var(--accent)'}},f.name),
              React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)',marginTop:4,maxHeight:40,overflow:'hidden'}},f.preview&&f.preview.slice(0,100)));}))):null,
        sessions.memoryFiles&&sessions.memoryFiles.length>0?React.createElement('div',null,
          React.createElement('div',{className:'section-title'},React.createElement('h3',null,'💬 Memory Log Files'),React.createElement('span',{className:'badge',style:{color:'var(--accent)',background:'var(--accent-d)'}},sessions.memoryFiles.length+' files')),
          React.createElement('div',{className:'search-wrap',style:{marginBottom:8}},
            React.createElement('input',{className:'input',placeholder:'Search memory files…',value:memFilter,onChange:function(e){setMemFilter(e.target.value);},style:{fontSize:12}}),
            memFilter?React.createElement('button',{className:'clear-x',onClick:function(){setMemFilter('');}},'✕'):null),
          React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden',maxHeight:500,overflowY:'auto'}},
            sessions.memoryFiles.filter(function(f){if(!memFilter)return true;var q=memFilter.toLowerCase();return(f.name||'').toLowerCase().includes(q)||(f.preview||'').toLowerCase().includes(q);}).map(function(f){return React.createElement('div',{key:f.name,className:'mem-file',onClick:function(){setMemModal(f);}},
              React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
                React.createElement('span',{style:{fontWeight:600,fontSize:13}},f.name),
                React.createElement('div',{style:{display:'flex',alignItems:'center',gap:6}},
                  React.createElement('span',{className:'badge',style:{fontSize:9,color:f.type==='json'?'var(--amber)':'var(--accent)',background:f.type==='json'?'var(--amber-d)':'var(--accent-d)'}},f.type),
                  React.createElement('span',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},(f.size/1024).toFixed(1)+'KB'),
                  React.createElement('button',{className:'btn btn-ghost',style:{padding:'1px 4px',fontSize:10},title:'Backup this file',onClick:function(ev){ev.stopPropagation();api('/profiles/'+profileId+'/memory/'+f.name+'/backup',{method:'POST'}).then(function(){toast('Backed up '+f.name,'success');}).catch(function(e){toast(e.message,'error');});}},IC('downloadCloud',11)),
                  React.createElement('button',{className:'btn btn-ghost',style:{padding:'1px 4px',fontSize:10},title:'Restore from backup',onClick:function(ev){ev.stopPropagation();if(!confirm('Restore '+f.name+' from backup?'))return;api('/profiles/'+profileId+'/memory/'+f.name+'/restore',{method:'POST'}).then(function(r){toast(r.message||'Restored','success');loadTab('history');}).catch(function(e){toast(e.message,'error');});}},IC('clock',11)))),
              React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:4,maxHeight:36,overflow:'hidden'}},f.preview));}))):
        React.createElement('div',{className:'card',style:{padding:20,textAlign:'center',color:'var(--dim)'}},'No memory files found.'));
    }
    if(tab==='env'&&envVars){
      return React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:6}},
          React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
            React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setEnvRevealed(!envRevealed);setTimeout(function(){loadTab('env');},50);}},envRevealed?'🔒 Mask':'👁 Reveal'),
            React.createElement('a',{href:dlUrl('/profiles/'+profileId+'/env/download'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},IC('downloadCloud',12),' ⬇ .env'),
            React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){var inp=document.createElement('input');inp.type='file';inp.accept='.env,.txt';inp.onchange=async function(e){var file=e.target.files[0];if(!file)return;var txt=await file.text();if(!confirm('Upload and merge '+file.name+'? Existing keys will be kept, new/updated keys will be added.'))return;try{var r=await api('/profiles/'+profileId+'/env/upload',{method:'POST',body:{content:txt,merge:true}});toast('Uploaded! '+r.keysAdded+' keys merged','success');loadTab('env');}catch(er){toast(er.message,'error');}};inp.click();}},IC('upload',12),' ⬆ Upload .env'),
            React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){setAddingEnv(!addingEnv);}},addingEnv?'✕':'+ Add')),
          React.createElement('button',{className:'btn btn-sm btn-danger',onClick:async function(){if(!confirm('⚠️ EMERGENCY PURGE: This will remove ALL keys, secrets, tokens, and passwords from this profile .env file. A backup will be saved. Continue?'))return;if(!confirm('Are you absolutely sure? Type OK in next prompt to confirm.'))return;try{var r=await api('/profiles/'+profileId+'/env/purge',{method:'POST'});toast('Purged '+r.purged.length+' keys. Backup saved.','success');loadTab('env');}catch(er){toast(er.message,'error');}},style:{gap:4}},IC('alertTriangle',12),' Emergency Purge')),
        addingEnv?React.createElement('div',{className:'card',style:{padding:14,marginBottom:12}},
          React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 2fr',gap:8,marginBottom:8}},
            React.createElement('input',{className:'input',placeholder:'KEY',value:newEnvKey,onChange:function(e){setNewEnvKey(e.target.value.toUpperCase());}}),
            React.createElement('input',{className:'input',placeholder:'value',value:newEnvVal,onChange:function(e){setNewEnvVal(e.target.value);},type:envRevealed?'text':'password'})),
          React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){if(!newEnvKey)return;await api('/profiles/'+profileId+'/env/set',{method:'POST',body:{key:newEnvKey,value:newEnvVal}});toast('Saved','success');setNewEnvKey('');setNewEnvVal('');setAddingEnv(false);loadTab('env');}},'Save')):null,
        React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden'}},
          Object.entries(envVars).length===0?React.createElement('div',{style:{padding:20,textAlign:'center',color:'var(--dim)'}},'No vars'):
          Object.entries(envVars).map(function(entry){var k=entry[0],v=entry[1];var isDisabled=!!envVars[k+'_DISABLED'];var isDisabledKey=k.endsWith('_DISABLED');if(isDisabledKey)return null;return React.createElement('div',{key:k,className:'env-row',style:{opacity:isDisabled?.5:1}},
            React.createElement('div',{style:{flex:1,minWidth:0,overflow:'hidden'}},React.createElement('div',{className:'mono trunc',style:{fontSize:12,fontWeight:600,color:isDisabled?'var(--dim)':'var(--accent)'}},k),React.createElement('div',{className:'mono trunc',style:{fontSize:11,color:'var(--dim)',marginTop:2}},v)),
            React.createElement('div',{style:{display:'flex',gap:4,alignItems:'center',flexShrink:0}},
              /key|secret|token|api/i.test(k)?React.createElement('button',{className:'toggle '+(isDisabled?'off':'on'),style:{transform:'scale(.7)'},onClick:async function(){await api('/profiles/'+profileId+'/env/'+k+'/toggle',{method:'POST',body:{enabled:isDisabled}});toast(isDisabled?k+' enabled':k+' disabled','success');loadTab('env');}},React.createElement('div',{className:'toggle-dot'})):null,
              React.createElement('button',{className:'btn btn-ghost',style:{color:'var(--red)'},onClick:async function(){if(!confirm('Delete '+k+'?'))return;await api('/profiles/'+profileId+'/env/'+k,{method:'DELETE'});loadTab('env');}},'✕')));})));
    }
    if(tab==='models'&&models){
      var provs=[
        {id:'anthropic',n:'Anthropic',i:'🧠',ek:'ANTHROPIC_API_KEY',ms:['anthropic/claude-opus-4-6','anthropic/claude-sonnet-4-6','anthropic/claude-sonnet-4-5','anthropic/claude-haiku-3','anthropic/claude-opus-4-5'],lb:['Opus 4.6','Sonnet 4.6','Sonnet 4.5','Haiku 3','Opus 4.5']},
        {id:'openai',n:'OpenAI',i:'💚',ek:'OPENAI_API_KEY',ms:['openai/gpt-5-mini','openai/gpt-4o','openai/gpt-4o-mini','openai/o3-mini'],lb:['GPT-5 Mini','GPT-4o','4o Mini','o3 Mini']},
        {id:'google',n:'Google',i:'🔵',ek:'GOOGLE_API_KEY',ms:['google/gemini-2.5-pro','google/gemini-2.5-flash'],lb:['2.5 Pro','2.5 Flash']},
        {id:'xai',n:'xAI',i:'⚡',ek:'XAI_API_KEY',ms:['xai/grok-3','xai/grok-3-mini'],lb:['Grok 3','Grok 3 Mini']},
        {id:'deepseek',n:'DeepSeek',i:'🌊',ek:'DEEPSEEK_API_KEY',ms:['deepseek/deepseek-chat','deepseek/deepseek-reasoner'],lb:['Chat','Reasoner']}];
      var curModel=models.agentModel||null;
      return React.createElement('div',null,
        React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:'rgba(34,211,238,.2)'}},
          React.createElement('div',{style:{fontSize:11,color:'var(--dim)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}},'Active Agent Model'),
          React.createElement('div',{style:{fontSize:20,fontWeight:700,color:'var(--accent)'}},curModel||'Not set'),
          models.agentModelPath?React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)',marginTop:4}},'Config: '+models.agentModelPath):null),
        React.createElement('div',{style:{padding:'10px 14px',marginBottom:16,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',fontSize:12,color:'var(--dim)'}},'① Add API key → ② Click model to activate → ③ Restart gateway to apply'),
        provs.map(function(pv){
          var hasKey=envVars&&Object.keys(envVars).some(function(k){return k===pv.ek;});
          var isOpen=apiKeyProv===pv.id;
          return React.createElement('div',{key:pv.id,className:'card',style:{padding:16,marginBottom:10,borderColor:hasKey?'rgba(52,211,153,.12)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:hasKey?10:0}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},React.createElement('span',{style:{fontSize:20}},pv.i),React.createElement('b',{style:{fontSize:14}},pv.n)),
              React.createElement('div',{style:{display:'flex',gap:6,alignItems:'center'}},
                hasKey?React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)',fontSize:10}},'✓ Key'):null,
                hasKey?React.createElement('button',{className:'toggle '+(!envVars[pv.ek+'_DISABLED']?'on':'off'),style:{transform:'scale(.65)'},title:'Enable/disable this provider for this profile',onClick:async function(){var isDis=!!envVars[pv.ek+'_DISABLED'];await api('/profiles/'+profileId+'/env/'+pv.ek+'/toggle',{method:'POST',body:{enabled:isDis}});toast(isDis?pv.n+' enabled':pv.n+' disabled','success');loadTab('models');}},React.createElement('div',{className:'toggle-dot'})):null,
                React.createElement('button',{className:'btn btn-xs '+(isOpen?'btn-default':'btn-primary'),onClick:function(){setApiKeyProv(isOpen?null:pv.id);setApiKeyIn('');}},isOpen?'✕':hasKey?'🔑 Change':'+ Key'))),
            isOpen?React.createElement('div',{style:{padding:12,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',marginTop:8,marginBottom:8}},
              React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--accent)',marginBottom:6}},pv.ek),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('input',{className:'input mono',type:'password',placeholder:'Paste API key…',value:apiKeyIn,onChange:function(e){setApiKeyIn(e.target.value);},style:{flex:1,fontSize:12}}),
                React.createElement('button',{className:'btn btn-sm btn-primary',disabled:!apiKeyIn,onClick:async function(){await api('/profiles/'+profileId+'/env/set',{method:'POST',body:{key:pv.ek,value:apiKeyIn}});toast(pv.n+' key saved!','success');setApiKeyProv(null);setApiKeyIn('');loadTab('models');}},'Save'))):null,
            hasKey?React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:isOpen?0:0}},
              pv.ms.map(function(m,mi){var isActive=curModel===m;return React.createElement('button',{key:m,className:'btn btn-sm '+(isActive?'btn-primary':'btn-default'),style:{fontSize:11},onClick:async function(){
                await api('/profiles/'+profileId+'/models',{method:'PUT',body:{model:m}});
                toast('Model → '+pv.lb[mi]+' (restart to apply)','success');loadTab('models');}},pv.lb[mi]);})):null);}),
        React.createElement('div',{className:'fixed-restart'},
          React.createElement('button',{className:'btn btn-green',style:{padding:'12px 28px',fontSize:14,boxShadow:'0 4px 24px rgba(0,0,0,.5)',borderRadius:12},onClick:async function(){await api('/profiles/'+profileId+'/restart',{method:'POST'});toast('Restarting gateway…','success');}},'↻ Restart Gateway')),
        models.availableModels&&models.availableModels.length>0?React.createElement('details',{style:{marginTop:16}},
          React.createElement('summary',{style:{fontSize:12,color:'var(--dim)',cursor:'pointer'}},'📋 Configured model slots ('+models.availableModels.length+')'),
          React.createElement('div',{style:{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}},
            models.availableModels.map(function(m){return React.createElement('span',{key:m,className:'badge',style:{color:m===curModel?'var(--accent)':'var(--dim)',background:m===curModel?'var(--accent-d)':'var(--border)',fontSize:11,padding:'4px 8px'}},m);}))):null,
        Object.keys(models.rawConfig||{}).length>0?React.createElement('details',{style:{marginTop:8}},
          React.createElement('summary',{style:{fontSize:12,color:'var(--dim)',cursor:'pointer'}},'⚙ Raw config'),
          React.createElement('div',{style:{marginTop:8}},Object.entries(models.rawConfig).map(function(e){return React.createElement('div',{key:e[0],className:'mono',style:{fontSize:11,padding:'4px 0',color:'var(--dim)'}},e[0]+': '+JSON.stringify(e[1]));}))):null);
    }
    if(tab==='config'&&config!==null){
      return React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'flex-end',marginBottom:8}},
          React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){try{await api('/profiles/'+profileId+'/config',{method:'PUT',body:{config:JSON.parse(config)}});toast('Saved','success');}catch(e){toast(e.message,'error');}}},'💾 Save')),
        React.createElement('textarea',{value:config,onChange:function(e){setConfig(e.target.value);},className:'mono',style:{width:'100%',minHeight:400,padding:16,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}));
    }
    if(tab==='soul'&&soul!==null){
      return React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,marginBottom:8,flexWrap:'wrap'}},
          React.createElement('div',{style:{display:'flex',gap:6,alignItems:'center'}},
            React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Soul Configuration'),
            React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)',fontSize:10}},'soul.md')),
          React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
            React.createElement('button',{className:'btn btn-sm btn-default',title:'Create timestamped backup',onClick:async function(){try{await api('/profiles/'+profileId+'/soul/backup',{method:'POST'});toast('Soul backup created','success');}catch(e){toast(e.message,'error');}}},'📸 Backup'),
            React.createElement('button',{className:'btn btn-sm btn-default',title:'Restore from most recent backup',onClick:async function(){if(!confirm('Restore soul from last backup? Current soul will be backed up first.'))return;try{var r=await api('/profiles/'+profileId+'/soul/restore',{method:'POST'});toast(r.message||'Restored','success');loadTab('soul');}catch(e){toast(e.message,'error');}}},'⏪ Restore'),
            React.createElement('button',{className:'btn btn-sm btn-default',title:'Upload a soul.md file',onClick:function(){var inp=document.createElement('input');inp.type='file';inp.accept='.md,.txt';inp.onchange=async function(ev){var f=ev.target.files[0];if(!f)return;var txt=await f.text();setSoul(txt);toast('File loaded — click Save to apply','success');};inp.click();}},IC('upload',12),' Upload'),
            React.createElement('a',{href:dlUrl('/profiles/'+profileId+'/soul/download'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},IC('downloadCloud',12),' ⬇'),
            React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){await api('/profiles/'+profileId+'/soul',{method:'PUT',body:{content:soul}});toast('Saved','success');}},'💾 Save'))),
        React.createElement('textarea',{value:soul,onChange:function(e){setSoul(e.target.value);},className:'mono',style:{width:'100%',minHeight:400,padding:16,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}));
    }
    if(tab==='skills'&&skills!==null){
      return React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:6}},
        skills.length===0?React.createElement('div',{className:'card',style:{padding:20,textAlign:'center',color:'var(--dim)'}},'No skills'):
        skills.map(function(s){return React.createElement('div',{key:s.name,className:'card',style:{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,opacity:s.enabled?1:.5}},
          React.createElement('div',{style:{flex:1,minWidth:0}},
            React.createElement('b',{style:{fontSize:13}},s.name),
            !s.enabled?React.createElement('span',{className:'badge',style:{color:'var(--amber)',background:'var(--amber-d)',fontSize:10,marginLeft:6}},'OFF'):null,
            s.description?React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginTop:2}},s.description):null),
          React.createElement('div',{style:{display:'flex',gap:4,alignItems:'center',flexShrink:0}},
            React.createElement('a',{href:dlUrl('/profiles/'+profileId+'/skills/'+s.name+'/download'),className:'btn btn-ghost',style:{textDecoration:'none'}},'⬇'),
            React.createElement('button',{className:'btn btn-ghost',onClick:function(){setCopyModal(s.name);}},'⧉'),
            React.createElement('button',{className:'btn btn-ghost',style:{color:'var(--red)'},onClick:async function(){if(!confirm('Delete "'+s.name+'"?'))return;await api('/profiles/'+profileId+'/skills/'+s.name,{method:'DELETE'});loadTab('skills');}},'🗑'),
            React.createElement('button',{className:'toggle '+(s.enabled?'on':'off'),onClick:async function(){await api('/profiles/'+profileId+'/skills/'+s.name+'/toggle',{method:'POST',body:{enabled:!s.enabled}});loadTab('skills');}},React.createElement('div',{className:'toggle-dot'}))));}));
    }

    if(tab==='ftp'){
      return React.createElement('div',null,
        React.createElement('div',{className:'section-title'},
          React.createElement('h3',null,'📡 FTP / Website Management'),
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('ftp');}},'↻')),
        ftpData?React.createElement('div',null,
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:ftpData.hasCredentials?'rgba(52,211,153,.15)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},'🌐 FTP Connection'),
                ftpData.hasCredentials?React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)'}},'✓ Configured'):React.createElement('span',{className:'badge',style:{color:'var(--amber)',background:'var(--amber-d)'}},'Not configured')),
              !ftpEditing&&ftpData.hasCredentials?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setFtpEditing(true);}},'✏️ Edit'):null),
            ftpData.hasCredentials&&!ftpEditing?React.createElement('div',{className:'form-2col',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Host'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--accent)',marginTop:2}},ftpData.host)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'User'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--accent)',marginTop:2}},ftpData.user)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Password'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--dim)',marginTop:2}},ftpData.pass)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Port'),React.createElement('div',{className:'mono',style:{fontSize:13,marginTop:2}},ftpData.port))
            ):null,
            ftpEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid rgba(34,211,238,.2)',overflow:'hidden'}},
              React.createElement('div',{className:'form-2col',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}},
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'FTP_HOST'),React.createElement('input',{className:'input mono',value:ftpForm.host,onChange:function(e){setFtpForm(Object.assign({},ftpForm,{host:e.target.value}));},placeholder:'ftp.example.com'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'FTP_USER'),React.createElement('input',{className:'input mono',value:ftpForm.user,onChange:function(e){setFtpForm(Object.assign({},ftpForm,{user:e.target.value}));},placeholder:'user@example.com'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'FTP_PASS'),React.createElement('input',{className:'input mono',type:'password',value:ftpForm.pass,onChange:function(e){setFtpForm(Object.assign({},ftpForm,{pass:e.target.value}));},placeholder:'password'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'FTP_PORT'),React.createElement('input',{className:'input mono',value:ftpForm.port,onChange:function(e){setFtpForm(Object.assign({},ftpForm,{port:e.target.value}));},placeholder:'21'}))),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){await api('/profiles/'+profileId+'/ftp',{method:'PUT',body:ftpForm});toast('FTP credentials saved!','success');setFtpEditing(false);loadTab('ftp');}},'💾 Save'),
                ftpData.hasCredentials?React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setFtpEditing(false);}},'Cancel'):null)
            ):null),
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
              React.createElement('div',{style:{fontSize:14,fontWeight:600}},'🔌 Test Connection'),
              React.createElement('button',{className:'btn btn-sm '+(ftpData.hasCredentials?'btn-primary':'btn-default'),disabled:!ftpData.hasCredentials||ftpTesting,onClick:async function(){setFtpTesting(true);setFtpTestResult(null);try{var r=await api('/profiles/'+profileId+'/ftp/test',{method:'POST'});setFtpTestResult(r);}catch(e){setFtpTestResult({ok:false,output:e.message});}setFtpTesting(false);}},ftpTesting?React.createElement('span',{className:'spinner'}):'Test')),
            ftpTestResult?React.createElement('div',{style:{padding:12,borderRadius:8,background:ftpTestResult.ok?'var(--green-d)':'var(--red-d)',color:ftpTestResult.ok?'var(--green)':'var(--red)',fontSize:12}},
              React.createElement('span',{className:'mono'},ftpTestResult.output)):null,
            !ftpData.hasCredentials?React.createElement('div',{style:{padding:12,textAlign:'center',color:'var(--dim)',fontSize:12}},'Save FTP credentials first to test connection.'):null),
          React.createElement('div',{className:'card',style:{padding:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
              React.createElement('div',{style:{fontSize:14,fontWeight:600}},'🛠 FTP Deploy Skill'),
              ftpData.hasFtpSkill?React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)'}},'✓ Installed'):
                React.createElement('button',{className:'btn btn-xs btn-primary',onClick:async function(){var r=await api('/profiles/'+profileId+'/ftp/install-skill',{method:'POST'});toast(r.message,r.ok?'success':'error');loadTab('ftp');}},'Install')),
            React.createElement('div',{style:{fontSize:12,color:'var(--dim)',lineHeight:1.6}},'The ftp-deploy skill gives the bot commands to list, upload, download, read, and write files on the FTP server. The bot can manage website content directly.')),
          React.createElement('div',{className:'card',style:{padding:16,marginTop:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',null,React.createElement('div',{style:{fontSize:14,fontWeight:600}},'FTP Enabled'),React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},'Toggle FTP access for this profile')),
              React.createElement('button',{className:'toggle '+(ftpData.ftpEnabled?'on':'off'),onClick:async function(){var newState=!ftpData.ftpEnabled;await api('/profiles/'+profileId+'/ftp/toggle',{method:'POST',body:{enabled:newState}});toast(newState?'FTP enabled':'FTP disabled','success');loadTab('ftp');}},React.createElement('div',{className:'toggle-dot'}))))
        ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'})));
    }
    if(tab==='smtp'){
      return React.createElement('div',null,
        React.createElement('div',{className:'section-title'},
          React.createElement('h3',null,'Email / SMTP Management'),
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('smtp');}},'↻')),
        smtpData?React.createElement('div',null,
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:smtpData.hasCredentials?'rgba(52,211,153,.15)':'var(--border)'}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
                IC('mail',18),
                React.createElement('div',{style:{fontSize:16,fontWeight:700}},'SMTP Connection'),
                smtpData.hasCredentials?React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)'}},'✓ Configured'):React.createElement('span',{className:'badge',style:{color:'var(--amber)',background:'var(--amber-d)'}},'Not configured')),
              !smtpEditing&&smtpData.hasCredentials?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setSmtpEditing(true);}},'✏️ Edit'):null),
            smtpData.hasCredentials&&!smtpEditing?React.createElement('div',{className:'form-2col',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Host'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--accent)',marginTop:2}},smtpData.host)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Port'),React.createElement('div',{className:'mono',style:{fontSize:13,marginTop:2}},smtpData.port)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'User'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--accent)',marginTop:2}},smtpData.user)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'Password'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--dim)',marginTop:2}},smtpData.pass)),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'From'),React.createElement('div',{className:'mono trunc',style:{fontSize:13,color:'var(--accent)',marginTop:2}},smtpData.from||'(not set)')),
              React.createElement('div',{style:{padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},'TLS/SSL'),React.createElement('div',{className:'mono',style:{fontSize:13,color:smtpData.secure?'var(--green)':'var(--dim)',marginTop:2}},smtpData.secure?'Enabled':'Disabled'))
            ):null,
            smtpEditing?React.createElement('div',{style:{padding:14,background:'var(--bg)',borderRadius:8,border:'1px solid rgba(228,228,231,.15)',overflow:'hidden'}},
              React.createElement('div',{className:'form-2col',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}},
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'SMTP_HOST'),React.createElement('input',{className:'input mono',value:smtpForm.host,onChange:function(e){setSmtpForm(Object.assign({},smtpForm,{host:e.target.value}));},placeholder:'smtp.gmail.com'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'SMTP_PORT'),React.createElement('input',{className:'input mono',value:smtpForm.port,onChange:function(e){setSmtpForm(Object.assign({},smtpForm,{port:e.target.value}));},placeholder:'587'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'SMTP_USER'),React.createElement('input',{className:'input mono',value:smtpForm.user,onChange:function(e){setSmtpForm(Object.assign({},smtpForm,{user:e.target.value}));},placeholder:'user@example.com'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'SMTP_PASS'),React.createElement('input',{className:'input mono',type:'password',value:smtpForm.pass,onChange:function(e){setSmtpForm(Object.assign({},smtpForm,{pass:e.target.value}));},placeholder:'app password'})),
                React.createElement('div',null,React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)',display:'block',marginBottom:4}},'SMTP_FROM'),React.createElement('input',{className:'input mono',value:smtpForm.from,onChange:function(e){setSmtpForm(Object.assign({},smtpForm,{from:e.target.value}));},placeholder:'bot@example.com'})),
                React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,paddingTop:18}},
                  React.createElement('label',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},'TLS/SSL'),
                  React.createElement('button',{className:'toggle '+(smtpForm.secure?'on':'off'),onClick:function(){setSmtpForm(Object.assign({},smtpForm,{secure:!smtpForm.secure}));}},React.createElement('div',{className:'toggle-dot'})))),
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){await api('/profiles/'+profileId+'/smtp',{method:'PUT',body:smtpForm});toast('SMTP credentials saved!','success');setSmtpEditing(false);loadTab('smtp');}},'💾 Save'),
                smtpData.hasCredentials?React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setSmtpEditing(false);}},'Cancel'):null)
            ):null),
          React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
              React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Test Connection'),
              React.createElement('button',{className:'btn btn-sm '+(smtpData.hasCredentials?'btn-primary':'btn-default'),disabled:!smtpData.hasCredentials||smtpTesting,onClick:async function(){setSmtpTesting(true);setSmtpTestResult(null);try{var r=await api('/profiles/'+profileId+'/smtp/test',{method:'POST'});setSmtpTestResult(r);}catch(e){setSmtpTestResult({ok:false,output:e.message});}setSmtpTesting(false);}},smtpTesting?React.createElement('span',{className:'spinner'}):'Test')),
            smtpTestResult?React.createElement('div',{style:{padding:12,borderRadius:8,background:smtpTestResult.ok?'var(--green-d)':'var(--red-d)',color:smtpTestResult.ok?'var(--green)':'var(--red)',fontSize:12}},
              React.createElement('span',{className:'mono'},smtpTestResult.output)):null,
            !smtpData.hasCredentials?React.createElement('div',{style:{padding:12,textAlign:'center',color:'var(--dim)',fontSize:12}},'Save SMTP credentials first to test connection.'):null),
          React.createElement('div',{className:'card',style:{padding:16}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
              React.createElement('div',null,React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Email Enabled'),React.createElement('div',{style:{fontSize:11,color:'var(--dim)'}},'Toggle email sending for this profile')),
              React.createElement('button',{className:'toggle '+(smtpData.smtpEnabled?'on':'off'),onClick:async function(){var newState=!smtpData.smtpEnabled;await api('/profiles/'+profileId+'/smtp/toggle',{method:'POST',body:{enabled:newState}});toast(newState?'SMTP enabled':'SMTP disabled','success');loadTab('smtp');}},React.createElement('div',{className:'toggle-dot'}))))
        ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'})));
    }
    if(tab==='auth'){
      var authUrl=authUrlState;var setAuthUrl=setAuthUrlState;

      var discoverAndStart=async function(){setLoading(true);setOauthMsg(null);setOauthStep(1);try{
        var r=await api('/profiles/'+profileId+'/auth/oauth/start',{method:'POST',body:{}});
        if(r.success){setAuthUrl(r.authUrl);setOauthStep(2);}
        else{setOauthMsg({type:'error',text:r.error||'Failed to generate auth URL'});setOauthStep(0);}
      }catch(e){setOauthMsg({type:'error',text:e.message});setOauthStep(0);}setLoading(false);};

      var startWithClientId=async function(cid){if(!cid)return;setLoading(true);setOauthMsg(null);try{
        var r=await api('/profiles/'+profileId+'/auth/oauth/start',{method:'POST',body:{clientId:cid}});
        if(r.success){setAuthUrl(r.authUrl);setOauthStep(2);}
        else{setOauthMsg({type:'error',text:'Failed to start OAuth'});}
      }catch(e){setOauthMsg({type:'error',text:e.message});}setLoading(false);};

      var completeOAuth=async function(){if(!oauthCallbackUrl.trim())return;setLoading(true);setOauthMsg(null);try{
        var r=await api('/profiles/'+profileId+'/auth/oauth/complete',{method:'POST',body:{callbackUrl:oauthCallbackUrl.trim()}});
        if(r.success){setOauthMsg({type:'success',text:r.message});setOauthStep(0);setOauthCallbackUrl('');setAuthUrl('');loadTab('auth');}
        else{setOauthMsg({type:'error',text:r.error||'Failed'});}
      }catch(e){setOauthMsg({type:'error',text:e.message});}setLoading(false);};

      var saveManualTokens=async function(){if(!manualToken.trim())return;setLoading(true);setOauthMsg(null);try{
        var r=await api('/profiles/'+profileId+'/auth/oauth/manual',{method:'POST',body:{accessToken:manualToken.trim(),refreshToken:manualRefresh.trim()||undefined}});
        if(r.success){setOauthMsg({type:'success',text:r.message});setManualMode(false);setManualToken('');setManualRefresh('');loadTab('auth');}
        else{setOauthMsg({type:'error',text:r.error||'Failed'});}
      }catch(e){setOauthMsg({type:'error',text:e.message});}setLoading(false);};

      var cancelOAuth=function(){setOauthStep(0);setAuthUrl('');setOauthCallbackUrl('');api('/profiles/'+profileId+'/auth/oauth/cancel',{method:'POST'}).catch(function(){});};
      var revokeOAuth=async function(){if(!confirm('Disconnect Codex OAuth? Profile will revert to API key.'))return;setLoading(true);try{
        var r=await api('/profiles/'+profileId+'/auth/oauth/revoke',{method:'POST'});setOauthMsg({type:'success',text:r.message});loadTab('auth');
      }catch(e){setOauthMsg({type:'error',text:e.message});}setLoading(false);};

      var toggleAuth=async function(method){if(!confirm('Switch to '+(method==='codex-oauth'?'Codex OAuth (subscription billing)':'API Key (per-token billing)')+'? Gateway will restart.'))return;setLoading(true);try{
        var r=await api('/profiles/'+profileId+'/auth/toggle',{method:'POST',body:{method:method}});
        toast(r.message,'success');loadTab('auth');
      }catch(e){toast(e.message,'error');}setLoading(false);};

      var methodLabel=authData?authData.method==='codex-oauth'?'Codex OAuth (Subscription)':authData.method==='api-key'?'API Key (Per-token)':'Not configured':'...';
      var badgeColor=authData?(authData.method==='codex-oauth'?(authData.oauthValid?'var(--green)':'var(--amber)'):authData.method==='api-key'?'var(--green)':'var(--red)'):'var(--dim)';
      var badgeBg=authData?(authData.method==='codex-oauth'?(authData.oauthValid?'var(--green-d)':'var(--amber-d)'):authData.method==='api-key'?'var(--green-d)':'var(--red-d)'):'var(--border)';
      var hasOAuth=authData&&(authData.oauthValid||authData.method==='codex-oauth');
      var hasApiKey=authData&&authData.hasApiKey;
      return authData?React.createElement('div',null,
        oauthMsg?React.createElement('div',{style:{padding:12,borderRadius:8,marginBottom:16,fontSize:13,background:oauthMsg.type==='success'?'var(--green-d)':'var(--red-d)',color:oauthMsg.type==='success'?'var(--green)':'var(--red)',border:'1px solid '+(oauthMsg.type==='success'?'var(--green)':'var(--red)'),whiteSpace:'pre-wrap'}},oauthMsg.text):null,

        React.createElement('div',{className:'card',style:{padding:20}},
          React.createElement('div',{className:'section-title'},React.createElement('h3',null,IC('shield',14),' Current Authentication'),React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('auth');}},'↻')),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,background:'var(--surface)',borderRadius:8}},
            React.createElement('div',null,
              React.createElement('div',{style:{fontSize:12,color:'var(--dim)'}},'Active Method'),
              React.createElement('div',{style:{fontSize:16,fontWeight:700,marginTop:4}},methodLabel)),
            React.createElement('span',{className:'badge',style:{color:badgeColor,background:badgeBg,fontSize:12}},
              authData.method==='codex-oauth'&&authData.oauthValid?'● Connected':authData.method==='codex-oauth'&&!authData.oauthValid?'● Expired':authData.method==='api-key'?'● Active':'○ None')),
          hasOAuth&&hasApiKey?React.createElement('div',{style:{marginTop:14,padding:12,background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}},
            React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:8,color:'var(--text)'}},'Switch Auth Method'),
            React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:10,lineHeight:1.5}},'Both methods are configured. OAuth uses your ChatGPT subscription (flat rate). API Key uses per-token billing.'),
            React.createElement('div',{style:{display:'flex',gap:8}},
              React.createElement('button',{className:'btn btn-sm '+(authData.method==='codex-oauth'?'btn-primary':'btn-default'),disabled:loading||authData.method==='codex-oauth',onClick:function(){toggleAuth('codex-oauth');}},authData.method==='codex-oauth'?'● OAuth (active)':'Switch to OAuth'),
              React.createElement('button',{className:'btn btn-sm '+(authData.method==='api-key'?'btn-primary':'btn-default'),disabled:loading||authData.method==='api-key',onClick:function(){toggleAuth('api-key');}},authData.method==='api-key'?'● API Key (active)':'Switch to API Key'))):null,
          authData.method==='codex-oauth'?React.createElement('div',{style:{marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}},
            React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},authData.oauthExpiry?'Expires: '+new Date(authData.oauthExpiry).toLocaleString():'No expiry info'),
            React.createElement('button',{className:'btn btn-sm btn-danger',onClick:revokeOAuth,disabled:loading},IC('x',12),' Remove OAuth Tokens')):null),

        React.createElement('div',{className:'card',style:{padding:20,marginTop:16}},
          React.createElement('div',{className:'section-title'},React.createElement('h3',null,IC('zap',14),' ',authData.method==='codex-oauth'&&authData.oauthValid?'Refresh OAuth':'Connect Codex OAuth')),
          React.createElement('div',{style:{fontSize:13,color:'var(--text)',marginBottom:16,lineHeight:1.6}},'Connect your OpenAI ChatGPT / Codex subscription. Three steps — no SSH needed.'),

          oauthStep===0&&!manualMode?React.createElement('div',null,
            React.createElement('button',{className:'btn btn-primary',onClick:discoverAndStart,disabled:loading,style:{marginBottom:12}},IC('zap',14),' ',loading?'Generating...':'Connect OpenAI Account'),
            React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setManualMode(true);}},'Paste Token Manually'),
              React.createElement('details',{style:{flex:1}},
                React.createElement('summary',{style:{fontSize:11,color:'var(--dim)',cursor:'pointer'}},'Use custom Client ID'),
                React.createElement('div',{style:{display:'flex',gap:6,marginTop:6}},
                  React.createElement('input',{className:'input mono',placeholder:'Client ID from OpenClaw source...',value:customClientId,onChange:function(e){setCustomClientId(e.target.value);},style:{fontSize:11,flex:1}}),
                  React.createElement('button',{className:'btn btn-xs btn-primary',disabled:!customClientId.trim()||loading,onClick:function(){startWithClientId(customClientId.trim());}},'Go'))))):null,

          oauthStep===1?React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,padding:16}},
            React.createElement('span',{className:'spinner'}),
            React.createElement('div',null,React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Generating auth URL...'),
              React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginTop:4}},'This should only take a moment'))):null,

          oauthStep===2&&authUrl?React.createElement('div',null,
            React.createElement('div',{style:{padding:16,background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:12}},
                React.createElement('div',{style:{width:28,height:28,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700}},'1'),
                React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Log in to your OpenAI account')),
              React.createElement('div',{style:{padding:12,background:'var(--amber-d)',borderRadius:8,border:'1px solid var(--amber)',marginBottom:12}},
                React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'var(--amber)',marginBottom:4}},'⚠ Read this first!'),
                React.createElement('div',{style:{fontSize:12,color:'var(--text)',lineHeight:1.6}},'After you log in and approve, your browser will show an error page saying "can\'t connect to server" or "localhost refused." That\'s completely normal! Don\'t close that page — you\'ll need to copy the URL from it in the next step.')),
              React.createElement('a',{href:authUrl,target:'_blank',rel:'noopener noreferrer',className:'btn btn-primary',style:{display:'inline-flex',alignItems:'center',gap:6}},IC('link',14),' Open OpenAI Login'),
              React.createElement('div',{style:{marginTop:8}},
                React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){navigator.clipboard.writeText(authUrl);toast('URL copied!','success');}},IC('clipboard',12),' Copy URL Instead'))),

            React.createElement('div',{style:{padding:16,background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:12}},
                React.createElement('div',{style:{width:28,height:28,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700}},'2'),
                React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Copy the error page URL and paste it here')),
              React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:6,lineHeight:1.5}},'On the error page, tap the address bar and copy the full URL. It looks like:'),
              React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--accent)',background:'var(--bg)',padding:8,borderRadius:6,marginBottom:10,wordBreak:'break-all'}},'http://localhost:1455/auth/callback?code=abc123&state=xyz...'),
              React.createElement('input',{type:'text',value:oauthCallbackUrl,onChange:function(e){setOauthCallbackUrl(e.target.value);},onKeyDown:function(e){if(e.key==='Enter')completeOAuth();},placeholder:'Paste the full URL from the error page here...',className:'mono',style:{width:'100%',padding:'10px 12px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:12,boxSizing:'border-box'}})),

            React.createElement('div',{style:{display:'flex',gap:8,marginTop:4}},
              React.createElement('button',{className:'btn btn-primary',onClick:completeOAuth,disabled:loading||!oauthCallbackUrl.trim()},IC('check',14),' ',loading?'Connecting...':'Complete Connection'),
              React.createElement('button',{className:'btn btn-sm btn-default',onClick:cancelOAuth},'Cancel'))):null,

          manualMode?React.createElement('div',{style:{padding:16,background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)'}},
            React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:10}},'Manual Token Entry'),
            React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:12,lineHeight:1.5}},'If you have tokens from running the CLI via SSH or another source, paste them here directly.'),
            React.createElement('div',{style:{marginBottom:8}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Access Token *'),React.createElement('input',{className:'input mono',type:'password',placeholder:'eyJ...',value:manualToken,onChange:function(e){setManualToken(e.target.value);},style:{fontSize:12}})),
            React.createElement('div',{style:{marginBottom:12}},React.createElement('div',{style:{fontSize:11,color:'var(--dim)',marginBottom:4}},'Refresh Token (optional)'),React.createElement('input',{className:'input mono',type:'password',placeholder:'Optional — for auto-renewal',value:manualRefresh,onChange:function(e){setManualRefresh(e.target.value);},style:{fontSize:12}})),
            React.createElement('div',{style:{display:'flex',gap:8}},
              React.createElement('button',{className:'btn btn-sm btn-primary',disabled:loading||!manualToken.trim(),onClick:saveManualTokens},loading?'Saving...':'Save Tokens'),
              React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setManualMode(false);}},'Cancel'))):null),

        authData&&authData.method==='codex-oauth'&&authData.oauthValid?React.createElement('div',{className:'card',style:{padding:20,marginTop:16}},
          React.createElement('div',{className:'section-title'},React.createElement('h3',null,IC('share2',14),' Share OAuth to Other Profiles')),
          React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:14,lineHeight:1.6}},'Copy this profile\'s Codex OAuth tokens to other profiles so they all use the same subscription.'),
          React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
            profiles.filter(function(pr){return pr.id!==profileId;}).map(function(pr){
              return React.createElement('button',{key:pr.id,className:'btn btn-sm btn-default',onClick:async function(){
                if(!confirm('Share OAuth tokens to "'+pr.id+'"?'))return;
                setLoading(true);try{
                  var r=await api('/profiles/'+profileId+'/auth/oauth/share',{method:'POST',body:{targets:[pr.id]}});
                  if(r.success)toast('OAuth shared to '+pr.id,'success');
                }catch(e){toast(e.message,'error');}setLoading(false);
              }},IC('arrowRight',12),' ',pr.name||pr.id);}),
            profiles.filter(function(pr){return pr.id!==profileId;}).length>1?React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){
              var targets=profiles.filter(function(pr){return pr.id!==profileId;}).map(function(pr){return pr.id;});
              if(!confirm('Share to ALL '+targets.length+' other profiles?'))return;
              setLoading(true);try{
                var r=await api('/profiles/'+profileId+'/auth/oauth/share',{method:'POST',body:{targets:targets}});
                if(r.success)toast('OAuth shared to all profiles','success');
              }catch(e){toast(e.message,'error');}setLoading(false);
            }},IC('share2',12),' Share to All'):null)):null,
        React.createElement('div',{style:{marginTop:16,padding:16,border:'1px solid var(--border)',borderRadius:10,opacity:0.7}},
          React.createElement('div',{style:{fontSize:12,fontWeight:600,color:'var(--dim)',marginBottom:8}},IC('info',12),' OAuth vs API Key — What\'s the difference?'),
          React.createElement('div',{style:{fontSize:12,color:'var(--dim)',lineHeight:1.7}},
            React.createElement('div',{style:{marginBottom:6}},React.createElement('b',null,'Codex OAuth (Subscription)'),' — Uses your ChatGPT Plus/Pro/Team subscription. Flat monthly rate, no per-token charges. Usage is rate-limited based on your plan tier. Best for most users.'),
            React.createElement('div',null,React.createElement('b',null,'API Key (Per-token)'),' — Uses your OpenAI Platform API credits. Pay-as-you-go billing based on tokens used. No rate limits but costs can add up. Best for heavy/automated use.'),
            React.createElement('div',{style:{marginTop:6}},'Both methods can coexist. Use the toggle above to switch between them anytime. The permission screen during OAuth is just OpenAI asking which workspace to use — it does NOT charge your API credits.')))
      ):React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'}));
    }
    if(tab==='logs'){
      return React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'flex-end',marginBottom:8}},React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){loadTab('logs');}},'↻')),
        React.createElement('div',{className:'log-area'},logs||'No logs'));
    }
    return null;
  }

  return React.createElement('div',null,
    copyModal?React.createElement(CopySkillModal,{skill:copyModal,profileId:profileId,profiles:profiles,onClose:function(){setCopyModal(null);},toast:toast}):null,
    memModal?React.createElement(MemoryFileModal,{profileId:profileId,file:memModal,onClose:function(){setMemModal(null);if(tab==='history')loadTab('history');},toast:toast}):null,
    resetModal?React.createElement(ResetProfileModal,{profileId:profileId,onClose:function(){setResetModal(false);},toast:toast}):null,
    cronAddModal?React.createElement(CronAddModal,{profileId:profileId,onClose:function(){setCronAddModal(false);},toast:toast,onAdded:function(){loadTab('cron');}}):null,
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}},
      React.createElement('div',null,
        React.createElement('button',{className:'btn btn-ghost',onClick:function(){onNav('dashboard');},style:{marginBottom:4,fontSize:12,color:'var(--accent)'}},'← Back'),
        React.createElement('h2',{style:{fontSize:20,fontWeight:700}},p.name||p.id,
          React.createElement('span',{className:'badge',style:{marginLeft:10,fontSize:11,color:p.status==='running'?'var(--green)':'var(--red)',background:p.status==='running'?'var(--green-d)':'var(--red-d)'}},p.status))),
      React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setResetModal(true);}},'🔄 Reset'),
        React.createElement('a',{href:dlUrl('/profiles/'+profileId+'/backup'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},'⬇'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){doAction('restart');}},'↻ Restart'),
        p.status==='running'?React.createElement('button',{className:'btn btn-sm btn-danger',onClick:function(){doAction('stop');}},'⏹ Stop'):React.createElement('button',{className:'btn btn-sm btn-green',onClick:function(){doAction('start');}},'▶ Start'),
        profileId!=='original'?React.createElement('button',{className:'btn btn-sm btn-danger',onClick:async function(){if(!confirm('Delete "'+profileId+'"?'))return;await api('/profiles/'+profileId,{method:'DELETE'});toast('Removed','success');onNav('dashboard');onNav('refresh');}},'🗑'):null)),
    React.createElement('div',{className:'tab-bar'},tabs.map(function(t){return React.createElement('button',{key:t.id,className:'tab-btn '+(tab===t.id?'active':''),onClick:function(){setTab(t.id);}},t.ic?IC(t.ic,13):null,' ',t.l);})),
    loading?React.createElement('div',{style:{textAlign:'center',padding:20}},React.createElement('span',{className:'spinner'})):null,
    renderTabContent()
  );
}

