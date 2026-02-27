/* ============================================
   QuickClaw Dashboard — Shared Components
   AlertBanner, StatCard
   ============================================ */
function AlertBanner(){
  var[alerts,setAlerts]=useState([]);var[dismissed,setDismissed]=useState({});
  useEffect(function(){api('/alerts').then(function(d){setAlerts(d.alerts||[]);}).catch(function(){});var i=setInterval(function(){api('/alerts').then(function(d){setAlerts(d.alerts||[]);}).catch(function(){});},60000);return function(){clearInterval(i);};},[]);
  var visible=alerts.filter(function(_,i){return !dismissed[i];});
  if(!visible.length)return null;
  return React.createElement('div',null,visible.map(function(a,i){
    return React.createElement('div',{key:i,className:'alert-bar '+a.type},
      React.createElement('span',null,a.icon),
      React.createElement('span',{style:{flex:1}},a.message),
      React.createElement('button',{className:'btn-ghost',onClick:function(){var d=Object.assign({},dismissed);d[i]=true;setDismissed(d);},style:{color:'inherit',fontSize:16,border:'none',background:'none',cursor:'pointer'}},'✕')
    );
  }));
}

function StatCard({value,label,color,size}){return React.createElement('div',{className:'card',style:{padding:12,textAlign:'center'}},React.createElement('div',{className:'stat-val',style:{color:color,fontSize:size||22}},value),React.createElement('div',{className:'stat-lbl'},label));}
