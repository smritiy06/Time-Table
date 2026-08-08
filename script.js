const schedule = document.getElementById("schedule");
const dayTitle = document.getElementById("dayTitle");
const buttons = document.querySelectorAll(".day");

function renderSchedule(day){

    schedule.innerHTML = "";

    // Weekend
    if(timetable[day].length === 0){

        schedule.innerHTML = `
            <div class="empty-day">
                <h2>🎉 No Classes Today</h2>
                <p>Enjoy your weekend and get some rest!</p>
            </div>
        `;

        return;
    }

    timetable[day].forEach((item,index)=>{

        schedule.innerHTML += `

        <div class="class-card">

            <div class="time">
                <span>${item.start}</span>
                <small>${item.end}</small>
            </div>

            <div class="details">
                <h3>${item.subject}</h3>
                <p>${item.code} • ${item.faculty}</p>
            </div>

            <span class="credit">${item.credits}</span>

        </div>

        `;

        // Add Lunch Break after the last morning class
        if(item.end === "12:25"){

            schedule.innerHTML += `
                <div class="break-card">
                    🍽 Lunch Break
                    <small>12:30 PM – 2:00 PM</small>
                </div>
            `;
        }

    });

}

buttons.forEach(button=>{

    button.addEventListener("click",()=>{

        buttons.forEach(btn=>btn.classList.remove("active"));

        button.classList.add("active");

        const day=button.dataset.day;

        dayTitle.textContent=day;

        renderSchedule(day);

    });

});

function getToday() {

    const days = [

        "Sunday",

        "Monday",

        "Tuesday",

        "Wednesday",

        "Thursday",

        "Friday",

        "Saturday"

    ];

    return days[new Date().getDay()];

}

function setActiveDay(day) {

    buttons.forEach(button => {

        button.classList.remove("active");

        if (button.dataset.day === day) {

            button.classList.add("active");

        }

    });

}

buttons.forEach(button => {

    button.addEventListener("click", () => {

        const day = button.dataset.day;

        dayTitle.textContent = day;

        setActiveDay(day);

        renderSchedule(day);

    });

});

/* Automatically open today's timetable */

const today = getToday();

dayTitle.textContent = today;

setActiveDay(today);

renderSchedule(today);