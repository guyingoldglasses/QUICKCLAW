/* QuickClaw Dashboard — Misc Panels (Timeline, Code, Keyboard Help) */
function KeyboardHelp({onClose}){
  return React.createElement('div',{className:'modal-overlay',onClick:onClose},
    React.createElement('div',{className:'modal',onClick:function(e){e.stopPropagation();},style:{maxWidth:400}},
      React.createElement('h3',{style:{marginBottom:16}},'⌨️ Keyboard Shortcuts'),
      [['1','Dashboard'],['2','Updates'],['3','Security'],['4','Antfarm'],['6','Dashboard Code'],['7','Timeline'],['8','News'],['r','Refresh'],['?','This help'],['Esc','Close modals']].map(function(x){
        return React.createElement('div',{key:x[0],style:{display:'flex',alignItems:'center',gap:12,marginBottom:8}},React.createElement('span',{className:'kbd'},x[0]),React.createElement('span',{style:{fontSize:13}},x[1]));}),
      React.createElement('div',{style:{marginTop:16,textAlign:'right'}},React.createElement('button',{className:'btn btn-sm btn-primary',onClick:onClose},'Got it'))));
}


function PanelTimeline({toast}){
  var[data,setData]=useState(null);var[loading,setLoading]=useState(false);
  var[snapshotLabel,setSnapshotLabel]=useState('');var[snapshotting,setSnapshotting]=useState(false);
  var[editingLabel,setEditingLabel]=useState(null);var[editLabelText,setEditLabelText]=useState('');
  useEffect(function(){loadVersions();},[]);
  function loadVersions(){setLoading(true);api('/versions').then(function(d){setData(d);setLoading(false);}).catch(function(){setLoading(false);});}
  function snapshot(markAsBase){
    if(!snapshotLabel.trim()){toast('Enter a label for this snapshot','error');return;}
    setSnapshotting(true);
    api('/versions/snapshot',{method:'POST',body:{label:snapshotLabel.trim(),markAsBase:!!markAsBase}}).then(function(r){
      toast('Snapshot saved: '+r.version.label,'success');setSnapshotLabel('');setSnapshotting(false);loadVersions();
    }).catch(function(e){toast(e.message,'error');setSnapshotting(false);});
  }
  function activate(id,label){
    if(!confirm('Switch to "'+label+'"? Current state will be auto-saved first.'))return;
    api('/versions/'+id+'/activate',{method:'POST'}).then(function(r){
      toast(r.message,'success');loadVersions();
      if(r.needsRestart&&confirm('Restart dashboard now to apply server changes?')){
        api('/dashboard/restart',{method:'POST'}).then(function(){toast('Restarting...','success');setTimeout(function(){window.location.reload();},5000);});
      }
    }).catch(function(e){toast(e.message,'error');});
  }
  function deleteVersion(id,label){
    if(!confirm('Delete version "'+label+'"? This cannot be undone.'))return;
    api('/versions/'+id,{method:'DELETE'}).then(function(){toast('Deleted','success');loadVersions();}).catch(function(e){toast(e.message,'error');});
  }
  function updateLabel(id){
    api('/versions/'+id,{method:'PUT',body:{label:editLabelText}}).then(function(){setEditingLabel(null);loadVersions();}).catch(function(e){toast(e.message,'error');});
  }
  function toggleBase(id,currentlyBase){
    api('/versions/'+id,{method:'PUT',body:{markAsBase:!currentlyBase}}).then(function(){loadVersions();toast(currentlyBase?'Unmarked as base':'Marked as base stable','success');}).catch(function(e){toast(e.message,'error');});
  }
  function fmtDate(iso){if(!iso)return'?';var d=new Date(iso);return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'⏳ Version Timeline'),
      React.createElement('button',{className:'btn btn-sm btn-default',onClick:loadVersions,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻')),
    React.createElement('div',{style:{padding:'12px 14px',marginBottom:16,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',fontSize:12,color:'var(--dim)',lineHeight:1.6}},
      'Snapshot the current dashboard state before making changes. Switch between versions to compare. The previous version and base stable are always preserved.'),
    React.createElement('div',{className:'card',style:{padding:16,marginBottom:16}},
      React.createElement('div',{style:{fontSize:14,fontWeight:700,marginBottom:12}},'📸 Create Snapshot'),
      React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
        React.createElement('input',{className:'input mono',value:snapshotLabel,onChange:function(e){setSnapshotLabel(e.target.value);},placeholder:'e.g. v2.1 — FTP + Code tabs',style:{flex:1,minWidth:200},onKeyDown:function(e){if(e.key==='Enter')snapshot(false);}}),
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){snapshot(false);},disabled:snapshotting},snapshotting?React.createElement('span',{className:'spinner'}):'💾 Save Snapshot'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){snapshot(true);},disabled:snapshotting,title:'Save and mark as the base stable version'},'🏛 Save as Base'))),
    loading&&!data?React.createElement('div',{style:{textAlign:'center',padding:30}},React.createElement('span',{className:'spinner'})):null,
    data&&data.versions.length===0?React.createElement('div',{className:'card',style:{padding:30,textAlign:'center',color:'var(--dim)'}},'No snapshots yet. Create your first one above!'):null,
    data&&data.versions.length>0?React.createElement('div',null,
      data.versions.slice().reverse().map(function(v){
        var isCurrent=data.current===v.id;
        var isBase=data.baseStable===v.id;
        return React.createElement('div',{key:v.id,className:'card',style:{padding:14,marginBottom:8,borderColor:isCurrent?'rgba(34,211,238,.3)':isBase?'rgba(52,211,153,.2)':'var(--border)',position:'relative'}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}},
            React.createElement('div',{style:{flex:1}},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}},
                editingLabel===v.id?React.createElement('div',{style:{display:'flex',gap:4,flex:1}},
                  React.createElement('input',{className:'input mono',value:editLabelText,onChange:function(e){setEditLabelText(e.target.value);},style:{flex:1,fontSize:12},onKeyDown:function(e){if(e.key==='Enter')updateLabel(v.id);if(e.key==='Escape')setEditingLabel(null);}}),
                  React.createElement('button',{className:'btn btn-xs btn-primary',onClick:function(){updateLabel(v.id);}},'✓'),
                  React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditingLabel(null);}},'✕')):
                React.createElement('span',{style:{fontWeight:700,fontSize:14,cursor:'pointer'},onClick:function(){setEditingLabel(v.id);setEditLabelText(v.label||v.id);},title:'Click to edit label'},v.label||v.id),
                isCurrent?React.createElement('span',{className:'badge',style:{color:'var(--accent)',background:'rgba(34,211,238,.1)',fontSize:10}},'● CURRENT'):null,
                isBase?React.createElement('span',{className:'badge',style:{color:'var(--green)',background:'var(--green-d)',fontSize:10}},'🏛 BASE'):null,
                v.isAuto?React.createElement('span',{className:'badge',style:{color:'var(--dim)',background:'var(--surface2)',fontSize:10}},'auto'):null),
              React.createElement('div',{className:'mono',style:{fontSize:11,color:'var(--dim)'}},
                fmtDate(v.timestamp),'  •  ',v.size||'?','  •  ',v.fileCount||'?',' files')),
            React.createElement('div',{style:{display:'flex',gap:4,flexShrink:0}},
              !isCurrent?React.createElement('button',{className:'btn btn-xs btn-primary',onClick:function(){activate(v.id,v.label||v.id);},title:'Switch to this version'},'↺ Activate'):null,
              React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){toggleBase(v.id,isBase);},title:isBase?'Unmark as base':'Mark as base stable'},isBase?'★':'☆'),
              React.createElement('a',{href:dlUrl('/versions/'+v.id+'/download'),className:'btn btn-xs btn-default',style:{textDecoration:'none'},title:'Download'},'⬇'),
              !isCurrent&&!isBase?React.createElement('button',{className:'btn btn-xs btn-danger',onClick:function(){deleteVersion(v.id,v.label||v.id);},title:'Delete'},'✕'):null)));
      })
    ):null);
}

