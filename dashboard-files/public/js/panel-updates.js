/* QuickClaw Dashboard — Updates Panel */
function PanelUpdates({toast,profileIds}){
  var[cli,setCli]=useState(null);var[wsData,setWsData]=useState({});var[loading,setLoading]=useState('');var[updateOutput,setUpdateOutput]=useState(null);
  var checkCli=async function(){setLoading('cli');try{setCli(await api('/updates/cli'));}catch(e){toast('Failed to check: '+e.message,'error');}setLoading('');};
  useEffect(function(){checkCli();},[]);
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},React.createElement('h3',null,'🔄 Updates')),
    React.createElement('div',{className:'card',style:{padding:14,marginBottom:16}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
        React.createElement('div',null,React.createElement('b',null,'OpenClaw CLI'),
          cli?React.createElement('div',{className:'mono',style:{fontSize:12,color:'var(--dim)',marginTop:2}},'Current: '+cli.current+' · Latest: ',React.createElement('span',{style:{color:cli.updateAvailable?'var(--amber)':'var(--green)'}},cli.latest)):null),
        React.createElement('div',{style:{display:'flex',gap:6}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:checkCli,disabled:!!loading},loading==='cli'?React.createElement('span',{className:'spinner'}):'Check'),
          cli&&cli.updateAvailable?React.createElement('button',{className:'btn btn-sm btn-primary',disabled:loading==='upgrade',onClick:async function(){setLoading('upgrade');setUpdateOutput(null);try{
            var r=await api('/updates/cli/upgrade',{method:'POST'});
            if(r.ok){toast('Updated to '+r.version,'success');setUpdateOutput('Success: v'+r.version);}
            else{toast('Update may have failed','error');setUpdateOutput(r.error||r.output||'Unknown error');}
            checkCli();
          }catch(e){toast('Update failed: '+e.message,'error');setUpdateOutput('Error: '+e.message);}setLoading('');
          }},loading==='upgrade'?React.createElement('span',{className:'spinner'}):'Update'):null)),
      updateOutput?React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:10,padding:10,background:'var(--bg)',borderRadius:6,whiteSpace:'pre-wrap',maxHeight:100,overflow:'auto'}},updateOutput):null,
      loading==='upgrade'?React.createElement('div',{style:{marginTop:10,display:'flex',alignItems:'center',gap:8,color:'var(--amber)',fontSize:12}},React.createElement('span',{className:'spinner'}),' Installing openclaw@latest... this may take 1-2 minutes'):null),
    React.createElement('div',{className:'section-title'},React.createElement('h3',null,'Workspaces'),React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},'Click Check individually')),
    profileIds.map(function(id){return React.createElement('div',{key:id,className:'card',style:{padding:14,marginBottom:6}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
        React.createElement('div',null,React.createElement('b',null,id),
          wsData[id]&&wsData[id].isGit?React.createElement('span',{className:'badge',style:{marginLeft:6,color:'var(--purple)',background:'var(--purple-d)',fontSize:10}},'git:'+wsData[id].branch):null,
          wsData[id]&&wsData[id].dirty?React.createElement('span',{className:'badge',style:{marginLeft:4,color:'var(--amber)',background:'var(--amber-d)',fontSize:10}},'modified'):null,
          wsData[id]?React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)',marginTop:4}},wsData[id].lastCommit,wsData[id].behindBy>0?React.createElement('span',{style:{color:'var(--amber)'}},' · '+wsData[id].behindBy+' behind'):null):null),
        React.createElement('div',{style:{display:'flex',gap:6}},
          React.createElement('button',{className:'btn btn-sm btn-default',onClick:async function(){setLoading(id);var d={};d[id]=await api('/updates/workspace/'+id);setWsData(Object.assign({},wsData,d));setLoading('');},disabled:loading===id},loading===id?React.createElement('span',{className:'spinner'}):'Check'),
          wsData[id]&&wsData[id].isGit?React.createElement('button',{className:'btn btn-sm btn-default',onClick:async function(){await api('/updates/workspace/'+id+'/pull',{method:'POST'});toast(id+' pulled','success');}},'Pull'):null)));}));
}
