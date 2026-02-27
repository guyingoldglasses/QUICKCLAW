/* QuickClaw Dashboard — Security Panel */
function PanelSecurity({toast}){
  var[audit,setAudit]=useState(null);var[loading,setLoading]=useState(false);var[expanded,setExpanded]=useState(null);var[fixing,setFixing]=useState(null);
  var scan=async function(){setLoading(true);setAudit(await api('/security/audit'));setLoading(false);};
  useEffect(function(){scan();},[]);
  if(!audit)return React.createElement('div',{style:{textAlign:'center',padding:40}},React.createElement('span',{className:'spinner'}));
  var sc={pass:'✓',warn:'⚠',fail:'✕',info:'ℹ'};var clr={pass:'var(--green)',warn:'var(--amber)',fail:'var(--red)',info:'var(--accent)'};var bg={pass:'var(--green-d)',warn:'var(--amber-d)',fail:'var(--red-d)',info:'var(--accent-d)'};
  var categories=[];audit.checks.forEach(function(c){if(categories.indexOf(c.category)===-1)categories.push(c.category);});
  var doFix=async function(fixId,checkName){
    setFixing(fixId);
    try{var r=await api('/security/fix',{method:'POST',body:{fixId:fixId}});toast(r.message||'Fix applied','success');scan();}
    catch(e){toast(e.message||'Fix failed','error');}
    setFixing(null);
  };
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},React.createElement('h3',null,'🛡 Security Audit'),React.createElement('button',{className:'btn btn-sm btn-default',onClick:scan,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻ Re-scan')),
    React.createElement('div',{style:{display:'flex',gap:20,alignItems:'center',marginBottom:24,flexWrap:'wrap'}},
      React.createElement('div',{className:'score-ring',style:{border:'4px solid '+(audit.score>=80?'var(--green)':audit.score>=50?'var(--amber)':'var(--red)'),color:audit.score>=80?'var(--green)':audit.score>=50?'var(--amber)':'var(--red)'}},audit.score),
      React.createElement('div',{style:{display:'flex',gap:12}},
        [['pass','Passed'],['warn','Warn'],['fail','Fail'],['info','Info']].map(function(x){return React.createElement('div',{key:x[0],style:{textAlign:'center'}},React.createElement('div',{className:'mono',style:{fontSize:18,fontWeight:700,color:clr[x[0]]}},audit.summary[x[0]]),React.createElement('div',{style:{fontSize:10,color:'var(--dim)',textTransform:'uppercase'}},x[1]));}))),
    categories.map(function(cat){return React.createElement('div',{key:cat,style:{marginBottom:16}},
      React.createElement('div',{className:'mono',style:{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}},cat),
      React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden'}},
        audit.checks.filter(function(c){return c.category===cat;}).map(function(c,i){
          var isExp=expanded===cat+'-'+i;var canFix=c.status==='warn'||c.status==='fail';
          return React.createElement('div',{key:i,style:{borderBottom:'1px solid var(--border)'}},
            React.createElement('div',{style:{display:'flex',gap:10,padding:'12px 14px',alignItems:'flex-start',cursor:canFix?'pointer':'default'},onClick:function(){if(canFix)setExpanded(isExp?null:cat+'-'+i);}},
              React.createElement('div',{style:{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,background:bg[c.status],color:clr[c.status]}},sc[c.status]),
              React.createElement('div',{style:{flex:1}},
                React.createElement('div',{style:{display:'flex',alignItems:'center',gap:6}},
                  React.createElement('b',{style:{fontSize:13}},c.name),
                  React.createElement('span',{className:'badge',style:{color:clr[c.status],background:bg[c.status],fontSize:9}},c.severity)),
                React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:4}},c.detail)),
              canFix?React.createElement('span',{style:{color:'var(--dim)',fontSize:11,transition:'transform .2s',transform:isExp?'rotate(90deg)':'rotate(0)',flexShrink:0}},'▶'):null),
            isExp?React.createElement('div',{style:{padding:'0 14px 14px 48px'}},
              React.createElement('div',{style:{padding:12,background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}},
                React.createElement('div',{style:{fontSize:12,fontWeight:600,marginBottom:6,color:clr[c.status]}},'What this means'),
                React.createElement('div',{style:{fontSize:12,color:'var(--dim)',lineHeight:1.6,marginBottom:10}},c.explanation||'This check detected a potential security concern. Review the details above and consider applying the recommended fix.'),
                c.fixId?React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center'}},
                  React.createElement('button',{className:'btn btn-sm btn-primary',disabled:fixing===c.fixId,onClick:function(e){e.stopPropagation();doFix(c.fixId,c.name);}},fixing===c.fixId?React.createElement('span',{className:'spinner'}):'🔧 Auto-Fix'),
                  React.createElement('span',{style:{fontSize:11,color:'var(--dim)'}},c.fixDesc||'')):
                c.manualFix?React.createElement('div',null,
                  React.createElement('div',{style:{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4}},'Manual fix:'),
                  React.createElement('pre',{className:'mono',style:{fontSize:11,padding:8,background:'var(--surface)',borderRadius:6,color:'var(--text)',whiteSpace:'pre-wrap'}},c.manualFix)):
                React.createElement('div',{style:{fontSize:11,color:'var(--dim)',fontStyle:'italic'}},'No auto-fix available. Review your server configuration manually.'))):null);})
      ));}));
}
