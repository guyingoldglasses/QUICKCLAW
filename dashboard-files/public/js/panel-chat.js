/* ============================================
   QuickClaw Dashboard — Chat Panel v2
   Smart onboarding + live chat interface
   ============================================ */

// ─── Onboarding Guide Content ───
var GUIDES = {
  apiKey: {
    title: 'Connect an AI Model',
    subtitle: 'Choose how you want to power your bot',
    steps: [
      {
        id: 'openai',
        icon: '🟢',
        title: 'OpenAI (GPT-4o, GPT-4)',
        steps: [
          'Go to <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent)">platform.openai.com/api-keys</a>',
          'Click <b>"Create new secret key"</b>',
          'Copy the key (starts with <code style="background:var(--bg);padding:2px 6px;border-radius:4px">sk-</code>)',
          'Paste it below and click Save'
        ],
        placeholder: 'sk-...',
        provider: 'openai'
      },
      {
        id: 'anthropic',
        icon: '🟣',
        title: 'Anthropic (Claude)',
        steps: [
          'Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--accent)">console.anthropic.com/settings/keys</a>',
          'Click <b>"Create Key"</b>',
          'Copy the key (starts with <code style="background:var(--bg);padding:2px 6px;border-radius:4px">sk-ant-</code>)',
          'Paste it below and click Save'
        ],
        placeholder: 'sk-ant-...',
        provider: 'anthropic'
      },
      {
        id: 'oauth',
        icon: '🔐',
        title: 'OpenAI OAuth (Free — No API Key Needed)',
        steps: [
          'Go to the <b>Profile</b> tab in the sidebar',
          'Click on your profile, then open the <b>Auth</b> sub-tab',
          'Click <b>"Start OAuth Login"</b>',
          'Sign in with your OpenAI account — free tier works!',
          'Come back here — you\'re all set!'
        ],
        provider: 'oauth'
      }
    ]
  },
  telegram: {
    title: 'Chat on Your Phone via Telegram',
    subtitle: 'Takes about 2 minutes to set up',
    hasInput: true,
    inputProvider: 'telegram',
    inputPlaceholder: '123456789:ABCdef...',
    inputLabel: '\uD83D\uDC47 Paste your bot token from BotFather here:',
    steps: [
      'Open <b>Telegram</b> on your phone (free from App Store / Play Store)',
      'Search for <b>@BotFather</b> and open a chat with it',
      'Send the command <code style="background:var(--bg);padding:2px 6px;border-radius:4px">/newbot</code>',
      'Choose a <b>name</b> and a <b>username</b> ending in "bot"',
      'BotFather gives you a <b>bot token</b> \u2014 copy it!'
    ],
    postSaveSteps: [
      { icon: '\u2705', text: '<b>Token saved</b> and gateway is restarting...' },
      { icon: '1\uFE0F\u20E3', text: 'Open <b>Telegram</b> and search for your bot by the username you just created' },
      { icon: '2\uFE0F\u20E3', text: 'Tap <b>Start</b> (or send <code style="background:var(--bg);padding:2px 6px;border-radius:4px">/start</code>) to activate your bot' },
      { icon: '3\uFE0F\u20E3', text: 'Type a message like <b>"Hello!"</b> \u2014 your AI should reply within a few seconds' },
      { icon: '\uD83D\uDCA1', text: 'If the bot doesn\u2019t reply, wait 10\u201315 seconds for the gateway to fully restart, then try again' }
    ],
    afterSaveNote: null  // We'll use postSaveSteps instead
  },
  voice: {
    title: '\uD83C\uDF99\uFE0F Voice Chat Setup',
    subtitle: 'Talk to your bot with your actual voice',
    steps: [
      'Tap the <b>microphone icon</b> \uD83C\uDF99\uFE0F in your bot\u2019s Telegram chat',
      'Hold to record your message, then release to send',
      'Your bot will <b>transcribe</b> your voice and reply'
    ],
    hasVoiceReplySetup: true,
    afterStepNote: '\uD83D\uDCAA Pin your bot to Telegram\u2019s home screen for instant voice access!'
  },

  // ── Developer Integrations ──
  github: {
    title: '\uD83D\uDC19 GitHub Setup',
    subtitle: 'Let your bot push code and manage repos',
    isIntegration: true,
    integrationType: 'github',
    steps: [
      'Go to <a href="https://github.com/settings/tokens" target="_blank" style="color:var(--accent)">github.com/settings/tokens</a>',
      'Click <b>Generate new token</b> (classic) \u2192 select <b>repo</b> scope',
      'Copy the token and paste it below'
    ],
    inputs: [
      {key:'token', label:'Personal Access Token', placeholder:'ghp_xxxxxxxxxxxx', type:'password', required:true},
      {key:'username', label:'GitHub Username (optional)', placeholder:'your-username', type:'text'}
    ]
  },
  vercel: {
    title: '\u25B2 Vercel Setup',
    subtitle: 'Deploy websites and apps instantly',
    isIntegration: true,
    integrationType: 'vercel',
    steps: [
      'Go to <a href="https://vercel.com/account/tokens" target="_blank" style="color:var(--accent)">vercel.com/account/tokens</a>',
      'Click <b>Create Token</b> \u2192 name it "QuickClaw"',
      'Copy the token and paste it below'
    ],
    inputs: [
      {key:'token', label:'Vercel API Token', placeholder:'your-vercel-token', type:'password', required:true}
    ]
  },
  ftp: {
    title: '\uD83D\uDCC1 FTP / SFTP Setup',
    subtitle: 'Upload files directly to your web server',
    isIntegration: true,
    integrationType: 'ftp',
    steps: [
      'Get your FTP credentials from your <b>hosting provider</b> (cPanel, SiteGround, etc.)',
      'Usually found under <b>FTP Accounts</b> or <b>File Manager</b> settings',
      'Enter the connection details below'
    ],
    inputs: [
      {key:'host', label:'FTP Host', placeholder:'ftp.yourdomain.com', type:'text', required:true},
      {key:'port', label:'Port', placeholder:'21', type:'text', defaultValue:'21'},
      {key:'username', label:'Username', placeholder:'user@yourdomain.com', type:'text', required:true},
      {key:'password', label:'Password', placeholder:'your-ftp-password', type:'password', required:true}
    ]
  },
  email: {
    title: '\u2709\uFE0F Email / SMTP Setup',
    subtitle: 'Send emails from your bot',
    isIntegration: true,
    integrationType: 'email',
    steps: [
      '<b>Gmail:</b> Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:var(--accent)">Google App Passwords</a> \u2192 create an app password',
      '<b>Other:</b> Get SMTP details from your email provider',
      '<b>Gmail SMTP:</b> Host: <code>smtp.gmail.com</code>, Port: <code>587</code>'
    ],
    inputs: [
      {key:'host', label:'SMTP Host', placeholder:'smtp.gmail.com', type:'text', required:true},
      {key:'port', label:'Port', placeholder:'587', type:'text', defaultValue:'587'},
      {key:'username', label:'Email Address', placeholder:'you@gmail.com', type:'text', required:true},
      {key:'password', label:'Password / App Password', placeholder:'your-app-password', type:'password', required:true}
    ]
  },
  slack: {
    title: '\uD83D\uDCAC Slack Setup',
    subtitle: 'Chat with your bot in Slack',
    isIntegration: true,
    integrationType: 'slack',
    steps: [
      'Go to <a href="https://api.slack.com/apps" target="_blank" style="color:var(--accent)">api.slack.com/apps</a> \u2192 <b>Create New App</b>',
      'Under <b>OAuth & Permissions</b>, add scopes: <code>chat:write</code>, <code>channels:read</code>, <code>im:history</code>',
      '<b>Install to Workspace</b> \u2192 copy the <b>Bot User OAuth Token</b>'
    ],
    inputs: [
      {key:'token', label:'Bot User OAuth Token', placeholder:'xoxb-xxxx-xxxx-xxxx', type:'password', required:true},
      {key:'signingSecret', label:'Signing Secret (optional)', placeholder:'found under Basic Information', type:'password'}
    ]
  },
  discord: {
    title: '\uD83C\uDFAE Discord Setup',
    subtitle: 'Chat with your bot in Discord',
    isIntegration: true,
    integrationType: 'discord',
    steps: [
      'Go to <a href="https://discord.com/developers/applications" target="_blank" style="color:var(--accent)">discord.com/developers</a> \u2192 <b>New Application</b>',
      'Under <b>Bot</b> tab \u2192 click <b>Reset Token</b> \u2192 copy it',
      'Enable <b>Message Content Intent</b> under Privileged Gateway Intents',
      'Under <b>OAuth2 \u2192 URL Generator</b>: select <b>bot</b> scope + <b>Send Messages</b> \u2192 use the URL to invite bot to your server'
    ],
    inputs: [
      {key:'token', label:'Bot Token', placeholder:'your-discord-bot-token', type:'password', required:true}
    ]
  }
};

