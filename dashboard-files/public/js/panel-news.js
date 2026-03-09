/* QuickClaw Dashboard — News Panel */
function PanelNews({toast}){
  var[news,setNews]=useState(null);var[loading,setLoading]=useState(false);var[fetching,setFetching]=useState(false);
  var[view,setView]=useState('all');var[bookmarks,setBookmarks]=useState([]);var[qualityList,setQualityList]=useState([]);
  var[showSources,setShowSources]=useState(false);var[sources,setSources]=useState({});var[newsSearch,setNewsSearch]=useState('');
  var load=function(){setLoading(true);api('/news').then(function(d){setNews(d);if(d.prefs)setSources(d.prefs.sources||{});setLoading(false);}).catch(function(){setLoading(false);});};
  var loadBookmarks=function(){api('/news/bookmarks').then(function(d){setBookmarks(d.bookmarks||[]);}).catch(function(){});};
  var loadQuality=function(){api('/news/quality').then(function(d){setQualityList(d.articles||[]);}).catch(function(){});};
  useEffect(function(){load();loadBookmarks();loadQuality();},[]);
  var fetchNews=async function(random){setFetching(true);try{var d=await api('/news/fetch',{method:'POST',body:{random:!!random}});setNews(d);toast('Fetched '+d.fetchCount+' articles'+(random?' (random)':''),'success');load();}catch(e){toast('Fetch failed','error');}setFetching(false);};
  var feedback=async function(url,action,e){if(e)e.stopPropagation();try{await api('/news/feedback',{method:'POST',body:{url:url,action:action}});load();loadBookmarks();loadQuality();toast(action==='delete'?'Removed':action,'success');}catch(er){toast('Failed','error');}};
  var saveSources=async function(s){setSources(s);try{await api('/news/sources',{method:'PUT',body:{sources:s}});toast('Sources updated','success');}catch(e){toast('Failed','error');}};
  function timeAgo(d){if(!d)return'';var s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d';}
  var srcLabels={hn_ai:'HN: AI/ML',hn_openclaw:'HN: OpenClaw',hn_agents:'HN: AI Agents',hn_llm:'HN: LLM Dev',github:'GitHub Trending',reddit_ai:'Reddit: AI',arxiv:'arXiv Papers',techcrunch:'HN: Startups'};
  function renderArticle(a,i,showFeedback){
    var srcLink=a.hnLink?{href:a.hnLink,label:'HN'}:a.redditLink?{href:a.redditLink,label:'Reddit'}:a.isRepo?{href:a.url,label:'GH'}:a.isPaper?{href:a.url,label:'arXiv'}:null;
    return React.createElement('div',{key:a.url||i,className:'card',style:{padding:14,borderLeft:'3px solid '+(a.isRepo?'var(--purple)':a.isPaper?'var(--blue)':(a.source||'').includes('OpenClaw')?'var(--green)':(a.source||'').includes('Reddit')?'var(--amber)':'var(--accent)'),marginBottom:6,cursor:'pointer',opacity:a.isUseless?.5:1},onClick:function(){window.open(a.url,'_blank');}},
      React.createElement('div',{style:{flex:1,minWidth:0}},
        React.createElement('div',{style:{fontSize:13,fontWeight:600,lineHeight:1.4,marginBottom:4}},a.title),
        React.createElement('div',{style:{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}},
          React.createElement('span',{className:'badge',style:{fontSize:9,color:a.isRepo?'var(--purple)':a.isPaper?'var(--blue)':'var(--accent)',background:a.isRepo?'var(--purple-d)':a.isPaper?'var(--blue-d)':'var(--accent-d)'}},a.source),
          a.author?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},a.author):null,
          a.points?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--amber)'}},a.points+(a.isRepo?' ★':' pts')):null,
          a.comments?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},a.comments+' cmt'):null,
          a.date?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},timeAgo(a.date)):null,
          a.boosted?React.createElement('span',{className:'badge',style:{fontSize:8,color:'var(--amber)',background:'var(--amber-d)'}},'★ Boosted'):null)),
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8},onClick:function(e){e.stopPropagation();}},
        showFeedback!==false?React.createElement('div',{style:{display:'flex',gap:2,alignItems:'center'}},
          React.createElement('button',{className:'btn btn-ghost',style:{color:a.isQuality?'var(--green)':'var(--dim)',padding:'2px 4px'},title:'Quality',onClick:function(e){feedback(a.url,a.isQuality?'unquality':'quality',e);}},IC('thumbsUp',14)),
          React.createElement('button',{className:'btn btn-ghost',style:{color:a.isUseless?'var(--red)':'var(--dim)',padding:'2px 4px'},title:'Useless',onClick:function(e){feedback(a.url,a.isUseless?'unuseless':'useless',e);}},IC('thumbsDown',14)),
          React.createElement('button',{className:'btn btn-ghost',style:{color:a.isBookmarked?'var(--amber)':'var(--dim)',padding:'2px 4px'},title:'Bookmark',onClick:function(e){feedback(a.url,a.isBookmarked?'unbookmark':'bookmark',e);}},IC('bookmark',14)),
          navigator.share?React.createElement('button',{className:'btn btn-ghost',style:{color:'var(--dim)',padding:'2px 4px'},title:'Share',onClick:function(e){e.stopPropagation();navigator.share({title:a.title,url:a.url}).catch(function(){});}},IC('share',14)):null,
          React.createElement('button',{className:'btn btn-ghost',style:{color:'var(--dim)',padding:'2px 4px'},title:'Remove',onClick:function(e){feedback(a.url,'delete',e);}},IC('trash2',14))):React.createElement('div',null),
        srcLink?React.createElement('a',{href:srcLink.href,target:'_blank',onClick:function(e){e.stopPropagation();},className:'btn btn-xs btn-default',style:{textDecoration:'none'}},srcLink.label):null));
  }
  return React.createElement('div',null,
    React.createElement('div',{className:'news-sticky'},
    React.createElement('div',{className:'section-title'},
      React.createElement('h3',null,'AI & OpenClaw News'),
      React.createElement('div',{style:{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}},
        news&&news.lastFetched?React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},timeAgo(news.lastFetched)+' ago'):null,
        React.createElement('button',{className:'btn btn-sm btn-primary',onClick:function(){fetchNews(false);},disabled:fetching},fetching?React.createElement('span',{className:'spinner'}):'Fetch'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){fetchNews(true);},disabled:fetching,title:'Fetch without preference weighting'},'🎲 Random'),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:function(){setShowSources(!showSources);},title:'Configure sources'},IC('filter',12)),
        React.createElement('button',{className:'btn btn-sm btn-default',onClick:load,disabled:loading},loading?React.createElement('span',{className:'spinner'}):'↻'))),
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}},
      React.createElement('div',{style:{display:'flex',gap:4,flexWrap:'wrap'}},
        [['all','All'],['quality','★ Quality'],['bookmarks','🔖 Saved']].map(function(v){return React.createElement('button',{key:v[0],className:'btn btn-sm '+(view===v[0]?'btn-primary':'btn-default'),onClick:function(){setView(v[0]);if(v[0]==='bookmarks')loadBookmarks();if(v[0]==='quality')loadQuality();}},v[1]);})),
      React.createElement('div',{style:{display:'flex',gap:4}},
        React.createElement('button',{className:'btn btn-xs btn-default',title:'Download articles as JSON',onClick:function(){var arts=(news&&news.articles)||[];var blob=new Blob([JSON.stringify(arts,null,2)],{type:'application/json'});var u=URL.createObjectURL(blob);var a=document.createElement('a');a.href=u;a.download='openclaw-news-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(u);toast('Downloaded '+arts.length+' articles','success');}},IC('downloadCloud',12),' ⬇'),
        React.createElement('button',{className:'btn btn-xs btn-default',title:'Upload articles JSON to restore',onClick:function(){var inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=async function(ev){var file=ev.target.files[0];if(!file)return;try{var txt=await file.text();var arts=JSON.parse(txt);if(!Array.isArray(arts)){toast('Invalid format — expected array','error');return;}var existing=news&&news.articles||[];var merged=[].concat(arts,existing);var seen=new Set();merged=merged.filter(function(a){if(!a.url||seen.has(a.url))return false;seen.add(a.url);return true;});await api('/news',{method:'PUT',body:{articles:merged}});toast('Restored '+arts.length+' articles','success');load();}catch(er){toast('Upload failed: '+er.message,'error');}};inp.click();}},IC('upload',12),' ⬆'))),
    React.createElement('div',{className:'search-wrap'},
      React.createElement('input',{className:'input',placeholder:'Search articles…',value:newsSearch,onChange:function(e){setNewsSearch(e.target.value);},style:{fontSize:12}}),
      newsSearch?React.createElement('button',{className:'clear-x',onClick:function(){setNewsSearch('');}},'✕'):null),
    showSources?React.createElement('div',{className:'card',style:{padding:14,marginBottom:12}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}},
        React.createElement('div',{style:{fontSize:13,fontWeight:600}},'News Sources'),
        React.createElement('button',{className:'btn btn-xs btn-primary',onClick:function(){var url=prompt('Enter RSS feed URL or website URL:');if(!url)return;var name=prompt('Short name for this source:','Custom');if(!name)return;var s=Object.assign({},sources);s['custom_'+Date.now()]={url:url,name:name};saveSources(s);toast('Source added! Will be used on next fetch.','success');}},'+  Add Source')),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}},
        Object.entries(srcLabels).concat(Object.entries(sources).filter(function(e){return e[0].startsWith('custom_')&&e[1]&&typeof e[1]==='object';}).map(function(e){return[e[0],e[1].name||e[0]];})).map(function(e){var k=e[0],label=e[1];var isCustom=k.startsWith('custom_');return React.createElement('div',{key:k,style:{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'var(--bg)',borderRadius:6,border:'1px solid '+(isCustom?'rgba(196,181,253,.2)':'var(--border)')}},
          React.createElement('button',{className:'toggle '+((isCustom?sources[k]!==false:sources[k]!==false)?'on':'off'),style:{transform:'scale(.65)'},onClick:function(){var s=Object.assign({},sources);if(isCustom){s[k]=sources[k]===false?sources[k]:false;}else{s[k]=sources[k]===false?true:false;}saveSources(s);}},React.createElement('div',{className:'toggle-dot'})),
          React.createElement('span',{style:{fontSize:12,color:isCustom?'var(--purple)':'inherit'}},label),
          isCustom?React.createElement('button',{className:'btn btn-ghost',style:{padding:'0 2px',color:'var(--red)',fontSize:10,marginLeft:'auto'},title:'Remove custom source',onClick:function(){if(!confirm('Remove source "'+label+'"?'))return;var s=Object.assign({},sources);delete s[k];saveSources(s);}},IC('trash2',10)):null);})),
      React.createElement('div',{style:{marginTop:8,fontSize:11,color:'var(--dim)'}},'Toggle sources on/off to customize your news feed. Changes apply on next fetch.')):null,
    ),
    view==='all'?React.createElement(React.Fragment,null,
      loading&&!news?React.createElement('div',{style:{textAlign:'center',padding:40}},React.createElement('span',{className:'spinner'})):null,
      news&&(!news.articles||news.articles.length===0)?React.createElement('div',{className:'card',style:{padding:30,textAlign:'center'}},
        React.createElement('div',{style:{fontSize:32,marginBottom:8}},IC('rss',32)),
        React.createElement('div',{style:{color:'var(--dim)',marginBottom:8}},'No news articles yet'),
        React.createElement('div',{style:{fontSize:12,color:'var(--muted)'}},'Click Fetch to pull the latest articles')):null,
      news&&news.articles&&news.articles.length>0?React.createElement('div',null,
        news.isRandom?React.createElement('div',{style:{padding:'8px 12px',marginBottom:10,background:'var(--amber-d)',borderRadius:8,border:'1px solid rgba(251,191,36,.2)',fontSize:12,color:'var(--amber)'}},'🎲 Random fetch — preference weighting was skipped for this batch'):null,
        news.articles.filter(function(a){if(!newsSearch)return true;var q=newsSearch.toLowerCase();return(a.title||'').toLowerCase().includes(q)||(a.source||'').toLowerCase().includes(q)||(a.author||'').toLowerCase().includes(q);}).map(function(a,i){return renderArticle(a,i,true);})):null):null,
    view==='bookmarks'?React.createElement('div',null,
      bookmarks.length===0?React.createElement('div',{className:'card',style:{padding:30,textAlign:'center',color:'var(--dim)'}},'No bookmarked articles yet. Click 🔖 on articles to save them.'):
      bookmarks.map(function(b,i){return React.createElement('div',{key:i,className:'card',style:{padding:14,marginBottom:6,cursor:'pointer',borderLeft:'3px solid var(--amber)'},onClick:function(){window.open(b.url,'_blank');}},
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
          React.createElement('div',{style:{flex:1,minWidth:0}},
            React.createElement('div',{style:{fontSize:13,fontWeight:600}},b.title),
            React.createElement('div',{style:{display:'flex',gap:6,marginTop:4}},
              b.source?React.createElement('span',{className:'badge',style:{fontSize:9,color:'var(--accent)',background:'var(--accent-d)'}},b.source):null,
              React.createElement('span',{className:'mono',style:{fontSize:10,color:'var(--dim)'}},'Saved '+timeAgo(b.savedAt)+' ago'))),
          React.createElement('button',{className:'btn btn-ghost',style:{color:'var(--red)'},onClick:function(e){e.stopPropagation();feedback(b.url,'unbookmark',e);}},IC('trash2',14))));})):null,
    view==='quality'?React.createElement('div',null,
      qualityList.length===0?React.createElement('div',{className:'card',style:{padding:30,textAlign:'center',color:'var(--dim)'}},'No quality-marked articles yet. Click 👍 on articles to mark them.'):
      qualityList.filter(function(a){if(!newsSearch)return true;var q=newsSearch.toLowerCase();return(a.title||'').toLowerCase().includes(q)||(a.source||'').toLowerCase().includes(q);}).map(function(a,i){return renderArticle(a,i,true);})):null);
}
