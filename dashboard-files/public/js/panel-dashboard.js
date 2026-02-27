/* QuickClaw Dashboard — Dashboard Panel */
function PanelDashboard({profiles,system,loading,onRefresh,onNav,toast}){
  var[showCreate,setShowCreate]=useState(false);var[usageData,setUsageData]=useState(null);
  var[setupStatus,setSetupStatus]=useState(null);
  useEffect(function(){api('/usage/all').then(setUsageData).catch(function(){});},[profiles]);
  useEffect(function(){api('/chat/status').then(setSetupStatus).catch(function(){});},[]);
  var running=profiles.filter(function(p){return p.status==='running';}).length;
  var totalCrons=profiles.reduce(function(s,p){return s+(p.cronCount||0);},0);

  // Setup banner — shown when first-run or missing API keys
  var showSetupBanner=setupStatus&&(setupStatus.firstRun||!setupStatus.chatReady);
  var setupBanner=showSetupBanner?React.createElement('div',{
    onClick:function(){onNav('chat');},
    style:{padding:20,marginBottom:20,borderRadius:14,cursor:'pointer',
      background:'linear-gradient(135deg, rgba(255,180,60,0.15), rgba(255,120,0,0.08))',
      border:'2px solid rgba(255,180,60,0.4)',transition:'all 0.2s'}},
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:14}},
      React.createElement('div',{style:{fontSize:36}},'\uD83D\uDE80'),
      React.createElement('div',{style:{flex:1}},
        React.createElement('div',{style:{fontSize:16,fontWeight:800,color:'var(--accent)',marginBottom:4}},'Finish Setting Up Your AI Bot'),
        React.createElement('div',{style:{fontSize:13,color:'var(--dim)',lineHeight:1.5}},
          !setupStatus.chatReady?'Connect an API key to start chatting with your bot. It only takes a minute!':
          !setupStatus.keys.telegram?'Your bot is ready to chat! Add Telegram for mobile access too.':
          'Complete your bot setup for the best experience.')),
      React.createElement('div',{style:{fontSize:14,color:'var(--accent)',fontWeight:700,whiteSpace:'nowrap'}},
        'Go to Chat \u2192'))):null;

  return React.createElement('div',null,
    setupBanner,
    showCreate?React.createElement(ProfileWizard,{profiles:profiles,onClose:function(){setShowCreate(false);},toast:toast,onCreated:onRefresh}):null,
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:24}},
      React.createElement(StatCard,{value:profiles.length,label:'Profiles',color:'var(--accent)'}),
      React.createElement(StatCard,{value:running+'/'+profiles.length,label:'Running',color:'var(--green)'}),
      React.createElement(StatCard,{value:usageData?fmtCost(usageData.totals.cost):'...',label:'Total Cost',color:'var(--amber)',size:16}),
      React.createElement(StatCard,{value:usageData?fmtTokens(usageData.totals.inputTokens+usageData.totals.outputTokens):'...',label:'Tokens',color:'var(--purple)',size:14}),
      React.createElement(StatCard,{value:totalCrons,label:'Cron Jobs',color:'var(--blue)'}),
      React.createElement(StatCard,{value:system.memInfo||'...',label:'Memory',color:'var(--dim)',size:12}),
      React.createElement(StatCard,{value:system.swapInfo||'...',label:'Swap',color:'var(--dim)',size:12})
    ),
    usageData&&usageData.totals.cost>0?React.createElement('div',{className:'card',style:{padding:16,marginBottom:20}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
        React.createElement('div',{style:{fontSize:13,fontWeight:600}},'💰 Cost by Profile'),
        React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--amber)'}},'~'+fmtCost(usageData.projected30d)+'/mo')),
      Object.entries(usageData.profiles).map(function(entry){var id=entry[0],u=entry[1];var pct=usageData.totals.cost>0?(u.cost/usageData.totals.cost*100):0;
        return React.createElement('div',{key:id,style:{marginBottom:10}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}},React.createElement('span',{style:{fontWeight:600}},id),React.createElement('span',{className:'mono',style:{color:'var(--amber)'}},fmtCost(u.cost))),
          React.createElement('div',{className:'bar-wrap'},React.createElement('div',{className:'bar',style:{width:Math.max(pct,1)+'%',background:'var(--accent)'}})));})
    ):null,
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'⚡ Profiles'),
      React.createElement('div',{style:{display:'flex',gap:6}},
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){setShowCreate(true);}},'+ New'),
        React.createElement('a',{href:dlUrl('/backup/all'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},'⬇ Backup'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:onRefresh,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻'))),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8}},
      profiles.map(function(p){return React.createElement('div',{key:p.id,className:'card card-click',style:{padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',borderLeft:'3px solid '+(p.status==='running'?'var(--green)':'var(--dim)')},onClick:function(){onNav('profile',p.id);}},
        React.createElement('div',null,
          React.createElement('div',{style:{fontSize:14,fontWeight:600}},p.name||p.id,
            React.createElement('span',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginLeft:6}},':'+p.port),
            p.telegramEnabled?React.createElement('span',{style:{marginLeft:6,fontSize:11}},'📱'):null,
            p.cronCount>0?React.createElement('span',{style:{marginLeft:4,fontSize:11}},'⏰'+p.cronCount):null),
          React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:2}},p.skillCount+' skills · '+(p.uptime||'down'),p.totalCost>0?React.createElement('span',{style:{color:'var(--amber)',marginLeft:6}},fmtCost(p.totalCost)):null)),
        React.createElement('span',{className:'badge',style:{color:p.status==='running'?'var(--green)':'var(--red)',background:p.status==='running'?'var(--green-d)':'var(--red-d)'}},p.status==='running'?'● LIVE':'○ '+p.status.toUpperCase()));})),
    React.createElement('div',{style:{marginTop:24}},
      React.createElement('div',{className:'section-title'},React.createElement('h3',null,'🖥 Server')),
      React.createElement('div',{className:'card',style:{padding:14}},
        React.createElement('div',{className:'mono',style:{fontSize:12,lineHeight:1.8,color:'var(--dim)'}},
          ['hostname','uptime','memInfo','swapInfo','loadAvg','nodeVersion','openclawVersion','diskUsage'].map(function(k){return React.createElement('div',{key:k},k+': ',React.createElement('span',{style:{color:'var(--text)'}},system[k]||'...'));}))))
  );
}
