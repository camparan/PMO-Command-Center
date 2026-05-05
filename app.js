/* ============================================================
   PMO COMMAND CENTER — app.js
   Single-file SPA: no build tools, no server needed.
   Data is persisted in the browser's localStorage.
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n) {
  if (n == null || n === '') return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

function statusClass(s) {
  return {
    'On Track': 'status-green', 'Completed': 'status-green', 'Done': 'status-green',
    'Mitigated': 'status-green', 'Closed': 'status-green',
    'At Risk': 'status-yellow', 'In Progress': 'status-blue', 'On Hold': 'status-yellow',
    'To Do': 'status-gray',
    'Off Track': 'status-red', 'Blocked': 'status-red', 'Open': 'status-red',
  }[s] || 'status-gray';
}

function priClass(p) {
  return { Critical: 'priority-critical', High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' }[p] || '';
}

function riskScore(prob, impact) {
  const w = { High: 3, Medium: 2, Low: 1 };
  const n = w[prob] * w[impact];
  if (n >= 6) return { n, label: 'Critical', cls: 'text-red' };
  if (n >= 4) return { n, label: 'High',     cls: 'text-red' };
  if (n >= 2) return { n, label: 'Medium',   cls: 'text-yellow' };
  return            { n, label: 'Low',      cls: 'text-green' };
}

function projectName(id) {
  const p = DB.projects.find(x => x.id === id);
  return p ? p.name : 'Unknown';
}

function resourceName(id) {
  const r = DB.resources.find(x => x.id === id);
  return r ? r.name : (id ? id : 'Unassigned');
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
// SAMPLE DATA (loaded on first visit)
// ─────────────────────────────────────────────
const SAMPLE = {
  projects: [
    { id:'p1', name:'ERP System Upgrade', description:'Migrate legacy ERP to cloud-based SAP S/4HANA — data migration, integrations & training.', status:'On Track', priority:'Critical', phase:'Execution', owner:'Sarah Chen', department:'IT', progress:45, startDate:'2025-01-15', endDate:'2025-09-30', budget:450000, budgetSpent:198000 },
    { id:'p2', name:'HQ Office Relocation', description:'Relocate headquarters to new campus — 500+ employees across 5 floors.', status:'At Risk', priority:'High', phase:'Execution', owner:'Marcus Johnson', department:'Facilities', progress:60, startDate:'2025-02-01', endDate:'2025-06-30', budget:220000, budgetSpent:165000 },
    { id:'p3', name:'Customer Portal Redesign', description:'Modern UX overhaul of customer self-service portal to reduce support volume.', status:'On Track', priority:'High', phase:'Execution', owner:'Priya Patel', department:'Marketing', progress:75, startDate:'2025-01-06', endDate:'2025-05-31', budget:120000, budgetSpent:88000 },
    { id:'p4', name:'Data Center Migration', description:'Migrate on-premise data center to AWS — 400+ servers, zero-downtime goal.', status:'Off Track', priority:'Critical', phase:'Planning', owner:'Robert Kim', department:'IT', progress:28, startDate:'2025-01-01', endDate:'2025-12-31', budget:680000, budgetSpent:245000 },
    { id:'p5', name:'HR Process Automation', description:'Automate onboarding, payroll workflows and performance review cycles.', status:'On Track', priority:'Medium', phase:'Planning', owner:'Linda Torres', department:'HR', progress:20, startDate:'2025-03-01', endDate:'2025-10-31', budget:95000, budgetSpent:18000 },
    { id:'p6', name:'Supply Chain Optimisation', description:'AI-powered demand forecasting and inventory optimisation system.', status:'Completed', priority:'High', phase:'Closure', owner:'David Park', department:'Operations', progress:100, startDate:'2024-09-01', endDate:'2025-02-28', budget:310000, budgetSpent:298000 },
    { id:'p7', name:'Compliance & Audit Initiative', description:'SOX controls implementation and FY2025 compliance audit programme.', status:'On Hold', priority:'High', phase:'Monitoring', owner:'Jennifer Walsh', department:'Legal', progress:40, startDate:'2025-01-15', endDate:'2025-06-30', budget:85000, budgetSpent:34000 },
    { id:'p8', name:'Mobile App Development', description:'Native iOS & Android app for field service teams — offline-capable.', status:'At Risk', priority:'Medium', phase:'Execution', owner:'Priya Patel', department:'IT', progress:55, startDate:'2025-02-15', endDate:'2025-08-31', budget:175000, budgetSpent:112000 },
  ],
  resources: [
    { id:'r1', name:'Sarah Chen',      role:'PMO Director',           department:'PMO',        email:'sarah.chen@company.com',    capacity:40 },
    { id:'r2', name:'Alex Rivera',     role:'Senior IT Architect',    department:'IT',         email:'alex.rivera@company.com',   capacity:40 },
    { id:'r3', name:'Marcus Johnson',  role:'Facilities Manager',     department:'Facilities', email:'marcus.j@company.com',      capacity:40 },
    { id:'r4', name:'Linda Torres',    role:'Change Management Lead', department:'HR',         email:'linda.torres@company.com',  capacity:40 },
    { id:'r5', name:'Priya Patel',     role:'Product & UX Lead',      department:'Marketing',  email:'priya.patel@company.com',   capacity:40 },
    { id:'r6', name:'Robert Kim',      role:'Security Architect',     department:'IT',         email:'robert.kim@company.com',    capacity:40 },
    { id:'r7', name:'James Wilson',    role:'iOS Developer',          department:'IT',         email:'james.w@company.com',       capacity:40 },
    { id:'r8', name:'Aisha Okonkwo',   role:'Android Developer',      department:'IT',         email:'aisha.o@company.com',       capacity:40 },
  ],
  tasks: [
    { id:'t1',  projectId:'p1', name:'Complete data migration blueprint',       assignee:'r2', status:'Done',        priority:'High',   dueDate:'2025-03-15', notes:'' },
    { id:'t2',  projectId:'p1', name:'UAT Phase 1 — Finance module',            assignee:'r1', status:'In Progress', priority:'High',   dueDate:'2025-05-20', notes:'Testing 80% complete' },
    { id:'t3',  projectId:'p1', name:'User training curriculum development',    assignee:'r4', status:'In Progress', priority:'Medium', dueDate:'2025-06-01', notes:'' },
    { id:'t4',  projectId:'p1', name:'Legacy data cleanup sprint',              assignee:'r2', status:'To Do',       priority:'High',   dueDate:'2025-06-15', notes:'' },
    { id:'t5',  projectId:'p2', name:'Finalise floor plan layout',              assignee:'r3', status:'Done',        priority:'High',   dueDate:'2025-03-01', notes:'' },
    { id:'t6',  projectId:'p2', name:'IT infrastructure setup at new site',     assignee:'r2', status:'Blocked',     priority:'High',   dueDate:'2025-05-15', notes:'Waiting for contractor access' },
    { id:'t7',  projectId:'p2', name:'Employee communication plan',             assignee:'r4', status:'In Progress', priority:'Medium', dueDate:'2025-05-10', notes:'' },
    { id:'t8',  projectId:'p3', name:'UX wireframes approved by stakeholders',  assignee:'r5', status:'Done',        priority:'High',   dueDate:'2025-02-15', notes:'' },
    { id:'t9',  projectId:'p3', name:'Front-end development — Phase 2',         assignee:'r2', status:'In Progress', priority:'High',   dueDate:'2025-05-01', notes:'On track' },
    { id:'t10', projectId:'p3', name:'Integration & regression testing',        assignee:'r2', status:'To Do',       priority:'High',   dueDate:'2025-05-15', notes:'' },
    { id:'t11', projectId:'p4', name:'AWS architecture design & sign-off',      assignee:'r2', status:'Done',        priority:'Critical',dueDate:'2025-02-28',notes:'' },
    { id:'t12', projectId:'p4', name:'Security assessment & pen testing',       assignee:'r6', status:'Blocked',     priority:'Critical',dueDate:'2025-04-30',notes:'Awaiting vendor response' },
    { id:'t13', projectId:'p4', name:'Network configuration & firewall rules',  assignee:'r2', status:'To Do',       priority:'High',   dueDate:'2025-07-31', notes:'' },
    { id:'t14', projectId:'p5', name:'HR process documentation',                assignee:'r4', status:'In Progress', priority:'Medium', dueDate:'2025-04-30', notes:'' },
    { id:'t15', projectId:'p5', name:'Vendor evaluation & selection',           assignee:'r1', status:'Done',        priority:'High',   dueDate:'2025-03-31', notes:'' },
    { id:'t16', projectId:'p8', name:'API design and documentation',            assignee:'r2', status:'Done',        priority:'High',   dueDate:'2025-03-31', notes:'' },
    { id:'t17', projectId:'p8', name:'iOS development — Sprint 3',              assignee:'r7', status:'In Progress', priority:'High',   dueDate:'2025-05-31', notes:'Behind schedule' },
    { id:'t18', projectId:'p8', name:'Android development — Sprint 3',         assignee:'r8', status:'In Progress', priority:'High',   dueDate:'2025-05-31', notes:'On track' },
  ],
  risks: [
    { id:'rk1',  projectId:'p1', title:'Key resource departure',       description:'Lead SAP consultant may leave before go-live.',                    probability:'Medium', impact:'High',   status:'Open',      owner:'Sarah Chen',     mitigation:'Identify backup consultant; document all configurations.', dateIdentified:'2025-02-10' },
    { id:'rk2',  projectId:'p1', title:'Data quality issues in legacy', description:'Legacy data integrity issues may delay migration.',                probability:'High',   impact:'High',   status:'Open',      owner:'Alex Rivera',    mitigation:'Run data cleansing sprint before migration phase.',         dateIdentified:'2025-01-20' },
    { id:'rk3',  projectId:'p2', title:'Construction delays',           description:'New facility renovation running over schedule.',                   probability:'High',   impact:'High',   status:'Open',      owner:'Marcus Johnson', mitigation:'Add 30-day buffer; identify temp workspace options.',       dateIdentified:'2025-02-15' },
    { id:'rk4',  projectId:'p2', title:'Budget overrun',                description:'Moving costs exceeding estimates by ~25%.',                        probability:'High',   impact:'Medium', status:'Open',      owner:'Marcus Johnson', mitigation:'Request budget reforecast; explore cost reductions.',        dateIdentified:'2025-03-01' },
    { id:'rk5',  projectId:'p4', title:'Security compliance gap',       description:'AWS migration may create temporary security control gaps.',        probability:'Medium', impact:'High',   status:'Open',      owner:'Robert Kim',     mitigation:'Hybrid environment review; phased migration approach.',     dateIdentified:'2025-01-15' },
    { id:'rk6',  projectId:'p4', title:'Vendor lock-in risk',           description:'Heavy AWS dependency could limit future flexibility.',             probability:'Low',    impact:'High',   status:'Mitigated', owner:'Alex Rivera',    mitigation:'Implemented cloud-agnostic architecture patterns.',         dateIdentified:'2025-01-10' },
    { id:'rk7',  projectId:'p8', title:'App Store rejection',           description:'App may fail App Store review due to policy compliance issues.',   probability:'Medium', impact:'Medium', status:'Open',      owner:'James Wilson',   mitigation:'Pre-submission review against App Store guidelines.',       dateIdentified:'2025-03-15' },
    { id:'rk8',  projectId:'p3', title:'Integration complexity',        description:'CRM integration more complex than originally scoped.',             probability:'Medium', impact:'Medium', status:'Mitigated', owner:'Priya Patel',    mitigation:'Added 2-week buffer; engaged additional developer.',        dateIdentified:'2025-02-01' },
    { id:'rk9',  projectId:'p5', title:'User adoption resistance',      description:'HR staff may resist new automated workflows.',                     probability:'Medium', impact:'Medium', status:'Open',      owner:'Linda Torres',   mitigation:'Change management workshops; champion network programme.',  dateIdentified:'2025-03-20' },
    { id:'rk10', projectId:'p1', title:'Scope creep',                   description:'Business units requesting additional ERP modules not in scope.',   probability:'High',   impact:'Medium', status:'Open',      owner:'Sarah Chen',     mitigation:'Strict change control process; executive sponsor alignment.',dateIdentified:'2025-02-20' },
  ],
};

// ─────────────────────────────────────────────
// DATA LAYER  (localStorage persistence)
// ─────────────────────────────────────────────
const STORAGE_KEY = 'pmo_v1';
let DB = {};

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    DB = raw ? JSON.parse(raw) : deepClone(SAMPLE);
  } catch (e) {
    DB = deepClone(SAMPLE);
  }
  saveDB();
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function resetData() {
  if (confirm('Reset all data back to the sample portfolio? Your changes will be lost.')) {
    localStorage.removeItem(STORAGE_KEY);
    loadDB();
    navigate(currentPage);
  }
}

// ─────────────────────────────────────────────
// ROUTER / NAVIGATION
// ─────────────────────────────────────────────
let currentPage = 'dashboard';
let charts = {};   // active Chart.js instances

function destroyCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch (_) {} });
  charts = {};
}

function navigate(page) {
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const titles = { dashboard:'Dashboard', projects:'Projects', tasks:'Tasks', resources:'Resources', risks:'Risks & Issues', timeline:'Timeline', reports:'Reports' };
  document.getElementById('page-title').textContent = titles[page] || page;

  const addLabels = { dashboard:'+ Add Project', projects:'+ Add Project', tasks:'+ Add Task', resources:'+ Add Member', risks:'+ Add Risk' };
  const btn = document.getElementById('add-btn');
  if (addLabels[page]) { btn.textContent = addLabels[page]; btn.style.display = ''; }
  else { btn.style.display = 'none'; }

  destroyCharts();

  const pages = { dashboard: renderDashboard, projects: renderProjects, tasks: renderTasks, resources: renderResources, risks: renderRisks, timeline: renderTimeline, reports: renderReports };
  if (pages[page]) pages[page]();
}

function handleAddClick() {
  if (currentPage === 'dashboard' || currentPage === 'projects') openProjectModal();
  else if (currentPage === 'tasks')     openTaskModal();
  else if (currentPage === 'resources') openResourceModal();
  else if (currentPage === 'risks')     openRiskModal();
}

// ─────────────────────────────────────────────
// RENDER — DASHBOARD
// ─────────────────────────────────────────────
function renderDashboard() {
  const { projects, tasks, risks } = DB;

  const total     = projects.length;
  const onTrack   = projects.filter(p => p.status === 'On Track').length;
  const atRisk    = projects.filter(p => p.status === 'At Risk').length;
  const offTrack  = projects.filter(p => p.status === 'Off Track').length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const onHold    = projects.filter(p => p.status === 'On Hold').length;

  const overdueTasks = tasks.filter(t => t.status !== 'Done' && isOverdue(t.dueDate)).length;
  const openRisks    = risks.filter(r => r.status === 'Open').length;

  const totalBudget = projects.reduce((s,p) => s + (p.budget||0), 0);
  const totalSpent  = projects.reduce((s,p) => s + (p.budgetSpent||0), 0);
  const budgetPct   = totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0;

  const active = projects.filter(p => !['Completed','On Hold'].includes(p.status));
  const avgProg = active.length ? Math.round(active.reduce((s,p) => s + p.progress, 0) / active.length) : 0;

  const activeTasks = tasks.filter(t => ['In Progress','Blocked'].includes(t.status)).slice(0,6);

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="kpi-grid">
    ${kpiCard('📁','kpi-blue', total,       'Total Projects')}
    ${kpiCard('✅','kpi-green', onTrack,    'On Track',   true, 'projects')}
    ${kpiCard('⚠️','kpi-yellow', atRisk,    'At Risk',    true, 'projects')}
    ${kpiCard('🚨','kpi-red',   offTrack,   'Off Track',  true, 'projects')}
    ${kpiCard('📋','kpi-red',   overdueTasks,'Overdue Tasks',true,'tasks')}
    ${kpiCard('⚡','kpi-red',   openRisks,  'Open Risks', true, 'risks')}
    ${kpiCard('💰','kpi-blue',  budgetPct+'%','Budget Used')}
    ${kpiCard('📊','kpi-blue',  avgProg+'%','Avg Progress (active)')}
  </div>

  <div class="charts-row">
    <div class="card chart-card">
      <div class="card-header"><h3>Portfolio Status</h3></div>
      <div class="chart-container"><canvas id="chartStatus"></canvas></div>
    </div>
    <div class="card chart-card">
      <div class="card-header"><h3>Budget vs Spent</h3></div>
      <div class="chart-container"><canvas id="chartBudget"></canvas></div>
    </div>
  </div>

  <div class="dashboard-row">
    <div class="card">
      <div class="card-header">
        <h3>Project Health</h3>
        <a href="#" class="card-link" onclick="navigate('projects');return false;">View All →</a>
      </div>
      <div class="project-health-list">
        ${projects.filter(p => p.status !== 'Completed').map(p => `
          <div class="health-item" onclick="navigate('projects')">
            <div class="health-name" title="${esc(p.name)}">${esc(p.name)}</div>
            <div class="health-details">
              <span class="status-badge ${statusClass(p.status)}">${p.status}</span>
              <div class="progress-mini"><div class="progress-bar-mini" style="width:${p.progress}%"></div></div>
              <span class="progress-pct">${p.progress}%</span>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Active &amp; Blocked Tasks</h3>
        <a href="#" class="card-link" onclick="navigate('tasks');return false;">View All →</a>
      </div>
      <div class="task-list">
        ${activeTasks.length === 0
          ? '<p class="empty-msg">No active tasks</p>'
          : activeTasks.map(t => `
          <div class="task-item">
            <span class="status-badge ${statusClass(t.status)}">${t.status}</span>
            <div class="task-info">
              <div class="task-name">${esc(t.name)}</div>
              <div class="task-meta">${esc(projectName(t.projectId))} · ${esc(resourceName(t.assignee))} · Due: ${formatDate(t.dueDate)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;

  // Charts
  const ctx1 = document.getElementById('chartStatus');
  if (ctx1) {
    charts.status = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['On Track','At Risk','Off Track','Completed','On Hold'],
        datasets: [{ data: [onTrack, atRisk, offTrack, completed, onHold], backgroundColor: ['#22c55e','#f59e0b','#ef4444','#3b82f6','#94a3b8'], borderWidth: 2, borderColor:'#fff' }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
    });
  }

  const budgetProjects = projects.filter(p => p.budget > 0).slice(0, 7);
  const ctx2 = document.getElementById('chartBudget');
  if (ctx2 && budgetProjects.length) {
    charts.budget = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: budgetProjects.map(p => p.name.length > 18 ? p.name.slice(0,18)+'…' : p.name),
        datasets: [
          { label:'Budget', data: budgetProjects.map(p => p.budget),      backgroundColor:'rgba(59,130,246,.25)', borderColor:'#3b82f6', borderWidth:1 },
          { label:'Spent',  data: budgetProjects.map(p => p.budgetSpent), backgroundColor:'rgba(239,68,68,.45)',  borderColor:'#ef4444', borderWidth:1 }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom' } },
        scales: {
          x: { ticks:{ font:{ size:10 } } },
          y: { ticks:{ callback: v => v >= 1e6 ? '$'+(v/1e6).toFixed(1)+'M' : v >= 1000 ? '$'+(v/1000).toFixed(0)+'K' : '$'+v } }
        }
      }
    });
  }
}

function kpiCard(icon, colorClass, value, label, clickable = false, page = '') {
  const click = clickable ? `onclick="navigate('${page}')"` : '';
  return `
  <div class="kpi-card ${clickable ? 'clickable' : ''}" ${click}>
    <div class="kpi-icon ${colorClass}">${icon}</div>
    <div class="kpi-content">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// RENDER — PROJECTS
// ─────────────────────────────────────────────
let pFilter = { status:'all', priority:'all', search:'' };

function renderProjects() {
  let list = DB.projects;
  if (pFilter.status !== 'all')   list = list.filter(p => p.status   === pFilter.status);
  if (pFilter.priority !== 'all') list = list.filter(p => p.priority === pFilter.priority);
  if (pFilter.search) {
    const s = pFilter.search.toLowerCase();
    list = list.filter(p => [p.name, p.owner, p.department].some(f => (f||'').toLowerCase().includes(s)));
  }

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="filter-bar">
    <input class="filter-search" type="text" placeholder="🔍 Search projects…" value="${esc(pFilter.search)}"
      oninput="pFilter.search=this.value; renderProjects()">
    <select class="filter-select" onchange="pFilter.status=this.value; renderProjects()">
      ${['all','On Track','At Risk','Off Track','On Hold','Completed'].map(s =>
        `<option value="${s}" ${pFilter.status===s?'selected':''}>${s==='all'?'All Status':s}</option>`).join('')}
    </select>
    <select class="filter-select" onchange="pFilter.priority=this.value; renderProjects()">
      ${['all','Critical','High','Medium','Low'].map(s =>
        `<option value="${s}" ${pFilter.priority===s?'selected':''}>${s==='all'?'All Priority':s}</option>`).join('')}
    </select>
    <span class="filter-count">${list.length} project${list.length!==1?'s':''}</span>
  </div>
  <div class="project-cards">
    ${list.map(projectCard).join('')}
    ${list.length === 0 ? `<div class="empty-state"><p>No projects match your filters.</p><button class="btn btn-primary" onclick="openProjectModal()">+ Add Project</button></div>` : ''}
  </div>
</div>`;
}

function projectCard(p) {
  const bPct     = p.budget > 0 ? Math.round(p.budgetSpent / p.budget * 100) : 0;
  const pTasks   = DB.tasks.filter(t => t.projectId === p.id);
  const doneTasks= pTasks.filter(t => t.status === 'Done').length;
  const blkTasks = pTasks.filter(t => t.status === 'Blocked').length;
  const barColor = p.progress >= 75 ? '#22c55e' : p.progress >= 40 ? '#3b82f6' : '#f59e0b';
  return `
<div class="project-card">
  <div class="project-card-header">
    <div class="project-card-title">
      <span class="priority-dot ${priClass(p.priority)}" title="${p.priority}"></span>
      <h3 title="${esc(p.name)}">${esc(p.name)}</h3>
    </div>
    <div class="project-card-actions">
      <button class="btn-icon" onclick="openProjectModal('${p.id}')" title="Edit">✏️</button>
      <button class="btn-icon" onclick="confirmDelete('project','${p.id}')" title="Delete">🗑️</button>
    </div>
  </div>
  <div class="project-card-meta">
    <span class="status-badge ${statusClass(p.status)}">${p.status}</span>
    <span class="meta-item">📁 ${p.phase}</span>
    <span class="meta-item">🏢 ${esc(p.department||'')}</span>
  </div>
  ${p.description ? `<p class="project-desc">${esc(p.description)}</p>` : ''}
  <div class="project-progress">
    <div class="progress-header"><span>Progress</span><span>${p.progress}%</span></div>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${p.progress}%;background:${barColor}"></div></div>
  </div>
  <div class="project-stats">
    <div class="stat"><div class="stat-label">Owner</div><div class="stat-value">${esc(p.owner||'—')}</div></div>
    <div class="stat"><div class="stat-label">End Date</div><div class="stat-value ${isOverdue(p.endDate)&&p.status!=='Completed'?'text-red':''}">${formatDate(p.endDate)}</div></div>
    <div class="stat"><div class="stat-label">Budget</div><div class="stat-value ${bPct>100?'text-red':''}">${formatCurrency(p.budgetSpent)} / ${formatCurrency(p.budget)}</div></div>
    <div class="stat"><div class="stat-label">Tasks</div><div class="stat-value">${doneTasks}/${pTasks.length} done${blkTasks>0?` · <span class="text-red">${blkTasks} blocked</span>`:''}</div></div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────
// RENDER — TASKS (Kanban)
// ─────────────────────────────────────────────
let tFilter = { projectId:'all', status:'all', search:'' };

function renderTasks() {
  let list = DB.tasks;
  if (tFilter.projectId !== 'all') list = list.filter(t => t.projectId === tFilter.projectId);
  if (tFilter.status    !== 'all') list = list.filter(t => t.status    === tFilter.status);
  if (tFilter.search) {
    const s = tFilter.search.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(s));
  }

  const cols = ['To Do','In Progress','Blocked','Done'];

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="filter-bar">
    <input class="filter-search" type="text" placeholder="🔍 Search tasks…" value="${esc(tFilter.search)}"
      oninput="tFilter.search=this.value; renderTasks()">
    <select class="filter-select" onchange="tFilter.projectId=this.value; renderTasks()">
      <option value="all">All Projects</option>
      ${DB.projects.map(p => `<option value="${p.id}" ${tFilter.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
    </select>
    <select class="filter-select" onchange="tFilter.status=this.value; renderTasks()">
      ${['all','To Do','In Progress','Blocked','Done'].map(s =>
        `<option value="${s}" ${tFilter.status===s?'selected':''}>${s==='all'?'All Status':s}</option>`).join('')}
    </select>
    <span class="filter-count">${list.length} task${list.length!==1?'s':''}</span>
  </div>
  <div class="kanban-board">
    ${cols.map(col => {
      const colTasks = list.filter(t => t.status === col);
      return `
      <div class="kanban-column">
        <div class="kanban-col-header ${statusClass(col)}">
          <span>${col}</span>
          <span class="kanban-count">${colTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${colTasks.map(taskCard).join('')}
          ${colTasks.length===0 ? '<div class="kanban-empty">No tasks</div>' : ''}
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;
}

function taskCard(t) {
  const overdue = t.status !== 'Done' && isOverdue(t.dueDate);
  return `
<div class="kanban-card" onclick="openTaskModal('${t.id}')">
  <div class="kanban-card-title">${esc(t.name)}</div>
  <div class="kanban-card-meta"><span class="priority-badge ${priClass(t.priority)}">${t.priority}</span></div>
  <div class="kanban-card-footer">
    <span class="task-project">${esc(projectName(t.projectId))}</span>
    <span class="task-date ${overdue?'text-red':''}">${formatDate(t.dueDate)}</span>
  </div>
  <div class="kanban-card-assignee">👤 ${esc(resourceName(t.assignee))}</div>
  <div class="kanban-card-actions">
    <button class="btn-icon-sm" onclick="event.stopPropagation();confirmDelete('task','${t.id}')" title="Delete">🗑️</button>
  </div>
</div>`;
}

// ─────────────────────────────────────────────
// RENDER — RESOURCES
// ─────────────────────────────────────────────
function renderResources() {
  const { resources, tasks, projects } = DB;

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="resource-grid">
    ${resources.map(r => {
      const active   = tasks.filter(t => t.assignee === r.id && t.status !== 'Done');
      const projIds  = [...new Set(active.map(t => t.projectId))];
      return `
      <div class="resource-card">
        <div class="resource-card-header">
          <div class="resource-avatar">${r.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div class="resource-info">
            <div class="resource-name">${esc(r.name)}</div>
            <div class="resource-role">${esc(r.role)}</div>
            <div class="resource-dept">${esc(r.department||'')}</div>
          </div>
          <div class="resource-actions">
            <button class="btn-icon" onclick="openResourceModal('${r.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="confirmDelete('resource','${r.id}')" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="resource-stats">
          <div class="resource-stat"><span>Active Tasks</span><strong>${active.length}</strong></div>
          <div class="resource-stat"><span>Projects</span><strong>${projIds.length}</strong></div>
          <div class="resource-stat"><span>Capacity</span><strong>${r.capacity} hrs/wk</strong></div>
        </div>
        ${r.email ? `<div class="resource-email">✉️ ${esc(r.email)}</div>` : ''}
        ${projIds.length > 0 ? `<div class="resource-projects"><span class="label">Projects: </span>${projIds.map(id=>`<span class="project-tag">${esc(projectName(id))}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}
    ${resources.length === 0 ? `<div class="empty-state"><p>No team members yet.</p><button class="btn btn-primary" onclick="openResourceModal()">+ Add Member</button></div>` : ''}
  </div>

  ${resources.length > 0 ? `
  <div class="card" style="margin-top:22px">
    <div class="card-header"><h3>Active Task Allocation by Team Member</h3></div>
    <div class="chart-container" style="height:280px"><canvas id="chartAlloc"></canvas></div>
  </div>` : ''}
</div>`;

  if (resources.length > 0) {
    const counts = resources.map(r => tasks.filter(t => t.assignee===r.id && t.status!=='Done').length);
    const ctx = document.getElementById('chartAlloc');
    if (ctx) {
      charts.alloc = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: resources.map(r => r.name),
          datasets: [{ label:'Active Tasks', data: counts, backgroundColor: counts.map(c => c>5?'#ef4444':c>3?'#f59e0b':'#3b82f6'), borderRadius:5 }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false } },
          scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1 } } }
        }
      });
    }
  }
}

// ─────────────────────────────────────────────
// RENDER — RISKS
// ─────────────────────────────────────────────
let rkFilter = { status:'all', projectId:'all' };

function renderRisks() {
  let list = DB.risks;
  if (rkFilter.status    !== 'all') list = list.filter(r => r.status    === rkFilter.status);
  if (rkFilter.projectId !== 'all') list = list.filter(r => r.projectId === rkFilter.projectId);

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="filter-bar">
    <select class="filter-select" onchange="rkFilter.status=this.value; renderRisks()">
      ${['all','Open','Mitigated','Closed'].map(s =>
        `<option value="${s}" ${rkFilter.status===s?'selected':''}>${s==='all'?'All Status':s}</option>`).join('')}
    </select>
    <select class="filter-select" onchange="rkFilter.projectId=this.value; renderRisks()">
      <option value="all">All Projects</option>
      ${DB.projects.map(p => `<option value="${p.id}" ${rkFilter.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
    </select>
    <span class="filter-count">${list.length} risk${list.length!==1?'s':''}</span>
  </div>

  <div class="risk-matrix-container">
    <div class="card">
      <div class="card-header"><h3>Risk Matrix (Probability × Impact)</h3></div>
      <div class="risk-matrix">
        <div class="matrix-y-label">← Probability</div>
        <div>
          <div class="matrix-grid">
            <div class="matrix-row"><div class="matrix-row-label">High</div><div class="matrix-cell matrix-medium">Medium</div><div class="matrix-cell matrix-high">High</div><div class="matrix-cell matrix-critical">Critical</div></div>
            <div class="matrix-row"><div class="matrix-row-label">Med</div><div class="matrix-cell matrix-low">Low</div><div class="matrix-cell matrix-medium">Medium</div><div class="matrix-cell matrix-high">High</div></div>
            <div class="matrix-row"><div class="matrix-row-label">Low</div><div class="matrix-cell matrix-low">Low</div><div class="matrix-cell matrix-low">Low</div><div class="matrix-cell matrix-medium">Medium</div></div>
            <div class="matrix-col-labels"><div></div><div>Low</div><div>Medium</div><div>High</div></div>
          </div>
          <div class="matrix-x-label">Impact →</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:20px">
    <div class="card-header"><h3>Risk Register</h3></div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Risk</th><th>Project</th><th>Probability</th><th>Impact</th><th>Score</th><th>Status</th><th>Owner</th><th>Mitigation</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${list.map(r => {
            const sc = riskScore(r.probability, r.impact);
            const pCls = r.probability==='High' ? 'status-red' : r.probability==='Medium' ? 'status-yellow' : 'status-green';
            const iCls = r.impact==='High' ? 'status-red' : r.impact==='Medium' ? 'status-yellow' : 'status-green';
            return `<tr>
              <td><div class="risk-title">${esc(r.title)}</div>${r.description?`<div class="risk-desc">${esc(r.description)}</div>`:''}</td>
              <td>${esc(projectName(r.projectId))}</td>
              <td><span class="status-badge ${pCls}">${r.probability}</span></td>
              <td><span class="status-badge ${iCls}">${r.impact}</span></td>
              <td><span class="risk-score ${sc.cls}">${sc.label}</span></td>
              <td><span class="status-badge ${statusClass(r.status)}">${r.status}</span></td>
              <td>${esc(r.owner||'—')}</td>
              <td class="mitigation-cell">${esc(r.mitigation||'—')}</td>
              <td>
                <button class="btn-icon" onclick="openRiskModal('${r.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="confirmDelete('risk','${r.id}')" title="Delete">🗑️</button>
              </td>
            </tr>`;
          }).join('')}
          ${list.length===0 ? '<tr><td colspan="9" class="empty-row">No risks found</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────
// RENDER — TIMELINE
// ─────────────────────────────────────────────
function renderTimeline() {
  const projects = DB.projects.filter(p => p.startDate && p.endDate);

  if (projects.length === 0) {
    document.getElementById('content').innerHTML = `<div class="page-content"><div class="empty-state"><p>No projects with start &amp; end dates to display.</p><button class="btn btn-primary" onclick="navigate('projects')">Go to Projects</button></div></div>`;
    return;
  }

  const allMs = projects.flatMap(p => [+new Date(p.startDate), +new Date(p.endDate)]);
  let minD = new Date(Math.min(...allMs));
  let maxD = new Date(Math.max(...allMs));
  minD = new Date(minD.getFullYear(), minD.getMonth() - 1, 1);
  maxD = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 0);
  const span = maxD - minD;

  const pct = d => Math.max(0, Math.min(100, (+new Date(d) - minD) / span * 100));

  // Build month labels
  const months = [];
  let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
  while (cur <= maxD) {
    months.push({ label: cur.toLocaleDateString('en-US',{month:'short',year:'2-digit'}), p: (cur - minD) / span * 100 });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  const todayP = pct(new Date());

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="card">
    <div class="card-header">
      <h3>Project Timeline — Gantt View</h3>
      <span class="today-legend">▎ Today</span>
    </div>
    <div class="timeline-container">
      <div class="timeline-header">
        <div class="timeline-label-col"></div>
        <div class="timeline-chart-col">
          <div class="timeline-months">
            ${months.map(m=>`<div class="timeline-month" style="left:${m.p}%">${m.label}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="timeline-body" style="margin-top:8px">
        ${projects.map(p => {
          const sp = pct(p.startDate);
          const ep = pct(p.endDate);
          return `
          <div class="timeline-row">
            <div class="timeline-label" title="${esc(p.name)}">${esc(p.name)}</div>
            <div class="timeline-track">
              <div class="today-line" style="left:${todayP}%"></div>
              <div class="timeline-bar ${statusClass(p.status)}"
                   style="left:${sp}%;width:${Math.max(ep-sp,0.5)}%"
                   title="${esc(p.name)}: ${formatDate(p.startDate)} – ${formatDate(p.endDate)}">
                <div class="timeline-progress" style="width:${p.progress}%"></div>
                <span class="timeline-bar-label">${p.progress}%</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────
// RENDER — REPORTS
// ─────────────────────────────────────────────
function renderReports() {
  const { projects, tasks, risks } = DB;

  const totalBudget = projects.reduce((s,p) => s+(p.budget||0), 0);
  const totalSpent  = projects.reduce((s,p) => s+(p.budgetSpent||0), 0);
  const variance    = totalBudget - totalSpent;

  const active    = projects.filter(p => ['On Track','At Risk','Off Track'].includes(p.status));
  const avgProg   = active.length ? Math.round(active.reduce((s,p)=>s+p.progress,0)/active.length) : 0;

  const tByStatus = s => tasks.filter(t=>t.status===s).length;
  const openRisks = risks.filter(r=>r.status==='Open');
  const critRisks = openRisks.filter(r=>['Critical','High'].includes(riskScore(r.probability,r.impact).label));

  document.getElementById('content').innerHTML = `
<div class="page-content">
  <div class="reports-grid">
    <div class="card report-card">
      <div class="card-header"><h3>📋 Portfolio Summary</h3></div>
      <table class="report-table">
        <tr><td>Total Projects</td><td><strong>${projects.length}</strong></td></tr>
        <tr><td>Active</td><td><strong>${active.length}</strong></td></tr>
        <tr><td>Completed</td><td><strong>${projects.filter(p=>p.status==='Completed').length}</strong></td></tr>
        <tr><td>On Hold</td><td><strong>${projects.filter(p=>p.status==='On Hold').length}</strong></td></tr>
        <tr><td>Avg Progress (active)</td><td><strong>${avgProg}%</strong></td></tr>
        <tr class="highlight-row"><td>✅ On Track</td><td><strong class="text-green">${projects.filter(p=>p.status==='On Track').length}</strong></td></tr>
        <tr class="highlight-row"><td>⚠️ At Risk</td><td><strong class="text-yellow">${projects.filter(p=>p.status==='At Risk').length}</strong></td></tr>
        <tr class="highlight-row"><td>🚨 Off Track</td><td><strong class="text-red">${projects.filter(p=>p.status==='Off Track').length}</strong></td></tr>
      </table>
    </div>

    <div class="card report-card">
      <div class="card-header"><h3>💰 Budget Report</h3></div>
      <table class="report-table">
        <tr><td>Total Budget</td><td><strong>${formatCurrency(totalBudget)}</strong></td></tr>
        <tr><td>Total Spent</td><td><strong>${formatCurrency(totalSpent)}</strong></td></tr>
        <tr><td>Remaining</td><td><strong class="${variance<0?'text-red':'text-green'}">${formatCurrency(variance)}</strong></td></tr>
        <tr><td>Utilisation</td><td><strong>${totalBudget>0?Math.round(totalSpent/totalBudget*100):0}%</strong></td></tr>
      </table>
      <div style="padding:0 20px 16px">
        ${projects.filter(p=>p.budget>0).map(p=>{
          const pc = Math.round(p.budgetSpent/p.budget*100);
          const col = pc>100?'#ef4444':pc>80?'#f59e0b':'#22c55e';
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span>${esc(p.name)}</span>
              <span class="${pc>100?'text-red':''}">${pc}%</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min(100,pc)}%;background:${col}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card report-card">
      <div class="card-header"><h3>✅ Task Summary</h3></div>
      <table class="report-table">
        <tr><td>Total Tasks</td><td><strong>${tasks.length}</strong></td></tr>
        <tr><td>To Do</td><td><strong>${tByStatus('To Do')}</strong></td></tr>
        <tr><td>In Progress</td><td><strong class="text-blue">${tByStatus('In Progress')}</strong></td></tr>
        <tr><td>Done</td><td><strong class="text-green">${tByStatus('Done')}</strong></td></tr>
        <tr><td>Blocked</td><td><strong class="text-red">${tByStatus('Blocked')}</strong></td></tr>
        <tr><td>Overdue</td><td><strong class="text-red">${tasks.filter(t=>t.status!=='Done'&&isOverdue(t.dueDate)).length}</strong></td></tr>
      </table>
      <div style="padding:0 20px 16px">
        <div class="chart-container" style="height:160px"><canvas id="chartTasks"></canvas></div>
      </div>
    </div>

    <div class="card report-card">
      <div class="card-header"><h3>⚠️ Risk Summary</h3></div>
      <table class="report-table">
        <tr><td>Total Risks</td><td><strong>${risks.length}</strong></td></tr>
        <tr><td>Open</td><td><strong class="text-red">${risks.filter(r=>r.status==='Open').length}</strong></td></tr>
        <tr><td>Mitigated</td><td><strong class="text-yellow">${risks.filter(r=>r.status==='Mitigated').length}</strong></td></tr>
        <tr><td>Closed</td><td><strong class="text-green">${risks.filter(r=>r.status==='Closed').length}</strong></td></tr>
        <tr><td>Critical / High (open)</td><td><strong class="text-red">${critRisks.length}</strong></td></tr>
      </table>
      ${critRisks.length > 0 ? `
        <div style="padding:0 20px 16px">
          <div style="font-size:12px;font-weight:600;color:#ef4444;margin-bottom:6px">🔴 High Priority Open Risks:</div>
          ${critRisks.slice(0,5).map(r=>`<div style="font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9"><strong>${esc(r.title)}</strong> <span style="color:#94a3b8">(${esc(projectName(r.projectId))})</span></div>`).join('')}
        </div>` :
        `<div style="padding:12px 20px;font-size:13px;color:#22c55e">✅ No critical / high-priority risks open</div>`}
    </div>
  </div>
</div>`;

  const ctx = document.getElementById('chartTasks');
  if (ctx) {
    charts.tasks = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['To Do','In Progress','Done','Blocked'],
        datasets: [{ data:[tByStatus('To Do'),tByStatus('In Progress'),tByStatus('Done'),tByStatus('Blocked')], backgroundColor:['#94a3b8','#3b82f6','#22c55e','#ef4444'], borderWidth:2, borderColor:'#fff' }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 } } } } }
    });
  }
}

// ─────────────────────────────────────────────
// MODAL — PROJECT
// ─────────────────────────────────────────────
function openProjectModal(id = null) {
  const f = document.getElementById('project-form');
  f.reset();
  if (id) {
    const p = DB.projects.find(x => x.id === id);
    if (!p) return;
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    document.getElementById('project-id').value           = p.id;
    document.getElementById('project-name').value         = p.name;
    document.getElementById('project-description').value  = p.description || '';
    document.getElementById('project-status').value       = p.status;
    document.getElementById('project-priority').value     = p.priority;
    document.getElementById('project-phase').value        = p.phase || 'Initiation';
    document.getElementById('project-owner').value        = p.owner || '';
    document.getElementById('project-department').value   = p.department || '';
    document.getElementById('project-progress').value     = p.progress ?? 0;
    document.getElementById('project-start-date').value   = p.startDate || '';
    document.getElementById('project-end-date').value     = p.endDate || '';
    document.getElementById('project-budget').value       = p.budget ?? 0;
    document.getElementById('project-budget-spent').value = p.budgetSpent ?? 0;
  } else {
    document.getElementById('project-modal-title').textContent = 'Add Project';
    document.getElementById('project-id').value = '';
    document.getElementById('project-status').value   = 'On Track';
    document.getElementById('project-priority').value = 'Medium';
    document.getElementById('project-phase').value    = 'Initiation';
    document.getElementById('project-progress').value = 0;
    document.getElementById('project-budget').value   = 0;
    document.getElementById('project-budget-spent').value = 0;
  }
  openModal('project-modal');
}

function saveProject() {
  const name = document.getElementById('project-name').value.trim();
  if (!name) { alert('Project name is required.'); return; }
  const id = document.getElementById('project-id').value || uid();
  const obj = {
    id, name,
    description: document.getElementById('project-description').value.trim(),
    status:      document.getElementById('project-status').value,
    priority:    document.getElementById('project-priority').value,
    phase:       document.getElementById('project-phase').value,
    owner:       document.getElementById('project-owner').value.trim(),
    department:  document.getElementById('project-department').value.trim(),
    progress:    Math.min(100, Math.max(0, parseInt(document.getElementById('project-progress').value)||0)),
    startDate:   document.getElementById('project-start-date').value,
    endDate:     document.getElementById('project-end-date').value,
    budget:      parseFloat(document.getElementById('project-budget').value)||0,
    budgetSpent: parseFloat(document.getElementById('project-budget-spent').value)||0,
  };
  const idx = DB.projects.findIndex(p => p.id === id);
  if (idx >= 0) DB.projects[idx] = obj; else DB.projects.push(obj);
  saveDB(); closeModal('project-modal'); renderProjects();
}

// ─────────────────────────────────────────────
// MODAL — TASK
// ─────────────────────────────────────────────
function openTaskModal(id = null) {
  const f = document.getElementById('task-form');
  f.reset();

  const projSel = document.getElementById('task-project');
  projSel.innerHTML = DB.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  const asnSel = document.getElementById('task-assignee');
  asnSel.innerHTML = '<option value="">Unassigned</option>' +
    DB.resources.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');

  if (id) {
    const t = DB.tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-id').value       = t.id;
    document.getElementById('task-name').value     = t.name;
    document.getElementById('task-project').value  = t.projectId;
    document.getElementById('task-assignee').value = t.assignee || '';
    document.getElementById('task-status').value   = t.status;
    document.getElementById('task-priority').value = t.priority;
    document.getElementById('task-due-date').value = t.dueDate || '';
    document.getElementById('task-notes').value    = t.notes || '';
  } else {
    document.getElementById('task-modal-title').textContent = 'Add Task';
    document.getElementById('task-id').value = '';
    if (tFilter.projectId !== 'all') document.getElementById('task-project').value = tFilter.projectId;
    document.getElementById('task-status').value   = 'To Do';
    document.getElementById('task-priority').value = 'Medium';
  }
  openModal('task-modal');
}

function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) { alert('Task name is required.'); return; }
  const id = document.getElementById('task-id').value || uid();
  const obj = {
    id, name,
    projectId: document.getElementById('task-project').value,
    assignee:  document.getElementById('task-assignee').value || null,
    status:    document.getElementById('task-status').value,
    priority:  document.getElementById('task-priority').value,
    dueDate:   document.getElementById('task-due-date').value,
    notes:     document.getElementById('task-notes').value.trim(),
  };
  const idx = DB.tasks.findIndex(t => t.id === id);
  if (idx >= 0) DB.tasks[idx] = obj; else DB.tasks.push(obj);
  saveDB(); closeModal('task-modal'); renderTasks();
}

// ─────────────────────────────────────────────
// MODAL — RISK
// ─────────────────────────────────────────────
function openRiskModal(id = null) {
  const f = document.getElementById('risk-form');
  f.reset();
  const ps = document.getElementById('risk-project');
  ps.innerHTML = '<option value="">— No project —</option>' +
    DB.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  if (id) {
    const r = DB.risks.find(x => x.id === id);
    if (!r) return;
    document.getElementById('risk-modal-title').textContent = 'Edit Risk';
    document.getElementById('risk-id').value          = r.id;
    document.getElementById('risk-title').value       = r.title;
    document.getElementById('risk-description').value = r.description || '';
    document.getElementById('risk-project').value     = r.projectId || '';
    document.getElementById('risk-owner').value       = r.owner || '';
    document.getElementById('risk-probability').value = r.probability;
    document.getElementById('risk-impact').value      = r.impact;
    document.getElementById('risk-status').value      = r.status;
    document.getElementById('risk-date').value        = r.dateIdentified || '';
    document.getElementById('risk-mitigation').value  = r.mitigation || '';
  } else {
    document.getElementById('risk-modal-title').textContent = 'Add Risk';
    document.getElementById('risk-id').value          = '';
    document.getElementById('risk-probability').value = 'Medium';
    document.getElementById('risk-impact').value      = 'Medium';
    document.getElementById('risk-status').value      = 'Open';
    document.getElementById('risk-date').value        = new Date().toISOString().slice(0,10);
  }
  openModal('risk-modal');
}

function saveRisk() {
  const title = document.getElementById('risk-title').value.trim();
  if (!title) { alert('Risk title is required.'); return; }
  const id = document.getElementById('risk-id').value || uid();
  const obj = {
    id, title,
    description:     document.getElementById('risk-description').value.trim(),
    projectId:       document.getElementById('risk-project').value || null,
    owner:           document.getElementById('risk-owner').value.trim(),
    probability:     document.getElementById('risk-probability').value,
    impact:          document.getElementById('risk-impact').value,
    status:          document.getElementById('risk-status').value,
    dateIdentified:  document.getElementById('risk-date').value,
    mitigation:      document.getElementById('risk-mitigation').value.trim(),
  };
  const idx = DB.risks.findIndex(r => r.id === id);
  if (idx >= 0) DB.risks[idx] = obj; else DB.risks.push(obj);
  saveDB(); closeModal('risk-modal'); renderRisks();
}

// ─────────────────────────────────────────────
// MODAL — RESOURCE
// ─────────────────────────────────────────────
function openResourceModal(id = null) {
  const f = document.getElementById('resource-form');
  f.reset();
  if (id) {
    const r = DB.resources.find(x => x.id === id);
    if (!r) return;
    document.getElementById('resource-modal-title').textContent = 'Edit Team Member';
    document.getElementById('resource-id').value         = r.id;
    document.getElementById('resource-name').value       = r.name;
    document.getElementById('resource-role').value       = r.role;
    document.getElementById('resource-department').value = r.department || '';
    document.getElementById('resource-email').value      = r.email || '';
    document.getElementById('resource-capacity').value   = r.capacity ?? 40;
  } else {
    document.getElementById('resource-modal-title').textContent = 'Add Team Member';
    document.getElementById('resource-id').value       = '';
    document.getElementById('resource-capacity').value = 40;
  }
  openModal('resource-modal');
}

function saveResource() {
  const name = document.getElementById('resource-name').value.trim();
  const role = document.getElementById('resource-role').value.trim();
  if (!name || !role) { alert('Name and role are required.'); return; }
  const id = document.getElementById('resource-id').value || uid();
  const obj = {
    id, name, role,
    department: document.getElementById('resource-department').value.trim(),
    email:      document.getElementById('resource-email').value.trim(),
    capacity:   parseInt(document.getElementById('resource-capacity').value)||40,
  };
  const idx = DB.resources.findIndex(r => r.id === id);
  if (idx >= 0) DB.resources[idx] = obj; else DB.resources.push(obj);
  saveDB(); closeModal('resource-modal'); renderResources();
}

// ─────────────────────────────────────────────
// CONFIRM DELETE
// ─────────────────────────────────────────────
function confirmDelete(type, id) {
  const msgs = {
    project:  'Delete this project? All its tasks and risks will also be deleted.',
    task:     'Delete this task?',
    risk:     'Delete this risk?',
    resource: 'Delete this team member? They will be unassigned from all tasks.',
  };
  document.getElementById('confirm-message').textContent = msgs[type] || 'Delete this item?';
  const btn = document.getElementById('confirm-delete-btn');
  btn.onclick = () => {
    if (type === 'project') {
      DB.projects  = DB.projects.filter(p => p.id !== id);
      DB.tasks     = DB.tasks.filter(t => t.projectId !== id);
      DB.risks     = DB.risks.filter(r => r.projectId !== id);
    } else if (type === 'task') {
      DB.tasks = DB.tasks.filter(t => t.id !== id);
    } else if (type === 'risk') {
      DB.risks = DB.risks.filter(r => r.id !== id);
    } else if (type === 'resource') {
      DB.resources = DB.resources.filter(r => r.id !== id);
      DB.tasks.forEach(t => { if (t.assignee === id) t.assignee = null; });
    }
    saveDB();
    closeModal('confirm-modal');
    navigate(currentPage);
  };
  openModal('confirm-modal');
}

// ─────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function init() {
  loadDB();

  document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
