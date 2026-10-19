# 📅 Time Table

A clean, responsive, and minimal timetable web application built using **HTML, CSS, and JavaScript**.

Designed with a calm **emerald and sage** theme on warm off-white, with a matching dark mode. It shows what's happening right now, what's next, and the whole week at a glance.

---

## ✨ Features

- ⏱ **Live status** — the class in progress with a progress bar, or a countdown to the next class (even across weekends)
- 📆 **Day navigation** — opens on today automatically, with a **Today** button to jump back
- 🎓 **Clear class cards** — lectures and labs are visually distinct, with course code, faculty, credits and duration
- 🍽 **Lunch breaks and free periods** shown separately from classes
- ✅ Classes marked as **done**, **in progress** or **up next** throughout the day
- 🗓 **Week at a glance** — a time grid of the whole week with a live "now" line
- 📊 **Day summary** — number of classes, lectures and labs, and the day's start and end times
- 🌙 **Light and dark themes** — follows your system setting, and remembers your choice
- 💤 Friendly **empty state** for days without classes, with a shortcut to the next class
- 📱 **Responsive** — sticky day tabs and swipe left/right to change day on phones
- ⌨️ **Keyboard accessible** — arrow keys, Home and End move between days

Everything updates on its own as time passes; no refresh needed.

---

## 🗂 Editing the timetable

All classes live in `data.js`. Times use a 12-hour clock (`"02:00"` means 2:00 PM). Hours from 1 to 7 are read as afternoon times because no class starts before 8:30. Subjects with "Lab" in the name are shown as labs.

Lunch timings are set in `script.js` (`LUNCH`).

## 🧪 Testing a specific time

Add `?now=` to the URL to preview the timetable at any moment, for example:

```
index.html?now=2026-10-20T10:45
```

The simulated clock keeps ticking from that time.

---

## 🛠️ Built With

- HTML5
- CSS3
- JavaScript (Vanilla)

No frameworks or external dependencies.

---

## 📂 Project Structure

```
Time-Table/
│
├── index.html   # Page structure
├── style.css    # Theme tokens, layout and components
├── data.js      # Timetable data
├── script.js    # Rendering, live status and theme
└── README.md
```

---

## 👩‍💻 Author

**Smriti Yadav**

GitHub: https://github.com/smritiy06