// ─── Guide Popup Component ───
function GuidePopup(props) {
  var guide = props.guide;
  var onClose = props.onClose;
  var onKeySave = props.onKeySave;
  var saving = props.saving;

  var _s = useState(''), inputVal = _s[0], setInput = _s[1];
  var _p = useState(null), selectedProvider = _p[0], setProvider = _p[1];
  var _ok = useState(false), saved = _ok[0], setSaved = _ok[1];
  var _dx = useState(null), diagResult = _dx[0], setDiag = _dx[1];
  var _dt = useState(false), diagRunning = _dt[0], setDiagRunning = _dt[1];

  // Integration form state
  var _if = useState({}), intFields = _if[0], setIntFields = _if[1];
  var _is = useState(false), intSaving = _is[0], setIntSaving = _is[1];
  var _id = useState(false), intDone = _id[0], setIntDone = _id[1];
  var _ie = useState(''), intError = _ie[0], setIntError = _ie[1];
  var _im = useState(''), intMsg = _im[0], setIntMsg = _im[1];

  function setField(key, val) { setIntFields(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); }
  function handleIntSave() {
    var g = GUIDES[guide];
    if (!g || !g.isIntegration) return;
    setIntSaving(true); setIntError('');
    var creds = {};
    (g.inputs || []).forEach(function(inp) { creds[inp.key] = intFields[inp.key] || inp.defaultValue || ''; });
    api('/chat/save-integration', {method:'POST', body:{type: g.integrationType, credentials: creds}})
      .then(function(r) {
        setIntSaving(false);
        if (r.ok) { setIntDone(true); setIntMsg(r.note || 'Saved!'); } else { setIntError(r.error || 'Save failed'); }
      })
      .catch(function(e) { setIntSaving(false); setIntError(e.message); });
  }
  function intRequired() {
    var g = GUIDES[guide];
    if (!g || !g.inputs) return false;
    return g.inputs.filter(function(inp) { return inp.required; }).every(function(inp) { return (intFields[inp.key] || '').trim(); });
  }
  var _gw = useState(false), gwRestarting = _gw[0], setGwRestarting = _gw[1];
  // Telegram multi-step activation
  var _act = useState(null), activatePhase = _act[0], setPhase = _act[1];
  // phases: null | 'saving' | 'stopping' | 'starting' | 'connecting' | 'done' | 'failed'
  var _ar = useState(null), activateResult = _ar[0], setActivateResult = _ar[1];
  // Lock bot to user's account
  var _lk = useState(null), lockPhase = _lk[0], setLockPhase = _lk[1]; // null | 'locking' | 'locked' | 'failed'
  var _lu = useState(null), lockUser = _lu[0], setLockUser = _lu[1];
  var _le = useState(''), lockError = _le[0], setLockError = _le[1];
  var _li = useState(''), lockId = _li[0], setLockId = _li[1];
  // Voice auto-enable
  var _ve = useState(null), voicePhase = _ve[0], setVoicePhase = _ve[1]; // null | 'enabling' | 'done' | 'failed'
  var _vm = useState(''), voiceMsg = _vm[0], setVoiceMsg = _vm[1];
  // Track which guide we rendered last — reset state on guide switch
  var lastGuide = useRef(guide);
  if (guide !== lastGuide.current) {
    lastGuide.current = guide;
    if (inputVal) setInput('');
    if (selectedProvider) setProvider(null);
    if (saved) setSaved(false);
    if (diagResult) setDiag(null);
    if (activatePhase) setPhase(null);
    if (activateResult) setActivateResult(null);
    if (lockPhase) setLockPhase(null);
    if (lockUser) setLockUser(null);
    if (lockError) setLockError('');
    if (lockId) setLockId('');
    if (voicePhase) setVoicePhase(null);
    if (voiceMsg) setVoiceMsg('');
  }

  if (!guide) return null;
  var g = GUIDES[guide];
  if (!g) return null;

  // Lock bot to user's Telegram account
  function handleLock() {
    if (lockPhase === 'locking' || !lockId.trim()) return;
    setLockPhase('locking');
    setLockError('');
    api('/chat/telegram-lock', {method:'POST', body:{userId: lockId.trim()}})
      .then(function(r) {
        if (r.ok) {
          setLockPhase('locked');
          setLockUser({ id: r.userId });
        } else {
          setLockPhase('failed');
          setLockError(r.error || 'Lock failed');
        }
      })
      .catch(function(e) {
        setLockPhase('failed');
        setLockError('Connection error: ' + e.message);
      });
  }

  // Enable voice replies
  function handleVoiceEnable() {
    if (voicePhase === 'enabling') return;
    setVoicePhase('enabling');
    api('/chat/enable-voice-replies', {method:'POST', body:{}})
      .then(function(r) {
        if (r.ok) {
          setVoicePhase('done');
          setVoiceMsg(r.note || 'Voice replies enabled!');
        } else {
          setVoicePhase('failed');
          setVoiceMsg(r.error || 'Failed to enable voice replies');
        }
      })
      .catch(function(e) {
        setVoicePhase('failed');
        setVoiceMsg('Connection error: ' + e.message);
      });
  }

  function handleSave(overrideProvider) {
    if (overrideProvider && typeof overrideProvider !== 'string') overrideProvider = null;
    var provider = overrideProvider || selectedProvider;
    if (!inputVal.trim() || !provider) return;

    // API key saves: show success then auto-transition to telegram setup
    if (guide === 'apiKey') {
      onKeySave(provider, inputVal.trim());
      setSaved(true);
      setTimeout(function() {
        // Auto-transition to telegram setup after brief success display
        if (props.onSwitchGuide) {
          props.onSwitchGuide('telegram');
        } else {
          onClose();
        }
      }, 2000);
      return;
    }

    // ── Telegram: multi-step activation ──
    if (guide === 'telegram') {
      setPhase('saving');
      setSaved(true);
      // Step 1: Save token (fast)
      api('/chat/save-key', {method:'POST', body:{provider:'telegram', key:inputVal.trim()}})
        .then(function(r) {
          if (!r.ok) { setPhase('failed'); setActivateResult({error: r.error}); return; }
          onKeySave(provider, inputVal.trim());  // notify parent
          // Step 2+3+4: Gateway restart + verify (show progress phases)
          setPhase('stopping');
          setTimeout(function(){ setPhase('starting'); }, 2500);
          setTimeout(function(){ setPhase('connecting'); }, 7000);
          api('/chat/telegram-activate', {method:'POST', body:{freshInstall: true, userId: lockId.trim() || ''}})
            .then(function(ar) { setActivateResult(ar); setPhase(ar.ok ? 'done' : 'failed'); })
            .catch(function(e) { setActivateResult({error: e.message}); setPhase('failed'); });
        })
        .catch(function(e) { setPhase('failed'); setActivateResult({error: e.message}); });
      return;
    }

    // Generic fallback
    onKeySave(provider, inputVal.trim());
    setSaved(true);
  }

  function runDiagnose() {
    setDiagRunning(true);
    setDiag(null);
    api('/chat/telegram-diagnose', {method:'POST', body:{}})
      .then(function(r){ setDiag(r); setDiagRunning(false); })
      .catch(function(e){ setDiag({ok:false, error:e.message}); setDiagRunning(false); });
  }

  function restartGateway() {
    setGwRestarting(true);
    api('/chat/gateway-restart', {method:'POST', body:{}})
      .then(function(r){
        setGwRestarting(false);
        if (r.running) {
          toast('Gateway restarted! Try messaging your bot again.', 'success');
          // Re-run diagnostics after restart
          setTimeout(runDiagnose, 2000);
        } else {
          toast('Gateway may not have started. Check the Dashboard tab.', 'warning');
        }
      })
      .catch(function(e){ setGwRestarting(false); toast('Restart failed: '+e.message,'error'); });
  }

  var overlay = {position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'};
  var modal = {background:'var(--card)',borderRadius:16,maxWidth:520,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',border:'1px solid var(--border)'};

  return React.createElement('div', {style:overlay, onClick:function(e){if(e.target===e.currentTarget)onClose();}},
    React.createElement('div', {style:modal},
      // Header (compact)
      React.createElement('div', {style:{padding:'18px 24px 0',textAlign:'center',flexShrink:0}},
        React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'center',gap:10}},
          React.createElement('span', {style:{fontSize:28}}, guide==='apiKey'?'🚀':guide==='telegram'?'📱':'🎙️'),
          React.createElement('div', {style:{textAlign:'left'}},
            React.createElement('h2', {style:{margin:0,fontSize:18,color:'var(--text)',fontWeight:800}}, g.title),
            React.createElement('p', {style:{margin:'2px 0 0',fontSize:12,color:'var(--dim)'}}, g.subtitle)))),
      // Scrollable content
      React.createElement('div', {style:{padding:'14px 24px 8px',overflowY:'auto',flex:1,minHeight:0}},

        guide === 'apiKey' ? React.createElement('div', null,
          // Show transition message after save
          saved ? React.createElement('div', {style:{textAlign:'center',padding:'30px 20px'}},
            React.createElement('div', {style:{fontSize:48,marginBottom:12}}, '\u2705'),
            React.createElement('div', {style:{fontSize:18,fontWeight:800,color:'var(--green)',marginBottom:8}}, 'API Key Saved!'),
            React.createElement('div', {style:{fontSize:14,color:'var(--dim)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}},
              React.createElement('span', {style:{animation:'pulse 1.5s infinite'}}, '\u23F3'),
              'Opening Telegram setup...')
          ) :
          // Provider cards (before save)
          g.steps.map(function(opt) {
            var isSelected = selectedProvider === opt.provider;
            var cardStyle = {border:'2px solid '+(isSelected?'var(--accent)':'var(--border)'),borderRadius:12,padding:16,marginBottom:12,cursor:'pointer',transition:'all 0.2s',background:isSelected?'rgba(255,180,60,0.06)':'transparent'};
            return React.createElement('div', {key:opt.id, style:cardStyle, onClick:function(){setProvider(opt.provider);setSaved(false);}},
              React.createElement('div', {style:{display:'flex',alignItems:'center',gap:8,marginBottom:isSelected?12:0}},
                React.createElement('span', {style:{fontSize:20}}, opt.icon),
                React.createElement('span', {style:{fontWeight:700,fontSize:14,flex:1}}, opt.title),
                isSelected ? React.createElement('span', {style:{fontSize:11,color:'var(--accent)',fontWeight:700,background:'rgba(255,180,60,0.15)',padding:'2px 8px',borderRadius:6}}, 'SELECTED') :
                  React.createElement('span', {style:{fontSize:16,color:'var(--dim)'}}, '\u203A')),
              isSelected && opt.steps ? React.createElement('div', {style:{borderTop:'1px solid var(--border)',paddingTop:12,marginTop:4}},
                React.createElement('ol', {style:{margin:'0 0 16px',paddingLeft:22,fontSize:13,lineHeight:2,color:'var(--dim)'}},
                  opt.steps.map(function(s,i){return React.createElement('li',{key:i,style:{paddingLeft:4},dangerouslySetInnerHTML:{__html:s}});})),
                opt.provider !== 'oauth' ? React.createElement('div', {style:{display:'flex',gap:8}},
                  React.createElement('input', {type:'password', value:inputVal, onChange:function(e){setInput(e.target.value);},
                    placeholder:opt.placeholder,
                    onFocus:function(e){e.target.type='text';},
                    onBlur:function(e){if(!inputVal)e.target.type='password';},
                    style:{flex:1,padding:'12px 14px',borderRadius:10,border:'2px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'monospace',outline:'none'}}),
                  React.createElement('button', {onClick:handleSave,
                    disabled:!inputVal.trim()||saving,
                    style:{padding:'12px 24px',borderRadius:10,fontWeight:800,fontSize:14,border:'none',cursor:inputVal.trim()&&!saving?'pointer':'default',
                      background:saved?'var(--green)':inputVal.trim()?'var(--accent)':'var(--border)',
                      color:saved?'#fff':inputVal.trim()?'#1a1a1a':'var(--muted)',transition:'all 0.2s'}},
                    saved ? '\u2713 Saved!' : saving ? '...' : 'Save')
                ) : React.createElement('div', {style:{padding:14,borderRadius:10,background:'var(--bg)',fontSize:13,color:'var(--dim)',textAlign:'center',lineHeight:1.5}},
                  '\uD83D\uDC49 Head to the Profile \u2192 Auth tab in the sidebar to start the OAuth flow. No credit card needed!')
              ) : null);
          })
        ) :

        React.createElement('div', null,

          // ── Pre-save: show setup steps (not for voice or integrations — they have own layout) ──
          !saved && guide !== 'voice' && !g.isIntegration ? React.createElement('ol', {style:{margin:0,paddingLeft:20,fontSize:12,lineHeight:1.8,color:'var(--dim)'}},
            g.steps.map(function(s,i){return React.createElement('li',{key:i,style:{paddingLeft:2,marginBottom:1},dangerouslySetInnerHTML:{__html:s}});})) : null,

          // ── Inline input for Telegram token + user ID ──
          g.hasInput && !saved ? React.createElement('div', {style:{marginTop:12,padding:'14px 16px',borderRadius:12,
            background:'linear-gradient(135deg, rgba(255,180,60,0.1), rgba(255,120,0,0.05))',
            border:'2px solid rgba(255,180,60,0.35)'}},
            // Bot token
            React.createElement('div', {style:{fontSize:13,fontWeight:800,marginBottom:6,color:'var(--text)',display:'flex',alignItems:'center',gap:6}},
              React.createElement('span',{style:{fontSize:16}},'\uD83D\uDD11'),
              g.inputLabel || 'Paste here:'),
            React.createElement('input', {type:'text', value:inputVal, onChange:function(e){setInput(e.target.value);},
              placeholder:g.inputPlaceholder || '',
              autoFocus:true,
              style:{width:'100%',boxSizing:'border-box',padding:'10px 12px',borderRadius:8,border:'2px solid var(--border)',
                background:'var(--card)',color:'var(--text)',fontSize:14,fontFamily:'monospace',outline:'none'}}),

            // Divider
            React.createElement('div', {style:{borderTop:'1px solid var(--border)',margin:'12px 0'}}),

            // User ID
            React.createElement('div', {style:{fontSize:13,fontWeight:800,marginBottom:4,color:'var(--text)',display:'flex',alignItems:'center',gap:6}},
              React.createElement('span',{style:{fontSize:16}},'\uD83D\uDD12'),
              'Your Telegram User ID:'),
            React.createElement('div', {style:{fontSize:11,color:'var(--dim)',marginBottom:6,lineHeight:1.4},
              dangerouslySetInnerHTML:{__html:'Message <b>@userinfobot</b> in Telegram \u2014 it replies with your numeric ID. This locks the bot to <b>only you</b>.'}}),
            React.createElement('input', {type:'text', value:lockId,
              onChange:function(e){setLockId(e.target.value.replace(/[^0-9]/g,''));},
              placeholder:'e.g. 123456789',
              style:{width:'100%',boxSizing:'border-box',padding:'10px 12px',borderRadius:8,border:'2px solid var(--border)',
                background:'var(--card)',color:'var(--text)',fontSize:14,fontFamily:'monospace',outline:'none',marginBottom:12}}),

            // Save button (requires BOTH inputs)
            React.createElement('button', {onClick:function(){handleSave(g.inputProvider);},
              disabled:!inputVal.trim()||!lockId.trim()||saving,
              style:{width:'100%',padding:'12px 20px',borderRadius:10,fontWeight:800,fontSize:14,border:'none',
                cursor:inputVal.trim()&&lockId.trim()&&!saving?'pointer':'default',
                background:inputVal.trim()&&lockId.trim()?'var(--accent)':'var(--border)',
                color:inputVal.trim()&&lockId.trim()?'#1a1a1a':'var(--muted)',transition:'all 0.2s'}},
              !inputVal.trim() ? 'Enter bot token above' :
              !lockId.trim() ? 'Enter your user ID above' :
              saving ? '\u23F3 Saving...' : '\uD83D\uDD12 Save & Connect (Locked to You)')
          ) : null,

          // ── Post-save: Telegram activation progress stepper ──
          activatePhase && guide === 'telegram' ? React.createElement('div', {style:{marginTop:4}},
            (function() {
              var phases = [
                {id:'saving', label:'Saving token...', done:'Token saved'},
                {id:'stopping', label:'Stopping gateway...', done:'Gateway stopped'},
                {id:'starting', label:'Starting gateway...', done:'Gateway started'},
                {id:'connecting', label:'Verifying Telegram...', done:'Connected to Telegram'}
              ];
              var phaseOrder = ['saving','stopping','starting','connecting','done','failed'];
              var currentIdx = phaseOrder.indexOf(activatePhase);

              return React.createElement('div', {style:{padding:'16px',borderRadius:14,background:'var(--bg)',border:'1px solid var(--border)'}},
                phases.map(function(ph, i) {
                  var phIdx = phaseOrder.indexOf(ph.id);
                  var isDone = currentIdx > phIdx;
                  var isCurrent = activatePhase === ph.id;
                  var isPending = currentIdx < phIdx && activatePhase !== 'done' && activatePhase !== 'failed';
                  var icon = isDone || activatePhase === 'done' ? '\u2705' : isCurrent ? '\u23F3' : '\u2B1C';
                  var color = isDone || activatePhase === 'done' ? 'var(--green)' : isCurrent ? '#7cb3ff' : 'var(--muted)';
                  var text = isDone || activatePhase === 'done' ? ph.done : isCurrent ? ph.label : ph.done;

                  return React.createElement('div', {key:ph.id, style:{display:'flex',alignItems:'center',gap:10,
                    padding:'8px 0',opacity: isPending ? 0.4 : 1,transition:'opacity 0.3s'}},
                    React.createElement('span', {style:{fontSize:16,width:24,textAlign:'center',
                      animation: isCurrent ? 'pulse 1.5s infinite' : 'none'}}, icon),
                    React.createElement('span', {style:{fontSize:13,color:color,fontWeight: isCurrent ? 700 : 400}}, text));
                }),

                // Failed state
                activatePhase === 'failed' ? React.createElement('div', {style:{marginTop:10,padding:'10px 12px',borderRadius:8,
                  background:'rgba(255,80,80,0.08)',border:'1px solid rgba(255,80,80,0.2)',fontSize:12,color:'#ff6b6b'}},
                  '\u274C ' + (activateResult && activateResult.error ? activateResult.error : 'Activation failed. Try restarting from the Dashboard.')) : null,

                // Done state — success + next steps
                activatePhase === 'done' ? React.createElement('div', {style:{marginTop:8}},
                  // Bot info + instructions combined
                  activateResult && activateResult.botInfo ? React.createElement('div', {style:{padding:'10px 12px',borderRadius:10,
                    background:'rgba(80,200,120,0.08)',border:'1px solid rgba(80,200,120,0.2)',marginBottom:8}},
                    React.createElement('div', {style:{fontWeight:800,fontSize:13,color:'var(--green)',marginBottom:6}},
                      '\uD83E\uDD16 Your bot is live! \u2014 @' + activateResult.botInfo.username),
                    React.createElement('div', {style:{fontSize:12,color:'var(--dim)',lineHeight:1.6}},
                      'Open in Telegram \u2192 tap Start \u2192 send a message. ',
                      React.createElement('span',{style:{color:'var(--green)',fontWeight:600}},'\u2705 Locked to your account.'),
                      ' Manage users in Profile \u2192 Comms.')
                  ) : null,

                  React.createElement('div', {style:{padding:'6px 10px',borderRadius:8,
                    background:'rgba(80,200,120,0.06)',border:'1px solid rgba(80,200,120,0.15)',
                    fontSize:11,color:'var(--dim)',lineHeight:1.5},
                    dangerouslySetInnerHTML:{__html:'\uD83D\uDCBE <b>Portable & private:</b> Unplug the drive = bot fully off, zero traces on Mac.'}})
                ) : null
              );
            })()
          ) : null,

          // ── Post-save: non-telegram guides with afterSaveNote ──
          saved && !activatePhase && g.afterSaveNote ? React.createElement('div', {style:{marginTop:14,padding:14,borderRadius:10,
            background:'rgba(80,200,120,0.1)',border:'1px solid rgba(80,200,120,0.2)',fontSize:13,color:'var(--green)',lineHeight:1.6}},
            '\u2713 ', g.afterSaveNote) : null,

          // ── Voice guide: one-click enable ──
          guide === 'voice' ? React.createElement('div', null,
            React.createElement('ol', {style:{margin:0,paddingLeft:20,fontSize:12,lineHeight:1.8,color:'var(--dim)'}},
              g.steps.map(function(s,i){return React.createElement('li',{key:i,style:{paddingLeft:2,marginBottom:1},dangerouslySetInnerHTML:{__html:s}});})),

            // Voice reply enable section
            React.createElement('div', {style:{marginTop:12,padding:'14px 16px',borderRadius:12,
              background:'linear-gradient(135deg, rgba(160,120,255,0.1), rgba(100,60,200,0.05))',
              border:'2px solid rgba(160,120,255,0.3)'}},
              React.createElement('div', {style:{fontSize:13,fontWeight:800,color:'var(--text)',marginBottom:6}},
                '\uD83C\uDF99\uFE0F Voice Replies'),
              React.createElement('div', {style:{fontSize:12,color:'var(--dim)',marginBottom:10,lineHeight:1.4}},
                'Enable this so your bot responds with voice notes when you send voice messages.'),

              // Voice enable states
              voicePhase === 'done' ?
                React.createElement('div', {style:{padding:'10px 14px',borderRadius:8,background:'rgba(80,200,120,0.1)',
                  border:'1px solid rgba(80,200,120,0.25)',textAlign:'center'}},
                  React.createElement('div', {style:{fontWeight:700,fontSize:12,color:'var(--green)'}}, '\u2705 ' + (voiceMsg || 'Voice replies enabled!')),
                  React.createElement('div', {style:{fontSize:11,color:'var(--dim)',marginTop:2}},
                    'Send a voice message in Telegram to try it!')
                ) :
                React.createElement('div', null,
                  React.createElement('button', {
                    onClick: handleVoiceEnable,
                    disabled: voicePhase === 'enabling',
                    style:{width:'100%',padding:'10px 18px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',
                      background: voicePhase === 'enabling' ? 'var(--border)' : 'linear-gradient(135deg, #a078ff, #7c4dff)',
                      color: voicePhase === 'enabling' ? 'var(--dim)' : '#fff',
                      transition:'all 0.2s',boxShadow: voicePhase === 'enabling' ? 'none' : '0 2px 8px rgba(160,120,255,0.3)'}
                  }, voicePhase === 'enabling' ? '\u23F3 Enabling...' : '\uD83C\uDF99\uFE0F Enable Voice Replies'),
                  voicePhase === 'failed' ? React.createElement('div', {style:{marginTop:4,fontSize:11,color:'#ff6b6b',textAlign:'center'}},
                    voiceMsg) : null
                )
            ),

            g.afterStepNote ? React.createElement('div', {style:{marginTop:10,padding:'8px 10px',borderRadius:8,
              background:'rgba(255,180,60,0.08)',border:'1px solid rgba(255,180,60,0.15)',fontSize:11,
              color:'var(--dim)',lineHeight:1.4,textAlign:'center'}}, g.afterStepNote) : null
          ) : null,

          // ── Telegram tip (pre-save only) ──
          guide === 'telegram' && !saved ? React.createElement('div', {style:{marginTop:10,padding:'8px 10px',borderRadius:8,
            background:'rgba(255,180,60,0.08)',border:'1px solid rgba(255,180,60,0.15)',fontSize:11,color:'var(--dim)',lineHeight:1.4,textAlign:'center'}},
            '\uD83D\uDCA1 No Telegram yet? Free at ',
            React.createElement('a',{href:'https://telegram.org',target:'_blank',style:{color:'var(--accent)'}},'telegram.org')) : null,

          // ── Integration form (multi-field inputs) ──
          g.isIntegration ? React.createElement('div', null,
            React.createElement('ol', {style:{margin:0,paddingLeft:20,fontSize:12,lineHeight:1.8,color:'var(--dim)'}},
              g.steps.map(function(s,i){return React.createElement('li',{key:i,style:{paddingLeft:2,marginBottom:1},dangerouslySetInnerHTML:{__html:s}});})),

            intDone ?
              React.createElement('div', {style:{marginTop:14,padding:'12px 16px',borderRadius:10,background:'rgba(80,200,120,0.1)',
                border:'1px solid rgba(80,200,120,0.25)',textAlign:'center'}},
                React.createElement('div', {style:{fontWeight:700,fontSize:13,color:'var(--green)'}}, '\u2705 ' + intMsg),
                React.createElement('div', {style:{fontSize:11,color:'var(--dim)',marginTop:4}},
                  (g.integrationType === 'slack' || g.integrationType === 'discord') ? 'Restart gateway for changes to take effect.' : 'Your bot can now use this integration.')
              ) :
              React.createElement('div', {style:{marginTop:12,padding:'14px 16px',borderRadius:12,
                background:'linear-gradient(135deg, rgba(255,180,60,0.08), rgba(255,120,0,0.04))',
                border:'2px solid rgba(255,180,60,0.25)'}},
                (g.inputs || []).map(function(inp) {
                  return React.createElement('div', {key:inp.key, style:{marginBottom:10}},
                    React.createElement('div', {style:{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:4}}, inp.label),
                    React.createElement('input', {
                      type: inp.type || 'text',
                      value: intFields[inp.key] || '',
                      onChange: function(e) { setField(inp.key, e.target.value); },
                      placeholder: inp.placeholder || '',
                      style:{width:'100%',boxSizing:'border-box',padding:'8px 12px',borderRadius:8,border:'2px solid var(--border)',
                        background:'var(--card)',color:'var(--text)',fontSize:13,fontFamily:'monospace',outline:'none'}
                    }));
                }),
                React.createElement('button', {
                  onClick: handleIntSave,
                  disabled: !intRequired() || intSaving,
                  style:{width:'100%',padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,border:'none',
                    cursor: intRequired()&&!intSaving ? 'pointer' : 'default', marginTop:4,
                    background: intRequired() ? 'var(--accent)' : 'var(--border)',
                    color: intRequired() ? '#1a1a1a' : 'var(--muted)', transition:'all 0.2s'}
                }, intSaving ? '\u23F3 Saving...' : '\uD83D\uDD12 Save Credentials'),
                intError ? React.createElement('div', {style:{marginTop:6,fontSize:11,color:'#ff6b6b',textAlign:'center'}}, intError) : null
              )
          ) : null
        ),

        // ── Footer buttons (sticky at bottom) ──
        React.createElement('div', {style:{display:'flex',justifyContent:'center',gap:10,padding:'12px 24px 16px',flexWrap:'wrap',flexShrink:0,
          borderTop:'1px solid var(--border)',background:'var(--card)',borderRadius:'0 0 16px 16px'}},
          // Skip button (only before save and not during activation)
          !saved && !activatePhase && !intDone ? React.createElement('button', {onClick:onClose,
            style:{padding:'10px 24px',borderRadius:10,background:'transparent',color:'var(--muted)',fontSize:12,fontWeight:600,border:'1px solid var(--border)',cursor:'pointer'}},
            'Skip for now') : null,

          // After telegram activation done: "Continue to Voice Setup" button
          activatePhase === 'done' && guide === 'telegram' ? React.createElement('button', {onClick:function(){ props.onSwitchGuide && props.onSwitchGuide('voice'); },
            style:{padding:'10px 24px',borderRadius:10,background:'transparent',color:'var(--accent)',fontSize:12,fontWeight:700,
              border:'2px solid var(--accent)',cursor:'pointer',transition:'all 0.2s'}},
            '\uD83C\uDF99\uFE0F Voice Setup \u2192') : null,

          // Done / Close button
          !activatePhase || activatePhase === 'done' || activatePhase === 'failed' || intDone ?
            React.createElement('button', {onClick:onClose,
              style:{padding:'10px 32px',borderRadius:10,
                background: (activatePhase === 'done' || saved || intDone) ? 'var(--accent)' : 'var(--border)',
                color: (activatePhase === 'done' || saved || intDone) ? '#1a1a1a' : 'var(--text)',
                fontSize:13,fontWeight:700,border:'none',cursor:'pointer',transition:'all 0.2s'}},
              (activatePhase === 'done' || intDone) ? '\u2705 Done!' : saved ? 'Close' : 'Close') : null)
      )
    )
  );
}

// ─── Setup Status Cards (always visible at top) ───
function SetupCards(props) {
  var status = props.status;
  var onGuide = props.onGuide;
  var intStatus = props.intStatus || {};
  var k = status.keys || {};
  var hasKey = k.openai || k.anthropic || k.oauth;

  function chip(icon, label, ready, action) {
    return React.createElement('button', {
      onClick: action,
      style:{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,
        background:ready?'rgba(80,200,120,0.1)':'rgba(255,180,60,0.08)',
        border:'1px solid '+(ready?'rgba(80,200,120,0.3)':'rgba(255,180,60,0.25)'),
        color:ready?'var(--green)':'var(--accent)',fontSize:12,fontWeight:600,
        cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.2s',outline:'none'}
    }, React.createElement('span', null, icon), label, ready ? ' \u2713' : ' \u2192');
  }

  return React.createElement('div', {style:{display:'flex',gap:8,padding:'10px 16px',borderBottom:'1px solid var(--border)',overflowX:'auto',flexWrap:'wrap',alignItems:'center'}},
    React.createElement('span', {style:{fontSize:11,color:'var(--muted)',fontWeight:600,marginRight:4}}, 'SETUP:'),
    chip('\uD83D\uDD11', hasKey ? 'API Key' : 'Add API Key', hasKey, function(){onGuide('apiKey');}),
    chip('\u26A1', 'Gateway', status.gateway && status.gateway.running, function(){}),
    chip('\uD83D\uDCF1', k.telegram ? 'Telegram' : 'Add Telegram', k.telegram, function(){onGuide('telegram');}),
    chip('\uD83C\uDF99\uFE0F', 'Voice', false, function(){onGuide('voice');}),
    chip('\uD83D\uDC19', 'GitHub', intStatus.github, function(){onGuide('github');}),
    chip('\u25B2', 'Vercel', intStatus.vercel, function(){onGuide('vercel');}),
    chip('\uD83D\uDCC1', 'FTP', intStatus.ftp, function(){onGuide('ftp');}),
    chip('\u2709\uFE0F', 'Email', intStatus.email, function(){onGuide('email');}),
    chip('\uD83D\uDCAC', 'Slack', intStatus.slack, function(){onGuide('slack');}),
    chip('\uD83C\uDFAE', 'Discord', intStatus.discord, function(){onGuide('discord');}),
    status.chatReady ? React.createElement('span', {style:{marginLeft:'auto',fontSize:11,color:'var(--green)',fontWeight:600}},
      '\u25CF Connected via ' + (status.chatMethod === 'openai-direct' ? 'OpenAI' :
        status.chatMethod === 'anthropic-direct' ? 'Anthropic' :
        status.chatMethod === 'gateway' ? 'Gateway' : status.chatMethod)) : null);
}

// ─── Welcome Screen ───
function ChatWelcome(props) {
  var status = props.status;
  var onGuide = props.onGuide;
  var intStatus = props.intStatus || {};
  var k = status.keys || {};
  var hasKey = k.openai || k.anthropic || k.oauth;

  var cardGrid = {display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:28,textAlign:'left'};
  function bigCard(icon, title, desc, action, ready, actionLabel) {
    return React.createElement('div', {
      onClick:action,
      style:{padding:20,borderRadius:14,background:'var(--card)',border:'2px solid '+(ready?'var(--green)':'var(--border)'),
        cursor:action?'pointer':'default',transition:'all 0.2s'}},
      React.createElement('div', {style:{display:'flex',alignItems:'center',gap:10,marginBottom:8}},
        React.createElement('span', {style:{fontSize:28}}, icon),
        React.createElement('div', {style:{flex:1}},
          React.createElement('div', {style:{fontWeight:700,fontSize:14}}, title),
          React.createElement('div', {style:{fontSize:11,color:'var(--dim)',marginTop:2}}, desc))),
      React.createElement('div', {style:{fontSize:12,fontWeight:700,color:ready?'var(--green)':'var(--accent)'}},
        ready ? '\u2713 Connected' : (actionLabel || 'Set up \u2192')));
  }
  function miniCard(icon, title, action, ready) {
    return React.createElement('div', {
      onClick:action,
      style:{padding:'10px 14px',borderRadius:10,background:'var(--card)',border:'1px solid '+(ready?'rgba(80,200,120,0.3)':'var(--border)'),
        cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:8}},
      React.createElement('span', {style:{fontSize:18}}, icon),
      React.createElement('div', {style:{flex:1,fontSize:12,fontWeight:600,color:'var(--text)'}}, title),
      React.createElement('div', {style:{fontSize:11,fontWeight:700,color:ready?'var(--green)':'var(--accent)'}},
        ready ? '\u2713' : '\u2192'));
  }

  return React.createElement('div', {style:{textAlign:'center',padding:'32px 20px',maxWidth:520,margin:'0 auto'}},
    React.createElement('div', {style:{fontSize:52,marginBottom:12}}, '\uD83E\uDD16'),
    React.createElement('h2', {style:{margin:0,fontSize:24,color:'var(--text)',fontWeight:800}}, 'Welcome to OpenClaw Chat'),
    React.createElement('p', {style:{color:'var(--dim)',fontSize:14,marginTop:10,lineHeight:1.6,maxWidth:420,margin:'10px auto 0'}},
      hasKey ? 'Your AI is connected and ready! Type a message below to start a conversation.' :
      'Get your AI bot up and running in just a few steps. It\'s easier than you think!'),

    React.createElement('div', {style:cardGrid},
      bigCard('\uD83D\uDD11', 'AI API Key', hasKey ? 'Key connected' : 'Connect OpenAI or Anthropic', function(){onGuide('apiKey');}, hasKey),
      bigCard('\u26A1', 'Gateway', status.gateway&&status.gateway.running ? 'Process running' : 'Bot engine', null, status.gateway&&status.gateway.running, 'Auto'),
      bigCard('\uD83D\uDCF1', 'Telegram', k.telegram ? 'Bot connected' : 'Chat from your phone', function(){onGuide('telegram');}, k.telegram),
      bigCard('\uD83C\uDF99\uFE0F', 'Voice Chat', 'Talk with your voice', function(){onGuide('voice');}, false, 'Learn how \u2192')),

    // ── Developer Integrations ──
    React.createElement('div', {style:{marginTop:24,textAlign:'left'}},
      React.createElement('div', {style:{fontSize:13,fontWeight:700,color:'var(--dim)',marginBottom:10,textAlign:'center'}},
        '\uD83D\uDD27 Developer Integrations'),
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}},
        miniCard('\uD83D\uDC19', 'GitHub', function(){onGuide('github');}, intStatus.github),
        miniCard('\u25B2', 'Vercel', function(){onGuide('vercel');}, intStatus.vercel),
        miniCard('\uD83D\uDCC1', 'FTP', function(){onGuide('ftp');}, intStatus.ftp),
        miniCard('\u2709\uFE0F', 'Email', function(){onGuide('email');}, intStatus.email),
        miniCard('\uD83D\uDCAC', 'Slack', function(){onGuide('slack');}, intStatus.slack),
        miniCard('\uD83C\uDFAE', 'Discord', function(){onGuide('discord');}, intStatus.discord))),

    !hasKey ? React.createElement('button', {
      onClick:function(){onGuide('apiKey');},
      style:{marginTop:28,padding:'16px 48px',borderRadius:14,fontSize:16,fontWeight:800,border:'none',cursor:'pointer',
        background:'var(--accent)',color:'#1a1a1a',boxShadow:'0 4px 20px rgba(255,180,60,0.3)',transition:'all 0.2s'}},
      '\uD83D\uDE80 Get Started') : null,

    hasKey && !k.telegram ? React.createElement('button', {
      onClick:function(){onGuide('telegram');},
      style:{marginTop:20,padding:'10px 24px',borderRadius:10,fontSize:13,fontWeight:600,border:'1px solid var(--border)',cursor:'pointer',background:'transparent',color:'var(--accent)'}},
      '\uD83D\uDCF1 Next: Add Telegram for mobile access') : null,

    hasKey ? React.createElement('div', {style:{fontSize:13,color:'var(--muted)',marginTop:20}}, '\u2B07 Start typing below to chat with your bot') : null);
}

// ─── Typing Indicator ───
function TypingDots() {
  return React.createElement('div', {style:{display:'flex',gap:4,padding:'8px 0',alignItems:'center'}},
    React.createElement('span', {style:{fontSize:11,color:'var(--dim)',marginRight:4}}, 'Thinking'),
    [0,1,2].map(function(i) {
      return React.createElement('div', {key:i, style:{
        width:7, height:7, borderRadius:'50%', background:'var(--accent)',
        opacity:0.4, animation:'pulse 1.2s ease-in-out '+(i*0.2)+'s infinite'
      }});
    }));
}

// ─── Message Bubble ───
function ChatBubble(props) {
  var m = props.message;
  var isUser = m.role === 'user';
  var isError = !isUser && m.content && m.content.indexOf('\u26A0') === 0;
  var bubble = {
    padding:'14px 18px',borderRadius:isUser?'18px 18px 4px 18px':'18px 18px 18px 4px',
    background:isError?'rgba(255,80,80,0.1)':isUser?'var(--accent)':'var(--card)',
    color:isError?'var(--red)':isUser?'#1a1a1a':'var(--text)',
    border:isError?'1px solid rgba(255,80,80,0.2)':'none',
    fontSize:14,lineHeight:1.7,wordBreak:'break-word',
    whiteSpace:'pre-wrap',boxShadow:'0 2px 6px rgba(0,0,0,0.12)'
  };

  return React.createElement('div', {style:{display:'flex',justifyContent:isUser?'flex-end':'flex-start',marginBottom:16,paddingLeft:isUser?60:0,paddingRight:isUser?0:60}},
    React.createElement('div', {style:{maxWidth:'100%'}},
      !isUser ? React.createElement('div', {style:{fontSize:10,color:'var(--dim)',marginBottom:3,fontWeight:600}}, '\uD83E\uDD16 Bot') : null,
      React.createElement('div', {style:bubble}, m.content),
      m.ts ? React.createElement('div', {style:{fontSize:10,color:'var(--muted)',marginTop:3,textAlign:isUser?'right':'left'}},
        new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})) : null));
}

