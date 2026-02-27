/* QuickClaw Dashboard — File Browser Components */
function SystemBrowser({toast}){
  var[roots,setRoots]=useState(null);var[dir,setDir]=useState(null);var[items,setItems]=useState([]);
  var[parent,setParent]=useState(null);var[loading,setLoading]=useState(false);
  var[viewing,setViewing]=useState(null);var[fileContent,setFileContent]=useState(null);
  var[editing,setEditing]=useState(false);var[editContent,setEditContent]=useState('');
  var extIcons={'.json':'📋','.md':'📝','.txt':'📄','.js':'🟨','.sh':'🔧','.env':'🔑','.py':'🐍','.html':'🌐','.yml':'⚙','.yaml':'⚙','.log':'📊','.conf':'⚙','.service':'⚙','.ini':'⚙'};
  function fi(item){if(item.isDir)return '📁';return extIcons[item.ext]||'📄';}
  function fmtSz(b){if(!b)return'0B';if(b>=1048576)return(b/1048576).toFixed(1)+'MB';if(b>=1024)return(b/1024).toFixed(1)+'KB';return b+'B';}
  useEffect(function(){loadRoots();},[]);
  function loadRoots(){setLoading(true);setDir(null);setViewing(null);
    api('/system/browse').then(function(d){setRoots(d.roots||[]);setItems([]);setLoading(false);}).catch(function(){setLoading(false);});}
  function browse(d){setLoading(true);setViewing(null);setEditing(false);
    api('/system/browse?dir='+encodeURIComponent(d)).then(function(r){
      setDir(d);setItems(r.items||[]);setParent(r.parent);setLoading(false);
    }).catch(function(e){toast('Browse error','error');setLoading(false);});}
  function openFile(fp){setLoading(true);setEditing(false);
    api('/system/readfile?path='+encodeURIComponent(fp)).then(function(r){
      if(r.binary){toast('Binary file','info');setLoading(false);return;}
      setViewing(fp);setFileContent(r.content);setEditContent(r.content||'');setLoading(false);
    }).catch(function(e){toast('Read error','error');setLoading(false);});}
  function saveFile(){
    api('/system/writefile',{method:'PUT',body:{filePath:viewing,content:editContent}}).then(function(){
      toast('Saved!','success');setFileContent(editContent);setEditing(false);
    }).catch(function(e){toast(e.message,'error');});}
  if(viewing&&fileContent!==null){
    var fname=viewing.split('/').pop();var canWrite=viewing.startsWith('/home/');
    return React.createElement('div',null,
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setViewing(null);if(dir)browse(dir);}},'← Back'),
          React.createElement('span',{style:{fontWeight:700,fontSize:14}},fname),
          !canWrite?React.createElement('span',{className:'badge',style:{color:'var(--amber)',background:'var(--amber-d)',fontSize:9}},'READ-ONLY'):null),
        React.createElement('div',{style:{display:'flex',gap:6}},
          canWrite&&!editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(true);setEditContent(fileContent);}},'✏️ Edit'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-primary',onClick:saveFile},'💾 Save'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(false);}},'Cancel'):null)),
      editing?React.createElement('textarea',{value:editContent,onChange:function(e){setEditContent(e.target.value);},className:'mono',style:{width:'100%',minHeight:450,padding:14,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}):
      React.createElement('pre',{className:'mono',style:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:14,fontSize:12,lineHeight:1.7,maxHeight:'65vh',overflowY:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--text)'}},fileContent));}
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'🗂 System Files'),
      React.createElement('button',{className:'btn btn-sm btn-default',onClick:dir?function(){browse(dir);}:loadRoots},loading?React.createElement('span',{className:'spinner'}):'↻')),
    loading&&!items.length&&!roots?React.createElement('div',{style:{textAlign:'center',padding:30}},React.createElement('span',{className:'spinner'})):null,
    !dir&&roots?React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}},
      roots.map(function(r){return React.createElement('div',{key:r.label,className:'card card-click',style:{padding:16},onClick:function(){browse(r.path);}},
        React.createElement('div',{style:{fontSize:24,marginBottom:8}},r.label.includes('Home')?'🏠':r.label.includes('Nginx')?'🌐':r.label.includes('SSL')?'🔒':'📁'),
        React.createElement('div',{style:{fontWeight:700,fontSize:14,marginBottom:4}},r.label),
        React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)',wordBreak:'break-all'}},r.path));})):null,
    dir?React.createElement('div',null,
      React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:8}},
        React.createElement('span',{style:{cursor:'pointer',color:'var(--accent)'},onClick:loadRoots},'🏠'),
        ' / ',dir.split('/').filter(Boolean).slice(-3).join(' / ')),
      React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden'}},
        parent?React.createElement('div',{className:'file-item',style:{color:'var(--accent)'},onClick:function(){browse(parent);}},'📁 ..'):null,
        items.length===0?React.createElement('div',{style:{padding:20,textAlign:'center',color:'var(--dim)'}},'Empty'):
        items.map(function(item){return React.createElement('div',{key:item.name,className:'file-item',onClick:function(){if(item.isDir)browse(item.path);else openFile(item.path);}},
          React.createElement('span',{style:{fontSize:16,width:24,textAlign:'center'}},fi(item)),
          React.createElement('span',{style:{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',fontWeight:item.isDir?600:400,color:item.isDir?'var(--accent)':'var(--text)'}},item.name),
          !item.isDir?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)',flexShrink:0}},fmtSz(item.size)):null);}))):null);
}

function FileBrowser({profileId,toast}){
  var[roots,setRoots]=useState(null);var[dir,setDir]=useState(null);var[items,setItems]=useState([]);
  var[parent,setParent]=useState(null);var[loading,setLoading]=useState(false);
  var[viewing,setViewing]=useState(null);var[fileContent,setFileContent]=useState(null);
  var[editing,setEditing]=useState(false);var[editContent,setEditContent]=useState('');
  var extIcons={'.json':'📋','.md':'📝','.txt':'📄','.js':'🟨','.sh':'🔧','.env':'🔑','.py':'🐍','.html':'🌐','.yml':'⚙','.yaml':'⚙','.log':'📊'};
  function fileIcon(item){if(item.isDir)return '📁';return extIcons[item.ext]||'📄';}
  function fmtSize(b){if(!b)return'0B';if(b>=1048576)return(b/1048576).toFixed(1)+'MB';if(b>=1024)return(b/1024).toFixed(1)+'KB';return b+'B';}
  useEffect(function(){loadRoots();},[profileId]);
  function loadRoots(){setLoading(true);setDir(null);setViewing(null);
    api('/profiles/'+profileId+'/browse').then(function(d){setRoots(d.roots||[]);setItems([]);setLoading(false);}).catch(function(){setLoading(false);});}
  function browse(d){setLoading(true);setViewing(null);setEditing(false);
    api('/profiles/'+profileId+'/browse?dir='+encodeURIComponent(d)).then(function(r){
      setDir(d);setItems(r.items||[]);setParent(r.parent);setLoading(false);
    }).catch(function(e){toast('Browse error','error');setLoading(false);});}
  function openFile(fp){setLoading(true);setEditing(false);
    api('/profiles/'+profileId+'/readfile?path='+encodeURIComponent(fp)).then(function(r){
      if(r.binary){toast('Binary file ('+r.ext+')','info');setLoading(false);return;}
      setViewing(fp);setFileContent(r.content);setEditContent(r.content||'');setLoading(false);
    }).catch(function(e){toast('Read error','error');setLoading(false);});}
  function saveFile(){
    api('/profiles/'+profileId+'/writefile',{method:'PUT',body:{filePath:viewing,content:editContent}}).then(function(){
      toast('Saved!','success');setFileContent(editContent);setEditing(false);
    }).catch(function(e){toast(e.message,'error');});}
  function deleteItem(fp,isDir){
    if(!confirm('Delete '+(isDir?'folder':'file')+': '+fp.split('/').pop()+'?'))return;
    api('/profiles/'+profileId+'/deletefile?path='+encodeURIComponent(fp),{method:'DELETE'}).then(function(){
      toast('Moved to trash','success');if(viewing===fp)setViewing(null);if(dir)browse(dir);
    }).catch(function(e){toast(e.message,'error');});}
  if(viewing&&fileContent!==null){
    var fname=viewing.split('/').pop();
    return React.createElement('div',null,
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setViewing(null);if(dir)browse(dir);}},'← Back'),
          React.createElement('span',{style:{fontWeight:700,fontSize:14}},fname)),
        React.createElement('div',{style:{display:'flex',gap:6}},
          !editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(true);setEditContent(fileContent);}},'✏️ Edit'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-primary',onClick:saveFile},'💾 Save'):null,
          editing?React.createElement('button',{className:'btn btn-xs btn-default',onClick:function(){setEditing(false);}},'Cancel'):null,
          React.createElement('button',{className:'btn btn-xs btn-danger',onClick:function(){deleteItem(viewing,false);}},'🗑'))),
      editing?React.createElement('textarea',{value:editContent,onChange:function(e){setEditContent(e.target.value);},className:'mono',style:{width:'100%',minHeight:450,padding:14,background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,lineHeight:1.7,resize:'vertical'}}):
      React.createElement('pre',{className:'mono',style:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:14,fontSize:12,lineHeight:1.7,maxHeight:'65vh',overflowY:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--text)'}},fileContent));}
  return React.createElement('div',null,
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'📁 File Browser'),
      React.createElement('button',{className:'btn btn-sm btn-default',onClick:dir?function(){browse(dir);}:loadRoots},loading?React.createElement('span',{className:'spinner'}):'↻')),
    loading&&!items.length&&!roots?React.createElement('div',{style:{textAlign:'center',padding:30}},React.createElement('span',{className:'spinner'})):null,
    !dir&&roots?React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}},
      roots.map(function(r){return React.createElement('div',{key:r.label,className:'card card-click',style:{padding:16},onClick:function(){browse(r.path);}},
        React.createElement('div',{style:{fontSize:24,marginBottom:8}},r.label==='config'?'⚙':r.label==='workspace'?'💼':'🦞'),
        React.createElement('div',{style:{fontWeight:700,fontSize:14,marginBottom:4}},r.label),
        React.createElement('div',{className:'mono',style:{fontSize:10,color:'var(--dim)',wordBreak:'break-all'}},r.path));})):null,
    dir?React.createElement('div',null,
      React.createElement('div',{style:{fontSize:12,color:'var(--dim)',marginBottom:8}},
        React.createElement('span',{style:{cursor:'pointer',color:'var(--accent)'},onClick:loadRoots},'🏠'),
        ' / ',dir.split('/').filter(Boolean).slice(-3).join(' / ')),
      React.createElement('div',{className:'card',style:{padding:0,overflow:'hidden'}},
        parent&&dir!==parent?React.createElement('div',{className:'file-item',style:{color:'var(--accent)'},onClick:function(){browse(parent);}},'📁 ..'):null,
        items.length===0?React.createElement('div',{style:{padding:20,textAlign:'center',color:'var(--dim)'}},'Empty directory'):
        items.map(function(item){return React.createElement('div',{key:item.name,className:'file-item',onClick:function(){if(item.isDir)browse(item.path);else openFile(item.path);}},
          React.createElement('span',{style:{fontSize:16,width:24,textAlign:'center'}},fileIcon(item)),
          React.createElement('span',{style:{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',fontWeight:item.isDir?600:400,color:item.isDir?'var(--accent)':'var(--text)'}},item.name),
          !item.isDir?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)',flexShrink:0}},fmtSize(item.size)):null,
          React.createElement('button',{className:'btn-ghost',style:{color:'var(--red)',fontSize:12},onClick:function(e){e.stopPropagation();deleteItem(item.path,item.isDir);}},'✕'));}))):null);
}
