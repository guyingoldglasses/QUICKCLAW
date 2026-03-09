/* QuickClaw Dashboard — App Root */
function App(){
  var[panel,setPanel]=useState('dashboard');var[profiles,setProfiles]=useState([]);var[system,setSystem]=useState({});
  var[activeProfile,setActiveProfile]=useState(null);var[loading,setLoading]=useState(true);
  var[toastMsg,setToastMsg]=useState(null);var[toastType,setToastType]=useState('info');var[mobileOpen,setMobileOpen]=useState(false);
  var[kbHelp,setKbHelp]=useState(false);
  var toast=function(msg,type){setToastMsg(msg);setToastType(type||'info');setTimeout(function(){setToastMsg(null);},3500);};
  var loadData=async function(){setLoading(true);try{var r=await Promise.all([api('/profiles'),api('/system')]);setProfiles(r[0].profiles||[]);setSystem(r[1]);}catch(e){toast('Connection failed — retrying...','error');}setLoading(false);};
  var _retries=useRef(0);
  useEffect(function(){
    // Initial load with auto-retry
    function tryLoad(){
      Promise.all([api('/profiles'),api('/system')]).then(function(r){
        setProfiles(r[0].profiles||[]);setSystem(r[1]);setLoading(false);
        // Once connected, check if setup is needed
        api('/chat/status').then(function(s){
          if(s.firstRun || !s.chatReady){setPanel('chat');}
        }).catch(function(){});
      }).catch(function(){
        _retries.current++;
        if(_retries.current<=5){
          setTimeout(tryLoad, _retries.current*1500);
        }else{
          setLoading(false);
          toast('Cannot connect to dashboard server. Is it running?','error');
        }
      });
    }
    tryLoad();
  },[]);
  useEffect(function(){function h(e){if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
    if(e.key==='1')nav('dashboard');else if(e.key==='c'||e.key==='C')nav('chat');else if(e.key==='2')nav('updates');else if(e.key==='3')nav('security');else if(e.key==='4')nav('antfarm');else if(e.key==='5')nav('files');else if(e.key==='6')nav('code');else if(e.key==='7')nav('timeline');else if(e.key==='8')nav('news');
    else if(e.key==='r')loadData();else if(e.key==='?')setKbHelp(true);else if(e.key==='Escape')setKbHelp(false);}
    window.addEventListener('keydown',h);return function(){window.removeEventListener('keydown',h);};},[]);
  var nav=function(t,id){if(t==='refresh'){loadData();return;}if(t==='profile'){setActiveProfile(id);setPanel('profile');}else setPanel(t);setMobileOpen(false);};

  return React.createElement('div',{className:'app'},
    kbHelp?React.createElement(KeyboardHelp,{onClose:function(){setKbHelp(false);}}):null,
    React.createElement('div',{className:'mobile-overlay'+(mobileOpen?' open':''),onClick:function(){setMobileOpen(false);}}),
    React.createElement('nav',{className:'sidebar'+(mobileOpen?' open':'')},
      React.createElement('div',{style:{padding:'20px 16px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}},
        React.createElement('span',{style:{color:'var(--accent)',fontSize:24}},'⚡'),
        React.createElement('div',null,React.createElement('div',{style:{fontSize:16,fontWeight:800,color:'var(--accent)'}},'OpenClaw'),React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},'COMMAND CENTER v2.5'))),
      React.createElement('div',{style:{padding:'12px 12px 4px'}},
        React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--muted)',textTransform:'uppercase',marginBottom:6,paddingLeft:4}},'Navigation'),
        [['dashboard','home','Dashboard','1'],['chat','messageCircle','Chat','C'],['updates','refresh','Updates','2'],['security','shield','Security','3'],['antfarm','grid','Antfarm','4'],['files','folder','Files','5'],['code','code','Code','6'],['timeline','clock','Timeline','7'],['news','rss','News','8']].map(function(x){
          return React.createElement('button',{key:x[0],className:'nav-btn '+(panel===x[0]?'active':''),onClick:function(){nav(x[0]);}},
            IC(x[1],16),React.createElement('span',{style:{marginLeft:2}},x[2]),React.createElement('span',{className:'kbd',style:{marginLeft:'auto'}},x[3]));})),
      React.createElement('div',{style:{padding:'4px 12px'}},
        React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--muted)',textTransform:'uppercase',marginBottom:6,marginTop:8,paddingLeft:4}},'Profiles'),
        profiles.map(function(p){return React.createElement('button',{key:p.id,className:'nav-btn '+((panel==='profile'&&activeProfile===p.id)?'active':''),onClick:function(){nav('profile',p.id);}},
          React.createElement('span',{style:{width:8,height:8,borderRadius:'50%',flexShrink:0,background:p.status==='running'?'var(--green)':p.status==='failed'?'var(--red)':'var(--muted)'}}),
          p.id,React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--muted)',marginLeft:'auto'}},':'+p.port));})),
      React.createElement('div',{style:{marginTop:'auto',padding:12,borderTop:'1px solid var(--border)'}},
        React.createElement('div',{style:{padding:10,borderRadius:8,background:'var(--bg)',fontSize:11},className:'mono'},
          React.createElement('div',{style:{color:'var(--dim)',marginBottom:4}},'Server'),
          React.createElement('div',{style:{color:'var(--green)',display:'flex',alignItems:'center',gap:4}},
            React.createElement('span',{style:{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}),system.hostname||'...'),
          React.createElement('div',{style:{color:'var(--dim)',marginTop:4,cursor:'pointer'},onClick:function(){setKbHelp(true);}},'⌨️ Shortcuts (?)')))),
    React.createElement('div',{className:'main'},
      React.createElement(AlertBanner),
      React.createElement('div',{className:'mobile-header',style:{display:'flex'}},
        React.createElement('button',{style:{background:'none',border:'none',color:'var(--text)',fontSize:18,padding:'8px 10px',flexShrink:0},onClick:function(){setMobileOpen(!mobileOpen);}},'☰'),
        React.createElement('div',{className:'top-nav'},
          [['dashboard','home','Dashboard'],['chat','messageCircle','Chat'],['updates','refresh','Updates'],['security','shield','Security'],['antfarm','grid','Antfarm'],['files','folder','Files'],['code','code','Code'],['timeline','clock','Timeline'],['news','rss','News']].map(function(x){
            return React.createElement('button',{key:x[0],className:'top-nav-btn '+(panel===x[0]?'active':''),onClick:function(){nav(x[0]);setMobileOpen(false);}},IC(x[1],13),x[2]);}),
          profiles.map(function(p){return React.createElement('button',{key:p.id,className:'top-nav-btn '+((panel==='profile'&&activeProfile===p.id)?'active':''),onClick:function(){nav('profile',p.id);setMobileOpen(false);}},
            React.createElement('span',{style:{width:6,height:6,borderRadius:'50%',flexShrink:0,background:p.status==='running'?'var(--green)':'var(--muted)'}}),p.id);}))),
      React.createElement('div',{className:'content'},
        panel==='dashboard'?React.createElement(PanelDashboard,{profiles:profiles,system:system,loading:loading,onRefresh:loadData,onNav:nav,toast:toast}):null,
        panel==='chat'?React.createElement(PanelChat,{toast:toast,onNav:nav}):null,
        panel==='profile'?React.createElement(PanelProfile,{profileId:activeProfile,profiles:profiles,toast:toast,onNav:nav}):null,
        panel==='updates'?React.createElement(PanelUpdates,{toast:toast,profileIds:profiles.map(function(p){return p.id;})}):null,
        panel==='security'?React.createElement(PanelSecurity,{toast:toast}):null,
        panel==='files'?React.createElement(SystemBrowser,{toast:toast}):null,
        panel==='antfarm'?React.createElement(PanelAntfarm,{toast:toast}):null,
        panel==='code'?React.createElement(PanelDashboardCode,{toast:toast}):null,
        panel==='timeline'?React.createElement(PanelTimeline,{toast:toast}):null,
        panel==='news'?React.createElement(PanelNews,{toast:toast}):null)),
    React.createElement(Toast,{message:toastMsg,type:toastType}));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