// ─── Main Chat Panel ───
function PanelChat(props) {
  var toast = props.toast;
  var onNav = props.onNav;

  var _st = useState(null), status = _st[0], setStatus = _st[1];
  var _msgs = useState([]), messages = _msgs[0], setMessages = _msgs[1];
  var _inp = useState(''), input = _inp[0], setInput = _inp[1];
  var _send = useState(false), sending = _send[0], setSending = _send[1];
  var _guide = useState(null), guide = _guide[0], setGuide = _guide[1];
  var _sav = useState(false), saving = _sav[0], setSaving = _sav[1];
  var _loaded = useState(false), loaded = _loaded[0], setLoaded = _loaded[1];
  var _int = useState({}), intStatus = _int[0], setIntStatus = _int[1];
  var scrollRef = useRef(null);
  var guideDismissed = useRef(false);  // Tracks if user manually closed/skipped the popup

  useEffect(function() {
    loadStatus();
    loadIntegrations();
    api('/chat/history').then(function(r) {
      if (r.messages) setMessages(r.messages);
      setLoaded(true);
    }).catch(function() { setLoaded(true); });
  }, []);

  function loadStatus() {
    return api('/chat/status').then(function(s) { setStatus(s); return s; }).catch(function() {});
  }
  function loadIntegrations() {
    api('/chat/integrations').then(function(r) { if (r.integrations) setIntStatus(r.integrations); }).catch(function(){});
  }

  useEffect(function() {
    if (scrollRef.current) setTimeout(function(){ scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
  }, [messages, sending]);

  // Auto-open guide for first-run users — but only once, never after dismiss
  useEffect(function() {
    if (guideDismissed.current) return;  // User already dismissed — never reopen
    if (status && (status.firstRun || !status.chatReady) && loaded && messages.length === 0) {
      var t = setTimeout(function(){
        if (!guideDismissed.current) setGuide('apiKey');
      }, 600);
      return function(){ clearTimeout(t); };
    }
  }, [status, loaded]);

  function sendMessage() {
    var msg = input.trim();
    if (!msg || sending) return;
    setInput('');
    setMessages(function(prev){return prev.concat([{role:'user',content:msg,ts:new Date().toISOString()}]);});
    setSending(true);
    api('/chat/send', {method:'POST', body:{message:msg, history:messages.slice(-20)}})
      .then(function(r) {
        setSending(false);
        if (r.ok) {
          setMessages(function(prev){return prev.concat([{role:'assistant',content:r.reply,ts:new Date().toISOString()}]);});
        } else {
          setMessages(function(prev){return prev.concat([{role:'assistant',content:'\u26A0\uFE0F '+(r.error||'Something went wrong'),ts:new Date().toISOString()}]);});
          if (r.error && r.error.indexOf('No API keys') >= 0 && !guideDismissed.current) setTimeout(function(){ setGuide('apiKey'); }, 500);
        }
      })
      .catch(function(e) {
        setSending(false);
        setMessages(function(prev){return prev.concat([{role:'assistant',content:'\u26A0\uFE0F Network error: '+e.message,ts:new Date().toISOString()}]);});
      });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleKeySave(provider, key) {
    guideDismissed.current = true;

    // For telegram, GuidePopup handles save-key + activate directly
    // We only need to mark setup complete and refresh status
    if (provider === 'telegram') {
      api('/chat/complete-setup', {method:'POST'})
        .then(function(){ loadStatus(); })
        .catch(function(){ loadStatus(); });
      return;
    }

    // For API keys (openai/anthropic): original save flow
    setSaving(true);
    api('/chat/save-key', {method:'POST', body:{provider:provider, key:key}})
      .then(function(r) {
        setSaving(false);
        if (r.ok) {
          toast('API key saved! You can start chatting now.', 'success');
          api('/chat/complete-setup', {method:'POST'})
            .then(function(){ loadStatus(); })
            .catch(function(){ loadStatus(); });
        } else {
          toast(r.error || 'Save returned an error — check dashboard logs', 'error');
        }
      })
      .catch(function(err) {
        setSaving(false);
        var msg = (err && err.message) ? err.message : 'Network error — is the dashboard running?';
        toast('Failed to save: ' + msg, 'error');
        console.error('save-key error:', err);
      });
  }

  function clearHistory() {
    if (!confirm('Clear all chat history?')) return;
    api('/chat/history', {method:'DELETE'}).then(function() { setMessages([]); toast('Chat cleared', 'success'); }).catch(function(){});
  }

  if (!status) return React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'var(--dim)'}},
    React.createElement('div', {style:{textAlign:'center'}}, React.createElement('div', {style:{fontSize:32,marginBottom:8}}, '\uD83D\uDCAC'), 'Loading chat...'));

  var chatReady = status.chatReady;

  return React.createElement('div', {style:{display:'flex',flexDirection:'column',height:'calc(100vh - 80px)',maxHeight:'calc(100vh - 80px)'}},

    React.createElement(SetupCards, {status:status, onGuide:setGuide, intStatus:intStatus}),

    guide ? React.createElement(GuidePopup, {key:guide, guide:guide, onClose:function(){guideDismissed.current=true; setGuide(null); loadStatus(); loadIntegrations();}, onKeySave:handleKeySave, saving:saving, onSwitchGuide:function(g){setGuide(g);}}) : null,

    React.createElement('div', {ref:scrollRef, style:{flex:1,overflowY:'auto',padding:'20px 20px 12px'}},
      messages.length === 0 ? React.createElement(ChatWelcome, {status:status, onGuide:setGuide, intStatus:intStatus}) : null,
      messages.map(function(m, i) { return React.createElement(ChatBubble, {key:i, message:m}); }),
      sending ? React.createElement('div', {style:{display:'flex',justifyContent:'flex-start',marginBottom:16,paddingRight:60}},
        React.createElement('div', {style:{padding:'12px 16px',borderRadius:'16px 16px 16px 4px',background:'var(--card)',boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}},
          React.createElement(TypingDots))) : null),

    React.createElement('div', {style:{padding:'12px 16px',borderTop:'1px solid var(--border)',background:'var(--card)'}},
      !chatReady ? React.createElement('div', {style:{textAlign:'center',padding:'6px 0 10px',fontSize:13,color:'var(--dim)'}},
        '\uD83D\uDD11 Connect an API key to start chatting ',
        React.createElement('button', {onClick:function(){setGuide('apiKey');},
          style:{background:'var(--accent)',color:'#1a1a1a',border:'none',padding:'4px 14px',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}},
          'Set Up Now')) : null,
      React.createElement('div', {style:{display:'flex',gap:8,alignItems:'flex-end'}},
        React.createElement('textarea', {
          value: input,
          onChange: function(e) { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; },
          onKeyDown: handleKeyDown,
          placeholder: chatReady ? 'Type a message... (Enter to send)' : 'Connect an API key first...',
          disabled: !chatReady || sending,
          rows: 1,
          style: {flex:1,padding:'12px 16px',borderRadius:12,border:'2px solid '+(chatReady?'var(--border)':'rgba(255,80,80,0.2)'),
            background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit',
            resize:'none',outline:'none',minHeight:44,maxHeight:120,opacity:chatReady?1:0.4,transition:'all 0.2s'}
        }),
        React.createElement('button', {
          onClick: sendMessage, disabled: !chatReady || sending || !input.trim(),
          style:{width:44,height:44,borderRadius:12,border:'none',
            background:(!chatReady||!input.trim())?'var(--border)':'var(--accent)',
            color:(!chatReady||!input.trim())?'var(--muted)':'#1a1a1a',
            fontSize:18,cursor:chatReady&&input.trim()?'pointer':'default',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}
        }, sending ? '\u23F3' : '\u2191'),
        messages.length > 0 ? React.createElement('button', {
          onClick: clearHistory, title: 'Clear chat',
          style:{width:44,height:44,borderRadius:12,border:'1px solid var(--border)',background:'transparent',
            color:'var(--muted)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}
        }, '\uD83D\uDDD1') : null)),

    React.createElement('style', null,
      '@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }'));
}
