(function(){
  // Simple app state: show onboarding first, then main app
  function $(id){return document.getElementById(id);}

  function init(){
    const seen = localStorage.getItem('mp_seen_onboarding');
    if(seen === '1'){
      showApp();
    } else {
      showOnboarding();
    }

    // wire buttons
    $('startAppBtn') && $('startAppBtn').addEventListener('click', () => {
      localStorage.setItem('mp_seen_onboarding', '1');
      showApp();
    });

    // register other app handlers
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/service-worker.js').then(()=> {
        console.log('SW registrado.');
      }).catch(err => console.warn('SW falhou', err));
    }
  }

  function showOnboarding(){
    document.body.classList.add('onboarding-active');
    $('onboarding').style.display = 'flex';
    $('appShell').style.display = 'none';
  }
  function showApp(){
    document.body.classList.remove('onboarding-active');
    $('onboarding').style.display = 'none';
    $('appShell').style.display = 'block';
  }

  // app logic (same generator previously)
  const exercises = {
    full: {
      chest: ["Supino reto", "Supino inclinado", "Crossover"],
      back: ["Puxada frente", "Remada baixa", "Pullover"],
      legs: ["Agachamento", "Leg press", "Cadeira extensora", "Flexora"],
      shoulders: ["Desenvolvimento", "Elevação lateral", "Face pull"],
      arms: ["Rosca direta", "Rosca alternada", "Tríceps pulley"],
      core: ["Prancha", "Crunch", "Russian twist"]
    }
  };

  function pick(arr, n){
    const copy = [...arr];
    const out = [];
    while(out.length < n && copy.length){
      const i = Math.floor(Math.random()*copy.length);
      out.push(copy.splice(i,1)[0]);
    }
    return out;
  }

  function getSetsReps(goal, level){
    if(goal === "strength"){
      if(level==="beginner") return {sets:3, reps:"4-6"};
      if(level==="intermediate") return {sets:4, reps:"3-5"};
      return {sets:5, reps:"1-5"};
    }
    if(goal === "endurance"){
      return {sets:3, reps:"12-20"};
    }
    if(goal === "fatloss"){
      if(level==="beginner") return {sets:3, reps:"8-12"};
      return {sets:4, reps:"8-15"};
    }
    if(level==="beginner") return {sets:3, reps:"8-12"};
    if(level==="intermediate") return {sets:4, reps:"6-12"};
    return {sets:4, reps:"6-12"};
  }

  // DOM helpers & elements
  function $(id){ return document.getElementById(id); }
  const els = {
    goal: null, level: null, days: null, name: null,
    generate: null, planOutput: null, historyList: null,
    restSelect: null, startTimerBtn: null, timerDisplay: null
  };

  document.addEventListener('DOMContentLoaded', () => {
    // after DOM ready, map elements and attach events
    els.goal = document.getElementById('goal');
    els.level = document.getElementById('level');
    els.days = document.getElementById('days');
    els.name = document.getElementById('name');
    els.generate = document.getElementById('generate');
    els.planOutput = document.getElementById('plan-output');
    els.historyList = document.getElementById('historyList');
    els.restSelect = document.getElementById('restSelect');
    els.startTimerBtn = document.getElementById('startTimerBtn');
    els.timerDisplay = document.getElementById('timerDisplay');

    els.generate && els.generate.addEventListener('click', generatePlan);
    document.getElementById('exportTxt') && document.getElementById('exportTxt').addEventListener('click', exportTxt);
    document.getElementById('todayBtn') && document.getElementById('todayBtn').addEventListener('click', todayPlan);
    document.getElementById('saveProfile') && document.getElementById('saveProfile').addEventListener('click', saveProfile);
    document.getElementById('clearHistory') && document.getElementById('clearHistory').addEventListener('click', function(){
      if(!confirm('Limpar histórico local?')) return;
      localStorage.removeItem('mp_history');
      localStorage.removeItem('mp_lastplan');
      renderHistory();
      els.planOutput.innerText = 'Nenhum treino gerado ainda.';
    });
    document.getElementById('startTimerBtn') && document.getElementById('startTimerBtn').addEventListener('click', startTimer);

    loadProfile();
    renderHistory();
  });

  // history & storage
  function saveHistory(item){
    const hist = JSON.parse(localStorage.getItem('mp_history')||'[]');
    hist.unshift(item);
    if(hist.length>50) hist.splice(50);
    localStorage.setItem('mp_history', JSON.stringify(hist));
    renderHistory();
  }

  function renderHistory(){
    const hist = JSON.parse(localStorage.getItem('mp_history')||'[]');
    if(!hist.length){ document.getElementById('historyList').innerHTML = '<small>Sem registros.</small>'; return; }
    const html = hist.map(h=>{
      return `<div class="history-item"><strong>${h.title}</strong><div style="font-size:13px;color:#444;margin-top:6px;white-space:pre-wrap">${h.text}</div><small style="color:#777">Gerado em ${new Date(h.ts).toLocaleString()}</small></div><hr/>`;
    }).join('');
    document.getElementById('historyList').innerHTML = html;
  }

  // plan generation (same as before)
  function generatePlan(){
    const goal = els.goal.value;
    const level = els.level.value;
    const days = Math.max(1, Math.min(6, parseInt(els.days.value || 3)));
    const name = (els.name.value || '').trim();
    const setsReps = getSetsReps(goal, level);

    const plan = [];
    for(let d=1; d<=days; d++){
      let focus = [];
      if(days <= 2) focus = ["full"];
      else if(days === 3){
        if(d===1) focus=["full"]; else if(d===2) focus=["upper"]; else focus=["lower"];
      } else if(days === 4){
        focus = (d%2===1) ? ["upper"] : ["lower"];
      } else if(days === 5){
        if(d<=3) focus = (d===1?["push"]:d===2?["pull"]:["legs"]); else focus = ["full"];
      } else {
        if(d%3===1) focus=["push"];
        if(d%3===2) focus=["pull"];
        if(d%3===0) focus=["legs"];
      }

      const dayExercises = [];
      if(focus.includes("full")){
        const groups = ["chest","back","legs","shoulders","core"];
        groups.forEach(g=>{
          const pool = exercises.full[g] || [];
          const pickCount = (g==="legs"||g==="back") ? 2 : 1;
          pick(pool, pickCount).forEach(s=> dayExercises.push({muscle:g, name:s}));
        });
      } else if(focus.includes("upper")){
        ["chest","back","shoulders","arms","core"].forEach(g=>{
          const pool = exercises.full[g] || [];
          const pickCount = (g==="arms") ? 2 : 1;
          pick(pool, pickCount).forEach(s=> dayExercises.push({muscle:g, name:s}));
        });
      } else if(focus.includes("lower") || focus.includes("legs")){
        ["legs","core"].forEach(g=>{
          const pool = exercises.full[g] || [];
          const pickCount = (g==="legs") ? 3 : 1;
          pick(pool, pickCount).forEach(s=> dayExercises.push({muscle:g, name:s}));
        });
      } else if(focus.includes("push")){
        ["chest","shoulders","arms","core"].forEach(g=>{
          const pool = exercises.full[g] || [];
          const pickCount = (g==="arms")?2:1;
          pick(pool, pickCount).forEach(s=> dayExercises.push({muscle:g, name:s}));
        });
      } else if(focus.includes("pull")){
        ["back","arms","core"].forEach(g=>{
          const pool = exercises.full[g] || [];
          const pickCount = (g==="arms")?2:1;
          pick(pool, pickCount).forEach(s=> dayExercises.push({muscle:g, name:s}));
        });
      }

      plan.push({
        day: d,
        focus: focus.join(', '),
        exercises: dayExercises.map(e => ({...e, sets: setsReps.sets, reps: setsReps.reps}))
      });
    }

    const title = `${name ? name + ' — ' : ''}Plano (${days} dias) — ${goal} — ${level}`;
    let text = title + "\n\n";
    plan.forEach(p=>{
      text += `Dia ${p.day} — ${p.focus}\n`;
      p.exercises.forEach((ex,i)=>{
        text += ` ${i+1}. ${ex.name} — ${ex.sets} x ${ex.reps}\n`;
      });
      text += "\n";
    });

    const obj = { title, text, ts: Date.now(), profile: {goal, level, days, name} };
    saveHistory(obj);
    localStorage.setItem('mp_lastplan', JSON.stringify(obj));
    document.getElementById('plan-output').innerText = text;
  }

  function exportTxt(){
    const lp = JSON.parse(localStorage.getItem('mp_lastplan')||'null');
    if(!lp){ alert('Nenhum treino disponível para exportar. Gere um treino primeiro.'); return; }
    const blob = new Blob([lp.text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lp.title.replace(/\s+/g,'_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function todayPlan(){
    const lp = JSON.parse(localStorage.getItem('mp_lastplan')||'null');
    if(!lp){ alert('Nenhum treino gerado ainda.'); return; }
    alert(lp.text);
  }

  function saveProfile(){
    const profile = {
      name: document.getElementById('name').value,
      goal: document.getElementById('goal').value,
      level: document.getElementById('level').value,
      days: document.getElementById('days').value
    };
    localStorage.setItem('mp_profile', JSON.stringify(profile));
    alert('Perfil salvo localmente.');
  }

  function loadProfile(){
    const p = JSON.parse(localStorage.getItem('mp_profile')||'null');
    if(!p) return;
    document.getElementById('name').value = p.name||'';
    document.getElementById('goal').value = p.goal||'hypertrophy';
    document.getElementById('level').value = p.level||'beginner';
    document.getElementById('days').value = p.days||3;
  }

  // timer
  let timerInterval = null;
  function startTimer(){
    const val = parseInt(document.getElementById('restSelect').value, 10);
    if(isNaN(val) || val <= 0) return;
    let remaining = val;
    document.getElementById('timerDisplay').innerText = formatTime(remaining);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remaining--;
      if(remaining <= 0){
        clearInterval(timerInterval);
        document.getElementById('timerDisplay').innerText = "00:00";
        navigator.vibrate && navigator.vibrate(500);
        alert('Descanso encerrado!');
        return;
      }
      document.getElementById('timerDisplay').innerText = formatTime(remaining);
    }, 1000);
  }
  function formatTime(sec){
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return m+':'+s;
  }

  // start
  init();

})();