function PanelDashboardCode({toast}){
  var[files,setFiles]=useState(null);var[loading,setLoading]=useState(false);
  var[viewing,setViewing]=useState(null);var[fileContent,setFileContent]=useState(null);
  var[editing,setEditing]=useState(false);var[editContent,setEditContent]=useState('');
  useEffect(function(){loadFiles();},[]);
  function loadFiles(){setLoading(true);api('/dashboard/files').then(function(d){setFiles(d.files||[]);setLoading(false);}).catch(function(){setLoading(false);});}
  function openFile(fp){setLoading(true);setEditing(false);
    api('/dashboard/file?path='+encodeURIComponent(fp)).then(function(d){
      setViewing(fp);setFileContent(d.content);setEditContent(d.content);setLoading(false);
    }).catch(function(e){toast('Read error','error');setLoading(false);});}
  function saveFile(){
    api('/dashboard/file',{method:'PUT',body:{filePath:viewing,content:editContent}}).then(function(){
      toast('Saved! (backup created)','success');setFileContent(editContent);setEditing(false);
    }).catch(function(e){toast(e.message,'error');});}
  function fmtSize(b){if(!b)return'0B';if(b>=1024)return(b/1024).toFixed(1)+'KB';return b+'B';}
  if(viewing&&fileContent!==null){
    var fname=viewing.split('/').pop();
    return React.createElement('div',null,
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setViewing(null);}},'← Back'),
          React.createElement('span',{style:{fontWeight:700,fontSize:14}},fname)),
        React.createElement('div',{style:{display:'flex',gap:6}},
          !editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(true);setEditContent(fileContent);}},'✏️ Edit'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-primary',onClick:saveFile},'💾 Save'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(false);}},'Cancel'):null)),
      editing?React.createElement('textarea',{value:editContent,onChange:function(e){setEditContent(e.target.value);},className:'mono',style:{width:'100%',minHeight:500,padding:14,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}):
      React.createElement('pre',{className:'mono',style:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:14,fontSize:12,lineHeight:1.7,maxHeight:'70vh',overflowY:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--text)'}},fileContent));}
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'💻 Dashboard Code'),
      React.createElement('div',{style:{display:'flex',gap:6}},
        React.createElement('a',{href:dlUrl('/dashboard/download'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},'⬇ Download All'),
        React.createElement('button',{className:'btn btn-sm btn-danger',onClick:async function(){if(!confirm('Restart the dashboard service? You will briefly lose connection.'))return;await api('/dashboard/restart',{method:'POST'});toast('Restarting... page will reload in 5s','success');setTimeout(function(){window.location.reload();},5000);}},'↻ Restart Dashboard'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:loadFiles,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻'))),
    React.createElement('div',{style:{padding:'10px 14px',marginBottom:16,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',fontSize:12,color:'var(--dim)'}},'Edit dashboard files directly. Backups are created automatically before each save. Restart the dashboard service to apply changes to server.js.'),
    loading&&!files?React.createElement('div',{style:{textAlign:'center',padding:30}},React.createElement('span',{className:'spinner'})):null,
    files?React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden'}},
      files.map(function(f){return React.createElement('div',{key:f.name,className:'file-item',onClick:function(){openFile(f.path);}},
        React.createElement('span',{style:{fontSize:16,width:24,textAlign:'center'}},f.ext==='.js'?'🟨':f.ext==='.html'?'🌐':f.ext==='.json'?'📋':'📄'),
        React.createElement('span',{style:{flex:1,fontWeight:600,color:'var(--accent)'}},f.name),
        React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},fmtSize(f.size)),
        React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},f.modified?f.modified.slice(0,10):''));})):null,
    React.createElement('div',{style:{marginTop:16}},
      React.createElement('div',{className:'section-title'},React.createElement('h3',null,'🔑 All API Keys')),
      React.createElement('a',{href:dlUrl('/env/download-all'),className:'btn btn-sm btn-default',style:{textDecoration:'none'}},'⬇ Download All Keys (.tar.gz)')));
}
