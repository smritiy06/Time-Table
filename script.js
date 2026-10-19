/* ===========================
   Constants
=========================== */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Lunch timings from the original timetable (12:30 PM – 2:00 PM)
const LUNCH = { label: "Lunch Break", start: "12:30", end: "02:00" };

// Gaps between classes shorter than this are treated as changeover time, not free periods
const MIN_FREE_PERIOD = 15;

// Times in data.js use a 12-hour clock without AM/PM. No class starts before 8:30,
// so hours 1–7 are afternoon hours.
const FIRST_MORNING_HOUR = 8;

const els = {
    nowPanel: document.getElementById("nowPanel"),
    nowAnnounce: document.getElementById("nowAnnounce"),
    todayDate: document.getElementById("todayDate"),
    todayBtn: document.getElementById("todayBtn"),
    themeToggle: document.getElementById("themeToggle"),
    dayPanel: document.getElementById("dayPanel"),
    dayEyebrow: document.getElementById("dayEyebrow"),
    dayTitle: document.getElementById("dayTitle"),
    daySummary: document.getElementById("daySummary"),
    schedule: document.getElementById("schedule"),
    weekGrid: document.getElementById("weekGrid"),
    weekNote: document.getElementById("weekNote"),
    buttons: document.querySelectorAll(".day")
};

const ICONS = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    lab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 15h9"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    lunch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

/* ===========================
   Clock
   Uses the device's local time. For testing, add ?now=2026-10-20T10:45 to the URL;
   the simulated clock keeps ticking from that moment.
=========================== */

const now = (() => {
    const param = new URLSearchParams(location.search).get("now");
    if (param) {
        const simulated = new Date(param);
        if (!isNaN(simulated)) {
            const offset = simulated.getTime() - Date.now();
            return () => new Date(Date.now() + offset);
        }
    }
    return () => new Date();
})();

/* ===========================
   Time helpers
=========================== */

function toMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    const hours = h < FIRST_MORNING_HOUR ? h + 12 : h;
    return hours * 60 + m;
}

function formatTime(minutes, withMeridiem = true) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const text = `${h12}:${String(m).padStart(2, "0")}`;
    return withMeridiem ? `${text} ${h24 < 12 ? "AM" : "PM"}` : text;
}

