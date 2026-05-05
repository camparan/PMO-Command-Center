# PMO Command Center

A **zero-install, browser-based Project Management Office (PMO) dashboard** you can open directly in any modern browser — no server, no Node.js, no database required.

---

## 🚀 How to run it

1. **Download / clone** this repository to your computer.
2. **Open `index.html`** in your browser (double-click it, or drag it into Chrome / Edge / Firefox).
3. That's it — the app loads instantly with sample portfolio data.

> All your data is stored automatically in the browser's **localStorage**, so it persists between sessions on the same computer.

---

## ✨ Features

| Section | What you can do |
|---|---|
| **Dashboard** | At-a-glance KPI cards, portfolio status donut chart, budget vs spent bar chart, project health list, active/blocked task feed |
| **Projects** | Add, edit, delete projects — track status (On Track / At Risk / Off Track), priority, phase, owner, dates, budget & progress |
| **Tasks** | Kanban board (To Do / In Progress / Blocked / Done) with per-project & per-assignee filters |
| **Resources** | Team directory with active task counts and project allocation chart |
| **Risks** | Risk register with probability × impact matrix and risk score calculation |
| **Timeline** | Gantt-style bar chart showing all project timelines with a "today" marker |
| **Reports** | Portfolio summary, budget variance report, task completion summary, risk heat map |

All data is **editable** — click ✏️ to edit any record, 🗑️ to delete it, and the **+ Add** button in the top-right corner to create new items.

---

## 🔄 Resetting demo data

Click **↺ Reset Demo Data** at the bottom of the sidebar to restore the built-in sample portfolio at any time.

---

## 📁 File structure

```
PMO-Command-Center/
├── index.html   ← open this in your browser
├── styles.css   ← all styling
└── app.js       ← all application logic + sample data
```

No npm, no build step, **no internet connection required at all** — Chart.js is bundled locally in `chart.umd.js`, so everything works completely offline.
