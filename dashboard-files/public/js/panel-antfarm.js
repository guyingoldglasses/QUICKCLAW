/* QuickClaw Dashboard — Antfarm Panel */
function PanelAntfarm({toast}){
  var[s,setS]=useState(null);var[runs,setRuns]=useState('');var[loading,setLoading]=useState(false);
  var[runWf,setRunWf]=useState('');var[runTask,setRunTask]=useState('');var[running,setRunning]=useState(false);
  var[sq,setSq]=useState('');var[sr,setSr]=useState('');
  var[verInfo,setVerInfo]=useState(null);var[updating,setUpdating]=useState(false);
  var[rollbackVer,setRollbackVer]=useState('');
  var load=async function(){setLoading(true);var st=await api('/antfarm/status');setS(st);if(st.installed){var r=await api('/antfarm/runs');setRuns(r.output||'');}setLoading(false);};
  var checkVersion=async function(){var v=await api('/antfarm/version');setVerInfo(v);};
  useEffect(function(){load();checkVersion();},[]);
  if(!s)return React.createElement('div',{style:{textAlign:'center',padding:40}},React.createElement('span',{className:'spinner'}));
  if(!s.installed)return React.createElement('div',null,React.createElement('div',{className:'section-title'},React.createElement('h3',null,'Antfarm')),React.createElement('div',{className:'card',style:{padding:30,textAlign:'center'}},React.createElement('div',{style:{fontSize:32,marginBottom:8}},IC('grid',32)),React.createElement('div',{style:{color:'var(--dim)',marginBottom:12}},'Not installed'),React.createElement('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:16}},'Install with: npm install -g antfarm')));
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},React.createElement('h3',null,'Antfarm'),React.createElement('button',{className:'btn btn-sm btn-default',onClick:load,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻')),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}},
      React.createElement(StatCard,{value:'✓',label:'Installed',color:'var(--green)'}),
      React.createElement(StatCard,{value:s.workflows.length,label:'Workflows',color:'var(--accent)'}),
      React.createElement(StatCard,{value:s.dashboardRunning?'●':'○',label:'Dashboard',color:s.dashboardRunning?'var(--green)':'var(--dim)'})),
    verInfo?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16,borderColor:verInfo.updateAvailable?'rgba(251,191,36,.2)':'var(--border)'}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
        React.createElement('div',{style:{fontSize:14,fontWeight:600}},'Version & Updates'),
        React.createElement('div',{style:{display:'flex',gap:6}},
          React.createElement('button',{className:'btn btn-xs btn-default',onClick:checkVersion},'Check'),
          verInfo.updateAvailable?React.createElement('button',{className:'btn btn-xs btn-primary',disabled:updating,onClick:async function(){setUpdating(true);var r=await api('/antfarm/update',{method:'POST'});toast(r.ok?'Updated to '+r.version:'Update failed','success');checkVersion();setUpdating(false);}},updating?React.createElement('span',{className:'spinner'}):'Update'):null)),
      React.createElement('div',{className:'mono',style:{fontSize:12,color:'var(--dim)'}},
        'Current: ',React.createElement('span',{style:{color:'var(--accent)'}},verInfo.current||'unknown'),
        verInfo.latest?' · Latest: ':null,verInfo.latest?React.createElement('span',{style:{color:verInfo.updateAvailable?'var(--amber)':'var(--green)'}},verInfo.latest):null),
      React.createElement('div',{style:{display:'flex',gap:8,marginTop:10,alignItems:'center'}},
        React.createElement('input',{className:'input mono',value:rollbackVer,onChange:function(e){setRollbackVer(e.target.value);},placeholder:'e.g. 1.2.0',style:{flex:1,maxWidth:200}}),
        React.createElement('button',{className:'btn btn-xs btn-default',disabled:!rollbackVer||updating,onClick:async function(){if(!confirm('Rollback to v'+rollbackVer+'?'))return;setUpdating(true);var r=await api('/antfarm/rollback',{method:'POST',body:{version:rollbackVer}});toast(r.ok?'Rolled back to '+r.version:'Rollback failed',r.ok?'success':'error');checkVersion();setUpdating(false);setRollbackVer('');}},'Rollback'),
        React.createElement('span',{style:{fontSize:10,color:'var(--dim)'}},'Enter version to rollback'))):null,
    React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
      React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:12}},'Run Workflow'),
      React.createElement('div',{style:{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}},s.workflows.map(function(w){return React.createElement('button',{key:w,className:'btn btn-sm '+(runWf===w?'btn-primary':'btn-default'),onClick:function(){setRunWf(w);}},w);})),
      runWf?React.createElement('div',null,
        React.createElement('textarea',{className:'input mono',value:runTask,onChange:function(e){setRunTask(e.target.value);},placeholder:'Task for '+runWf+'...',style:{minHeight:80,resize:'vertical',marginBottom:8}}),
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){setRunning(true);await api('/antfarm/run',{method:'POST',body:{workflow:runWf,task:runTask}});toast('Started','success');setRunTask('');load();setRunning(false);},disabled:running||!runTask},running?React.createElement('span',{className:'spinner'}):null,' Run')):null),
    React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
      React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:8}},'Check Status'),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('input',{className:'input',value:sq,onChange:function(e){setSq(e.target.value);},placeholder:'Run ID...',style:{flex:1}}),
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:async function(){var r=await api('/antfarm/runs/'+encodeURIComponent(sq)+'/status');setSr(r.output||'No results');},disabled:!sq},'Check')),
      sr?React.createElement('div',{className:'log-area',style:{marginTop:8,maxHeight:200}},sr):null),
    runs?React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:8}},'Recent Runs'),React.createElement('div',{className:'log-area',style:{maxHeight:300}},runs)):null,
    React.createElement('div',{className:'card',style:{padding:14}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
        React.createElement('div',null,React.createElement('b',null,'Antfarm Dashboard'),React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},':3333 · '+(s.dashboardRunning?'Running':'Stopped'))),
        React.createElement('div',{style:{display:'flex',gap:6}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:async function(){await api('/antfarm/dashboard/start',{method:'POST'});toast('Started','success');load();}},'Start'),
          React.createElement('button',{className:'btn btn-sm btn-danger',onClick:async function(){await api('/antfarm/dashboard/stop',{method:'POST'});toast('Stopped','success');load();}},'Stop')))));
}
