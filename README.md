# NEXORA — Task Dashboard

A calm, focused task management dashboard built with plain **HTML, CSS and JavaScript** for **NEXORA DIGITAL AGENCY**.

**Live demo:** https://cheikh-kh.github.io/nexora-tasks/

## Features

- Add, edit and delete tasks through an accessible modal
- Track three statuses: **To do**, **In progress** and **Completed**
- One-click completion toggle with a strikethrough state
- Dashboard overview: totals, per-status counts and completion percentage
- Filter by status and priority, full-text search, five sort modes
- Due date awareness — overdue and due-soon tasks are highlighted
- Delete with **Undo** (no accidental data loss)
- Light and dark themes, remembered between visits
- Tasks persist in `localStorage`
- Responsive layout, keyboard shortcuts and reduced-motion support

## Tech

- Semantic HTML5 with an inline SVG icon sprite
- Modern CSS: custom properties, grid, flexbox, `color-mix`, fluid typography
- Vanilla JavaScript (ES2022): event delegation, focus management, input validation

No build step, frameworks or dependencies.

## Getting started

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl` / `Cmd` + `K` or `/` | Focus the search field |
| `Esc` | Close the task dialog |
| `Tab` / `Shift` + `Tab` | Cycle through dialog controls |

## Project structure

```
.
├── index.html
├── assets
│   ├── css
│   │   └── styles.css
│   ├── js
│   │   └── app.js
│   └── favicon.svg
└── README.md
```

## Design notes

The palette is intentionally restrained: a soft cool-neutral canvas, an indigo brand accent, and semantic colors reserved for status and priority (slate for to-do, blue for in progress, green for completed, amber/red for urgency). Typography uses Plus Jakarta Sans with comfortable contrast in both themes.

---

© 2026 NEXORA DIGITAL AGENCY