function meridiem(minutes) {
    return minutes < 12 * 60 ? "AM" : "PM";
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m} min`;
}

// Countdown text for a number of milliseconds
function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
}

/* ===========================
   Schedule model
   Builds each day's slots (classes, lunch, free periods) from data.js.
=========================== */

const daySlotsCache = {};

function getClasses(day) {
    return getSlots(day).filter(slot => slot.kind === "class");
}

function getSlots(day) {
    if (daySlotsCache[day]) return daySlotsCache[day];

    const classes = (timetable[day] || [])
        .map((item, index) => ({
            kind: "class",
            id: `${day}-${index}`,
            day,
            ...item,
            type: /\blab\b/i.test(item.subject) ? "lab" : "lecture",
            startMin: toMinutes(item.start),
            endMin: toMinutes(item.end)
        }))
        .sort((a, b) => a.startMin - b.startMin);

    const slots = [...classes];

    // Lunch goes after the last morning class, as in the original timetable
    const lunchStart = toMinutes(LUNCH.start);
    const lunchEnd = toMinutes(LUNCH.end);
    const morning = classes.filter(c => c.endMin <= lunchStart);
    const overlapsLunch = classes.some(c => c.startMin < lunchEnd && c.endMin > lunchStart);

    if (morning.length && !overlapsLunch) {
        const insertAt = slots.indexOf(morning[morning.length - 1]) + 1;
        slots.splice(insertAt, 0, {
            kind: "break",
            id: `${day}-lunch`,
            day,
            label: LUNCH.label,
            startMin: lunchStart,
            endMin: lunchEnd
        });
    }

    // Free periods between consecutive slots
    const withGaps = [];
    slots.forEach((slot, i) => {
        const prev = slots[i - 1];
        if (prev && slot.startMin - prev.endMin >= MIN_FREE_PERIOD) {
            withGaps.push({
                kind: "free",
                id: `${day}-free-${i}`,
                day,
                startMin: prev.endMin,
                endMin: slot.startMin
            });
        }
        withGaps.push(slot);
    });

    daySlotsCache[day] = withGaps;
    return withGaps;
}

/* ===========================
   Live status
=========================== */

// Finds the next class that starts after `date`, looking up to a week ahead
function findNextClass(date) {
    const mins = minutesOfDay(date);

    for (let offset = 0; offset <= 7; offset++) {
        const day = DAYS[(date.getDay() + offset) % 7];
        const cls = getClasses(day).find(c => offset > 0 || c.startMin > mins);
        if (cls) {
            const startsAt = new Date(date);
            startsAt.setDate(date.getDate() + offset);
            startsAt.setHours(Math.floor(cls.startMin / 60), cls.startMin % 60, 0, 0);
            return { cls, offset, startsAt };
        }
    }
    return null;
}

function getStatus(date) {
    const day = DAYS[date.getDay()];
    const mins = minutesOfDay(date);
    const classes = getClasses(day);
    const slots = getSlots(day);

    const current = slots.find(s => s.kind !== "free" && mins >= s.startMin && mins < s.endMin) || null;
    const next = findNextClass(date);

    let state;
    if (current && current.kind === "class") state = "class";
    else if (current && current.kind === "break") state = "break";
    else if (!classes.length) state = "off";
    else if (mins < classes[0].startMin) state = "before";
    else if (mins >= Math.max(...classes.map(c => c.endMin))) state = "done";
    else state = "between";

    const done = classes.filter(c => c.endMin <= mins).length;

    return { day, mins, state, current, next, total: classes.length, done };
}

/* ===========================
   Rendering: day view
=========================== */

let selectedDay = null;
let lastStatusKey = "";

function renderDay(day, status) {
    const isToday = day === status.day;
    const slots = getSlots(day);
    const classes = slots.filter(s => s.kind === "class");
    const nextId = status.next && status.next.offset === 0 ? status.next.cls.id : null;

    els.dayTitle.textContent = day;
    els.dayEyebrow.textContent = isToday ? "Today" : relativeDayLabel(day, status.day);
    els.todayBtn.hidden = isToday;

    renderSummary(classes);

    if (!classes.length) {
        els.schedule.innerHTML = `<li class="empty">${emptyStateHTML(day, isToday)}</li>`;
        return;
    }

    els.schedule.innerHTML = slots.map(slot => {
        let timeState = "";
        if (isToday) {
            if (slot.endMin <= status.mins) timeState = "is-past";
            else if (slot.startMin <= status.mins) timeState = "is-current";
            else if (slot.id === nextId) timeState = "is-next";
        }
        if (slot.kind === "class") return classSlotHTML(slot, timeState);
        if (slot.kind === "break") return breakSlotHTML(slot, timeState);
        return freeSlotHTML(slot, timeState);
    }).join("");

    updateProgress(status);
}

function relativeDayLabel(day, today) {
    const diff = (DAYS.indexOf(day) - DAYS.indexOf(today) + 7) % 7;
    if (diff === 1) return "Tomorrow";
    if (diff === 6) return "Yesterday";
    return "Schedule";
}

function renderSummary(classes) {
    if (!classes.length) {
        els.daySummary.innerHTML = `<li class="chip">No classes</li>`;
        return;
    }

    const labs = classes.filter(c => c.type === "lab").length;
    const lectures = classes.length - labs;
    const first = classes[0].startMin;
    const last = Math.max(...classes.map(c => c.endMin));

    const chips = [`<li class="chip chip-strong">${classes.length} ${classes.length === 1 ? "class" : "classes"}</li>`];
    if (lectures) chips.push(`<li class="chip">${lectures} ${lectures === 1 ? "lecture" : "lectures"}</li>`);
    if (labs) chips.push(`<li class="chip chip-lab">${labs} ${labs === 1 ? "lab" : "labs"}</li>`);
    chips.push(`<li class="chip">${formatTime(first)} – ${formatTime(last)}</li>`);

    els.daySummary.innerHTML = chips.join("");
}

function timeColumnHTML(slot) {
    return `
        <div class="slot-time">
            <span class="slot-start">${formatTime(slot.startMin, false)}<small>${meridiem(slot.startMin)}</small></span>
            <span class="slot-end">${formatTime(slot.endMin)}</span>
        </div>`;
}

function statusPillHTML(timeState, kind) {
    if (timeState === "is-current") return `<span class="pill pill-now"><i class="pulse" aria-hidden="true"></i>${kind === "class" ? "In progress" : "Now"}</span>`;
    if (timeState === "is-next") return `<span class="pill pill-next">Up next</span>`;
    if (timeState === "is-past") return `<span class="pill pill-done">Done</span>`;
    return "";
}

function classSlotHTML(slot, timeState) {
    const isLab = slot.type === "lab";
    const duration = slot.endMin - slot.startMin;

    return `
        <li class="slot slot-class ${isLab ? "slot-lab" : ""} ${timeState}" data-id="${slot.id}">
            ${timeColumnHTML(slot)}
            <article class="card">
                <div class="card-top">
                    <span class="tag">${isLab ? ICONS.lab : ICONS.book}${isLab ? "Lab" : "Lecture"}</span>
                    ${statusPillHTML(timeState, "class")}
                </div>
                <h3 class="card-title">${escapeHTML(slot.subject)}</h3>
                <p class="card-meta">
                    <span class="code">${escapeHTML(slot.code)}</span>
                    <span class="faculty">${ICONS.user}${escapeHTML(slot.faculty)}</span>
                </p>
                <div class="card-foot">
                    <span class="credit">${escapeHTML(slot.credits)}</span>
                    <span class="duration">${formatDuration(duration)}</span>
                </div>
                ${timeState === "is-current" ? progressHTML() : ""}
            </article>
        </li>`;
}

function breakSlotHTML(slot, timeState) {
    return `
        <li class="slot slot-break ${timeState}" data-id="${slot.id}">
            ${timeColumnHTML(slot)}
            <div class="card card-break">
                <span class="break-icon">${ICONS.lunch}</span>
                <div>
                    <h3 class="card-title">${escapeHTML(slot.label)}</h3>
                    <p class="card-meta">${formatTime(slot.startMin)} – ${formatTime(slot.endMin)} · ${formatDuration(slot.endMin - slot.startMin)}</p>
                </div>
                ${statusPillHTML(timeState, "break")}
                ${timeState === "is-current" ? progressHTML() : ""}
            </div>
        </li>`;
}

function freeSlotHTML(slot, timeState) {
    return `
        <li class="slot slot-free ${timeState}" data-id="${slot.id}">
            <div class="slot-time" aria-hidden="true"></div>
            <div class="card card-free">
                ${ICONS.coffee}
                <span>Free period · ${formatDuration(slot.endMin - slot.startMin)}</span>
                <span class="card-free-time">${formatTime(slot.startMin)} – ${formatTime(slot.endMin)}</span>
            </div>
        </li>`;
}

function progressHTML() {
    return `<div class="progress" role="progressbar" aria-label="Time elapsed" aria-valuemin="0" aria-valuemax="100"><span></span></div>`;
}

function emptyStateHTML(day, isToday) {
    const next = nextClassAfterDay(day);
    const isWeekend = day === "Saturday" || day === "Sunday";
    const heading = isToday ? "No classes today" : `No classes on ${day}`;
    const line = isWeekend
        ? "It's the weekend — time to rest, catch up, or explore something new."
        : "Nothing is scheduled for this day.";

    let nextHTML = "";
    if (next) {
        nextHTML = `
            <button type="button" class="empty-next" data-goto="${next.day}">
                <span class="empty-next-label">Next class · ${next.day}</span>
                <span class="empty-next-title">${escapeHTML(next.subject)}</span>
                <span class="empty-next-time">${formatTime(next.startMin)}</span>
            </button>`;
    }

    return `
        <div class="empty-state">
            <span class="empty-icon">${ICONS.moon}</span>
            <h2>${heading}</h2>
            <p>${line}</p>
            ${nextHTML}
        </div>`;
}

// First class on the days after `day` (wrapping around the week)
function nextClassAfterDay(day) {
    const start = DAYS.indexOf(day);
    for (let i = 1; i <= 7; i++) {
        const classes = getClasses(DAYS[(start + i) % 7]);
        if (classes.length) return classes[0];
    }
    return null;
}

/* ===========================
   Rendering: now panel
=========================== */

function renderNow(status) {
    const { state, current, next } = status;
    let html;

    if (state === "class") {
        const upNext = next && next.offset === 0 ? nextLineHTML(next) : "";
        html = `
            <div class="now-main">
                <p class="now-label"><i class="pulse" aria-hidden="true"></i>In class now</p>
                <h2 class="now-title">${escapeHTML(current.subject)}</h2>
                <p class="now-meta">${escapeHTML(current.code)} · ${escapeHTML(current.faculty)} · until ${formatTime(current.endMin)}</p>
                ${progressHTML()}
                ${upNext}
            </div>
            <div class="now-side">
                <span class="now-count" data-countdown="end">–</span>
                <span class="now-count-label">left</span>
            </div>`;
    } else if (state === "break") {
        html = `
            <div class="now-main">
                <p class="now-label">${ICONS.lunch}On a break</p>
                <h2 class="now-title">${escapeHTML(current.label)}</h2>
                <p class="now-meta">${formatTime(current.startMin)} – ${formatTime(current.endMin)}</p>
                ${progressHTML()}
                ${next ? nextLineHTML(next) : ""}
            </div>
            <div class="now-side">
                <span class="now-count" data-countdown="end">–</span>
                <span class="now-count-label">left</span>
            </div>`;
    } else if (next) {
        const label = {
            before: "First class today",
            between: "Up next",
            done: "Classes are over for today",
            off: "No classes today"
        }[state];
        const icon = state === "done" ? ICONS.check : state === "off" ? ICONS.moon : ICONS.clock;
        const when = next.offset === 0 ? "" : `${next.offset === 1 ? "Tomorrow" : next.cls.day}, `;

        html = `
            <div class="now-main">
                <p class="now-label">${icon}${label}</p>
                <h2 class="now-title">${state === "done" || state === "off" ? `Next: ${escapeHTML(next.cls.subject)}` : escapeHTML(next.cls.subject)}</h2>
                <p class="now-meta">${when}${formatTime(next.cls.startMin)} · ${escapeHTML(next.cls.code)} · ${escapeHTML(next.cls.faculty)}</p>
                ${state === "between" || state === "before" ? `<p class="now-sub">${status.done} of ${status.total} classes done today</p>` : ""}
            </div>
            <div class="now-side">
                <span class="now-count" data-countdown="next">–</span>
                <span class="now-count-label">until it starts</span>
            </div>`;
    } else {
        html = `
            <div class="now-main">
                <p class="now-label">${ICONS.moon}Nothing scheduled</p>
                <h2 class="now-title">No upcoming classes</h2>
            </div>`;
    }

    els.nowPanel.className = `now now-${state}`;
    els.nowPanel.innerHTML = html;
    els.nowAnnounce.textContent = announcement(status);
}

function nextLineHTML(next) {
    const day = next.offset === 0 ? "" : next.offset === 1 ? " tomorrow" : ` on ${next.cls.day}`;
    return `<p class="now-next">Next: <strong>${escapeHTML(next.cls.subject)}</strong>${day} at ${formatTime(next.cls.startMin)}</p>`;
}

function announcement({ state, current, next }) {
    if (state === "class") return `In class now: ${current.subject}, until ${formatTime(current.endMin)}.`;
    if (state === "break") return `${current.label} until ${formatTime(current.endMin)}.`;
    if (next) return `Next class: ${next.cls.subject} on ${next.cls.day} at ${formatTime(next.cls.startMin)}.`;
    return "No upcoming classes.";
}

// Per-second updates that don't need a full re-render
function updateLive(date, status) {
    els.nowPanel.querySelectorAll("[data-countdown]").forEach(el => {
        let target;
        if (el.dataset.countdown === "end" && status.current) {
            target = new Date(date);
            target.setHours(Math.floor(status.current.endMin / 60), status.current.endMin % 60, 0, 0);
        } else if (el.dataset.countdown === "next" && status.next) {
            target = status.next.startsAt;
        }
        if (target) el.textContent = formatCountdown(target - date);
    });

    updateProgress(status);
}

function updateProgress(status) {
    if (!status.current) return;
    const { startMin, endMin } = status.current;
    const pct = Math.min(100, Math.max(0, ((status.mins - startMin) / (endMin - startMin)) * 100));

    document.querySelectorAll(".progress").forEach(bar => {
        bar.setAttribute("aria-valuenow", Math.round(pct));
        bar.firstElementChild.style.width = `${pct}%`;
    });
}

/* ===========================
   Rendering: day tabs and week overview
=========================== */

function renderTabs(status) {
    els.buttons.forEach(button => {
        const day = button.dataset.day;
        const selected = day === selectedDay;
        const count = getClasses(day).length;

        button.setAttribute("aria-selected", selected);
        button.tabIndex = selected ? 0 : -1;
        button.classList.toggle("active", selected);
        button.classList.toggle("is-today", day === status.day);
        button.classList.toggle("is-free", count === 0);

        if (!button.dataset.label) button.dataset.label = button.textContent.trim();
        button.innerHTML = `
            <span class="day-name">${button.dataset.label}</span>
            <span class="day-count">${count || "–"}</span>`;
        button.setAttribute("aria-label", `${day}${day === status.day ? ", today" : ""}, ${count ? `${count} ${count === 1 ? "class" : "classes"}` : "no classes"}`);
    });
}

function renderWeek(status) {
    const all = WEEKDAYS.flatMap(getSlots).filter(s => s.kind !== "free");
    if (!all.length) {
        els.weekGrid.innerHTML = "";
        return;
    }

    // Round the visible range to whole hours
    const rangeStart = Math.floor(Math.min(...all.map(s => s.startMin)) / 60) * 60;
    const rangeEnd = Math.ceil(Math.max(...all.map(s => s.endMin)) / 60) * 60;
    const span = rangeEnd - rangeStart;
    const pos = m => ((m - rangeStart) / span) * 100;

    const hours = [];
    for (let m = rangeStart; m <= rangeEnd; m += 60) hours.push(m);

    const axis = `
        <div class="week-axis" aria-hidden="true">
            ${hours.map(m => `<span style="top:${pos(m)}%">${formatTime(m, false).replace(":00", "")}<small>${meridiem(m)}</small></span>`).join("")}
        </div>`;

    const columns = WEEKDAYS.map(day => {
        const isToday = day === status.day;
        const blocks = getSlots(day).filter(s => s.kind !== "free").map(slot => {
            const style = `top:${pos(slot.startMin)}%;height:${pos(slot.endMin) - pos(slot.startMin)}%`;
            const current = isToday && status.current && status.current.id === slot.id ? "is-current" : "";
            if (slot.kind === "break") {
                return `<div class="block block-break ${current}" style="${style}" title="${LUNCH.label} · ${formatTime(slot.startMin)} – ${formatTime(slot.endMin)}"><span>Lunch</span></div>`;
            }
            return `
                <div class="block block-${slot.type} ${current}" style="${style}" title="${escapeHTML(slot.subject)} · ${formatTime(slot.startMin)} – ${formatTime(slot.endMin)}">
                    <span class="block-code">${escapeHTML(slot.code)}</span>
                    <span class="block-name">${escapeHTML(slot.subject)}</span>
                </div>`;
        }).join("");

        const nowLine = isToday && status.mins >= rangeStart && status.mins <= rangeEnd
            ? `<i class="now-line" style="top:${pos(status.mins)}%" aria-hidden="true"></i>` : "";

        return `
            <div class="week-col ${isToday ? "is-today" : ""} ${day === selectedDay ? "is-selected" : ""}">
                <button type="button" class="week-day" data-goto="${day}" aria-label="Show ${day}, ${getClasses(day).length} classes">
                    ${day.slice(0, 3)}${isToday ? '<i class="today-dot" aria-hidden="true"></i>' : ""}
                </button>
                <div class="week-track">
                    ${hours.map(m => `<i class="hour-line" style="top:${pos(m)}%"></i>`).join("")}
                    ${blocks}
                    ${nowLine}
                </div>
            </div>`;
    }).join("");

    els.weekGrid.innerHTML = `<div class="week-head-spacer" aria-hidden="true"></div>${axis}${columns}`;

    const totalClasses = WEEKDAYS.reduce((sum, d) => sum + getClasses(d).length, 0);
    const labs = WEEKDAYS.reduce((sum, d) => sum + getClasses(d).filter(c => c.type === "lab").length, 0);
    const freeDays = [...els.buttons].map(b => b.dataset.day).filter(d => getClasses(d).length === 0);
    const freeText = freeDays.length ? ` ${freeDays.join(" and ")}: no classes.` : "";
    els.weekNote.textContent = `${totalClasses} classes this week, including ${labs} labs.${freeText}`;
}

/* ===========================
   App state and updates
=========================== */

function selectDay(day, { focus = false } = {}) {
    if (!timetable[day]) return;
    selectedDay = day;
    const status = getStatus(now());

    renderTabs(status);
    renderDay(day, status);
    renderWeek(status);
    animateSchedule();

    if (focus) {
        const button = [...els.buttons].find(b => b.dataset.day === day);
        if (button) button.focus();
    }
}

function animateSchedule() {
    els.schedule.classList.remove("enter");
    void els.schedule.offsetWidth;
    els.schedule.classList.add("enter");
}

let currentToday = null;

function tick() {
    const date = now();
    const status = getStatus(date);

    // Day rollover (e.g. the page is left open past midnight)
    if (status.day !== currentToday) {
        const wasFollowingToday = selectedDay === null || selectedDay === currentToday;
        currentToday = status.day;
        els.todayDate.textContent = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
        if (wasFollowingToday) selectedDay = currentToday;
        lastStatusKey = "";
    }

    // Full re-render only when the status changes (class starts/ends, etc.)
    const key = [status.day, status.state, status.current && status.current.id, status.next && status.next.cls.id, status.done].join("|");
    if (key !== lastStatusKey) {
        lastStatusKey = key;
        renderNow(status);
        renderTabs(status);
        renderDay(selectedDay, status);
        renderWeek(status);
    } else {
        updateNowLine(status);
    }

    updateLive(date, status);
}

function updateNowLine(status) {
    // Re-render the week grid once a minute so the "now" line moves
    const minute = Math.floor(status.mins);
    if (minute !== updateNowLine.last) {
        updateNowLine.last = minute;
        renderWeek(status);
    }
}

function startClock() {
    tick();
    // Align ticks to the start of each second
    const schedule = () => setTimeout(() => { tick(); schedule(); }, 1000 - (now().getMilliseconds()));
    schedule();

    // Timers are throttled in background tabs; refresh straight away on return
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) tick();
    });
}

/* ===========================
   Theme
=========================== */

const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const next = theme === "dark" ? "light" : "dark";
    els.themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    els.themeToggle.title = `Switch to ${next} theme`;
    if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#101513" : "#FAF8F3");
}

function storedTheme() {
    try {
        const value = localStorage.getItem("tt-theme");
        return value === "light" || value === "dark" ? value : null;
    } catch (e) {
        return null;
    }
}

function initTheme() {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(storedTheme() || (media.matches ? "dark" : "light"));

    els.themeToggle.addEventListener("click", () => {
        const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(theme);
        try { localStorage.setItem("tt-theme", theme); } catch (e) {}
    });

    // Follow the system setting until the user picks a theme
    media.addEventListener("change", e => {
        if (!storedTheme()) applyTheme(e.matches ? "dark" : "light");
    });
}

/* ===========================
   Events
=========================== */

function initEvents() {
    els.buttons.forEach(button => {
        button.addEventListener("click", () => selectDay(button.dataset.day));
    });

    // Arrow-key navigation between day tabs
    document.querySelector(".days").addEventListener("keydown", e => {
        const order = [...els.buttons].map(b => b.dataset.day);
        const index = order.indexOf(selectedDay);
        let target = null;
        if (e.key === "ArrowRight") target = order[(index + 1) % order.length];
        else if (e.key === "ArrowLeft") target = order[(index - 1 + order.length) % order.length];
        else if (e.key === "Home") target = order[0];
        else if (e.key === "End") target = order[order.length - 1];
        if (target) {
            e.preventDefault();
            selectDay(target, { focus: true });
        }
    });

    els.todayBtn.addEventListener("click", () => {
        selectDay(currentToday);
        const button = [...els.buttons].find(b => b.dataset.day === currentToday);
        if (button) button.focus();
    });

    // Week overview headers and the empty-state "next class" button
    document.addEventListener("click", e => {
        const target = e.target.closest("[data-goto]");
        if (!target) return;
        selectDay(target.dataset.goto);
        els.dayPanel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        els.dayPanel.focus({ preventScroll: true });
    });

    // Swipe left/right on the schedule to change day (touch screens)
    let touchStart = null;
    els.dayPanel.addEventListener("touchstart", e => {
        const t = e.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    els.dayPanel.addEventListener("touchend", e => {
        if (!touchStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
        const order = [...els.buttons].map(b => b.dataset.day);
        const index = order.indexOf(selectedDay);
        const nextIndex = dx < 0 ? index + 1 : index - 1;
        if (nextIndex >= 0 && nextIndex < order.length) selectDay(order[nextIndex]);
    }, { passive: true });
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ===========================
   Start
=========================== */

initTheme();
initEvents();
startClock();
