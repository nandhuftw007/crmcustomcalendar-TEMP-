let currentDate = new Date();
let today = new Date();

// Function to get the week's dates based on a given date
function getWeekDates(date) {
    const firstDayOfWeek = date.getDate() - date.getDay(); // Sunday as the first day of the week
    let weekDates = [];
    for (let i = 0; i < 7; i++) {
        let day = new Date(date);
        day.setDate(firstDayOfWeek + i);
        weekDates.push(day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }
    return weekDates;
}

// Populate the calendar header with the week's dates
function populateCalendarHeader() {
    const weekDates = getWeekDates(new Date(currentDate));
    const calendarHeader = document.getElementById('calendarHeader');
    // Clear any existing headers
    while (calendarHeader.firstChild) {
        calendarHeader.removeChild(calendarHeader.firstChild);
    }
    // Add corner cell
    const cornerCell = document.createElement('th');
    cornerCell.className = 'corner';
    calendarHeader.appendChild(cornerCell);
    // Add date headers
    weekDates.forEach(date => {
        const dateHeader = document.createElement('th');
        dateHeader.className = 'colHeader';
        dateHeader.innerText = date;
        calendarHeader.appendChild(dateHeader);
    });
}

function formatTimeTo12Hour(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDayOfWeek(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
}

function createThreeDotsButton() {
    let threeDotsButton = document.createElement('button');
    threeDotsButton.className = 'three-dots-button';
    threeDotsButton.innerText = '...';
    return threeDotsButton;
}

function createUnavailabilityOptions(tempId, cellDate, lead) {
    
    let options = document.createElement('div');
    options.className = 'unavailability-options';
    options.style.display = 'none';

    let allDayButton = document.createElement('button');
    allDayButton.innerText = 'Mark Unavailable (All Day)';
    allDayButton.dataset.tempId = tempId;
    allDayButton.dataset.cellDate = cellDate;
    allDayButton.addEventListener('click', function() {
        insertTimeOffRecord(this.dataset.tempId, this.dataset.cellDate);
        options.style.display = 'none';
    });
    options.appendChild(allDayButton);

    let hourlyButton = document.createElement('button');
    hourlyButton.innerText = 'Mark Unavailable (Hourly)';
    hourlyButton.dataset.tempId = tempId;
    hourlyButton.dataset.cellDate = cellDate;
    hourlyButton.addEventListener('click', function() {
        markUnavailableHourly(this.dataset.tempId, this.dataset.cellDate);
        options.style.display = 'none';
    });
    options.appendChild(hourlyButton);
    return options;
}

function handleThreeDotsButtonClick(event) {
    let options = event.target.parentElement.querySelector('.unavailability-options');
    if (options.style.display === 'none' || options.style.display === '') {
        options.style.display = 'block';
    } else {
        options.style.display = 'none';
    }
}


function populateCalendarBody(leads, schedules, timeOffRecords) {
    let tbody = document.querySelector('#calendarTable tbody');
    tbody.innerHTML = ""; // Clear any existing rows

    const weekDates = getWeekDates(new Date(currentDate));
    const weekStartDate = new Date(weekDates[0]);
    const weekEndDate = new Date(weekDates[weekDates.length - 1]);
    weekEndDate.setHours(23, 59, 59, 999); // Set the end date to the last millisecond of the day

    leads.forEach(lead => {
        let row = document.createElement('tr');
        let rowHeader = document.createElement('td');
        rowHeader.className = 'rowHeader';
        rowHeader.innerText = `${lead.First_Name} ${lead.Last_Name} (${lead.id})`;
        row.appendChild(rowHeader);

        weekDates.forEach(dateString => {
            let cell = document.createElement('td');
            cell.className = 'cell';
            cell.dataset.time = `${dateString}, ${lead.First_Name} ${lead.Last_Name}`;
            cell.dataset.tempId = lead.id;
            let cellDate = new Date(dateString);
            cellDate.setHours(0, 0, 0, 0);
            let dayOfWeek = getDayOfWeek(cellDate.getDay());

            // Check for unavailability records
            let unavailabilityRecords = timeOffRecords.filter(record => {
                if (record.Unavailability === 'All Day' && record.Unavailable_day === moment(cellDate).format('YYYY-MM-DD') && record.Name1.id === lead.id) {
                    return true;
                } else if (record.Unavailability === 'Hourly' && moment(record.From_Date_Time).format('YYYY-MM-DD') === moment(cellDate).format('YYYY-MM-DD') && record.Name1.id === lead.id) {
                    return true;
                }
                return false;
            });

            if (unavailabilityRecords.length > 0) {
                unavailabilityRecords.forEach(unavailabilityRecord => {
                    let unavailabilityHtml = '';
                    if (unavailabilityRecord.Unavailability === 'All Day') {
                        unavailabilityHtml = `
                            <div class="unavailable-box" data-record-id="${unavailabilityRecord.id}">
                                <p>Unavailable All Day</p><i class="fa-solid fa-trash"></i>
                            </div>
                        `;
                        // Add a class to the cell if it's unavailable all day
                        cell.classList.add('unavailable');
                    } else if (unavailabilityRecord.Unavailability === 'Hourly') {
                        let startTimeString = moment(unavailabilityRecord.From_Date_Time).format('hh:mm a');
                        let endTimeString = moment(unavailabilityRecord.To_Date).format('hh:mm a');
                        
                        unavailabilityHtml = `
                            <div class="unavailable-box" data-record-id="${unavailabilityRecord.id}">
                                <p>Unavailable (${startTimeString} - ${endTimeString})</p><i class="fa-solid fa-trash"></i>
                            </div>
                        `;
                    }
                    cell.innerHTML += unavailabilityHtml;
                });
                

                // Render schedules only if the cell doesn't have the 'unavailable' class
                if (!cell.classList.contains('unavailable')) {
                    let scheduleHtml = '';
                    schedules.forEach(schedule => {
                        if (schedule.Schedule_For_Temp && schedule.Schedule_For_Temp.id === lead.id) {
                            let jobName = schedule.Job ? schedule.Job.name : "No Job Assigned";
                            let daysInWeek = schedule.Days_in_the_Week;
                            let startDateTime = new Date(schedule.Start_Date_and_Work_Start_Time);
                            let endDateTime = new Date(schedule.End_Date_and_Work_End_Time);
                            let prevDayDateTime = new Date(startDateTime);
                            prevDayDateTime.setDate(prevDayDateTime.getDate() - 0); // Adjust to check previous day

                            let selectedDays = [];
                            if (daysInWeek.includes('Daily')) {
                                selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                            } else if (daysInWeek.includes('Weekdays')) {
                                selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                            } else {
                                selectedDays = daysInWeek;
                            }

                            if (selectedDays.includes(dayOfWeek)) {
                                if (startDateTime <= cellDate && endDateTime >= cellDate) {
                                    let startTimeString = formatTimeTo12Hour(startDateTime);
                                    let endTimeString = formatTimeTo12Hour(endDateTime);
                                    if (cellDate.toDateString() === startDateTime.toDateString()) {
                                        scheduleHtml += `<div class="schedule-box" data-record-id="${schedule.id}">
                                                            <p>${jobName}</p>
                                                            <p>${startTimeString} - ${endTimeString}</p>
                                                         </div>`;
                                    } else if (cellDate > startDateTime && cellDate < endDateTime) {
                                        scheduleHtml += `<div class="schedule-box" data-record-id="${schedule.id}">
                                                            <p>${jobName}</p>
                                                            <p>${startTimeString} - ${endTimeString}</p><
                                                         </div>`;
                                    }
                                }
                            }
                            
                        }
                    });

                    cell.innerHTML += scheduleHtml;
                }
                const deleteButtons = cell.querySelectorAll('.schedule-box i, .unavailable-box i');
                deleteButtons.forEach(button => {
                    button.addEventListener('click', (event) => {
                        const parentElement = event.target.closest('.schedule-box, .unavailable-box');
                        const recordId = parentElement.dataset.recordId;
                        const isUnavailable = parentElement.classList.contains('unavailable-box');
                
                        if (isUnavailable) {
                            ZOHO.CRM.API.deleteRecord({ Entity: "Time_Off", RecordID: recordId })
                                .then(function(data) {
                                    console.log("Time off record deleted successfully:", data);
                                    alert("Time off record deleted successfully!");
                                    fetchAndPopulateCalendar();
                                })
                                .catch(function(error) {
                                    console.error("Error deleting time off record:", error);
                                });
                        } else {
                            ZOHO.CRM.API.deleteRecord({ Entity: "Shift_Schedule", RecordID: recordId })
                                .then(function(data) {
                                    console.log("Shift schedule record deleted successfully:", data);
                                    alert("Shift schedule record deleted successfully!");
                                    fetchAndPopulateCalendar();
                                })
                                .catch(function(error) {
                                    console.error("Error deleting shift schedule record:", error);
                                });
                        }
                    });
                });
                

            } else {
                // Render schedules
                let scheduleHtml = '';
                schedules.forEach(schedule => {
                    if (schedule.Schedule_For_Temp && schedule.Schedule_For_Temp.id === lead.id) {
                        let jobName = schedule.Job ? schedule.Job.name : "No Job Assigned";
                        let daysInWeek = schedule.Days_in_the_Week;
                        let startDateTime = new Date(schedule.Start_Date_and_Work_Start_Time);
                        let endDateTime = new Date(schedule.End_Date_and_Work_End_Time);
                        let prevDayDateTime = new Date(startDateTime);
                        prevDayDateTime.setDate(prevDayDateTime.getDate() - 0); // Adjust to check previous day

                        let selectedDays = [];
                        if (daysInWeek.includes('Daily')) {
                            selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                        } else if (daysInWeek.includes('Weekdays')) {
                            selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                        } else {
                            selectedDays = daysInWeek;
                        }

                        if (selectedDays.includes(dayOfWeek)) {
                            if (startDateTime <= cellDate && endDateTime >= cellDate) {
                                let startTimeString = formatTimeTo12Hour(startDateTime);
                                let endTimeString = formatTimeTo12Hour(endDateTime);
                                if (cellDate.toDateString() === startDateTime.toDateString()) {
                                    scheduleHtml += `<div class="schedule-box" data-record-id="${schedule.id}">
                                                        <p>${jobName}</p>
                                                        <p>${startTimeString} - ${endTimeString}</p>
                                                     </div>`;
                                } else if (cellDate > startDateTime && cellDate < endDateTime) {
                                    scheduleHtml += `<div class="schedule-box" data-record-id="${schedule.id}">
                                                        <p>${jobName}</p>
                                                        <p>${startTimeString} - ${endTimeString}</p>
                                                     </div>`;
                                }
                            }
                        }
                        
                    }
                });

                cell.innerHTML += scheduleHtml;

            }


            

            // Add the three-dots button to each cell
            let threeDotsButton = createThreeDotsButton();
            cell.appendChild(threeDotsButton);

            // Add the unavailability options
            let options = createUnavailabilityOptions(lead.id, cellDate, lead);
            cell.appendChild(options);

            // Add event listener for the three-dots button
            threeDotsButton.addEventListener('click', handleThreeDotsButtonClick);

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

}



function fetchAndPopulateCalendar() {
    ZOHO.CRM.API.getAllRecords({ Entity: "Leads", sort_order: "desc", per_page: 200 })
        .then(function(response) {
            if (response.data && response.data.length > 0) {
                const leads = response.data.map(lead => ({
                    id: lead.id,
                    First_Name: lead.First_Name,
                    Last_Name: lead.Last_Name
                }));
                fetchAndPopulateSchedulesAndTimeOff(leads, searchTerm);
            } else {
                console.log("No leads found.");
                populateCalendarBody([], [], []);
            }
        })
        .catch(function(error) {
            console.error('Error fetching leads:', error);
            populateCalendarBody([], [], []);
        });
}

function fetchAndPopulateSchedulesAndTimeOff(leads, searchTerm = '') {
    const weekDates = getWeekDates(new Date(currentDate));
    const weekStartDate = moment(weekDates[0], 'MMM D, YYYY').format('YYYY-MM-DD');
    const weekEndDate = moment(weekDates[6], 'MMM D, YYYY').format('YYYY-MM-DD');

    const leadIds = leads.map(lead => lead.id);
    const leadIdsString = leadIds.join(",");

    // Filter leads based on the search term
    const filteredLeads = leads.filter(lead => {
        const fullName = `${lead.First_Name} ${lead.Last_Name}`;
        return fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const schedulePromise = ZOHO.CRM.API.getAllRecords({
        Entity: "Shift_Schedule",
        Criteria: `(Schedule_For_Temp:equals:${leadIdsString}) AND (Start_Date_and_Work_Start_Time:between:${weekStartDate}T00:00:00.000Z and ${weekEndDate}T23:59:59.999Z)`
    });

    const timeOffPromise = ZOHO.CRM.API.getAllRecords({
        Entity: "Time_Off",
        Criteria: `(Name1:equals:${leadIdsString}) AND ((From_Date_Time:between:${weekStartDate}T00:00:00.000Z and ${weekEndDate}T23:59:59.999Z) OR (Unavailable_day:between:${weekStartDate} and ${weekEndDate}))`
    });

    console.log('Fetching schedules and time-off records...');

    Promise.all([schedulePromise, timeOffPromise])
        .then(function([schedulesResponse, timeOffResponse]) {
            console.log('Schedules response:', schedulesResponse);
            console.log('Time-off response:', timeOffResponse);

            const schedules = schedulesResponse.data || [];
            const timeOffRecords = timeOffResponse.data || [];

            console.log('Schedules:', schedules);
            console.log('Time-off records:', timeOffRecords);

            populateCalendarBody(filteredLeads, schedules, timeOffRecords);
        })
        .catch(function(error) {
            console.error('Error fetching schedules or time-off records:', error);
            populateCalendarBody([], [], []);
        });
}
function searchLeads(searchTerm) {
    fetchAndPopulateCalendar(searchTerm);
}
function insertTimeOffRecord(tempId, cellDate) {
    const timeOffRecord = {
        "Name1": { "id": tempId },
        "Unavailable_day": moment(cellDate).format('YYYY-MM-DD'),
        "Unavailability": "All Day"
    };

    ZOHO.CRM.API.insertRecord({ Entity: "Time_Off", APIData: timeOffRecord })
        .then(function(response) {
            if (response.data && response.data.length > 0 && response.data[0].code === "SUCCESS") {
                console.log('Time off record inserted successfully:', response.data);
                alert("All Day Unavailability Record created successfully! ");
                fetchAndPopulateCalendar(); // Refresh the calendar to show the updated data
            } else {
                console.error('Error inserting time off record:', response.data);
            }
        })
        .catch(function(error) {
            console.error('Error inserting time off record:', error);
            searchLeads(searchTerm);
        });
}
// Insert the new function here


let hourlyUnavailabilityPopup;
let backdropElement;

function markUnavailableHourly(tempId, cellDate) {
    // Remove any existing popup
    if (hourlyUnavailabilityPopup) {
        hourlyUnavailabilityPopup.remove();
    }

    const cell = document.querySelector(`td[data-time*='${moment(cellDate).format('MMM D, YYYY')}']`);
    if (cell) {
        // Create a backdrop element to blur the background
        backdropElement = document.createElement('div');
        backdropElement.className = 'backdrop';
        document.body.appendChild(backdropElement);

        // Create a small popup
        hourlyUnavailabilityPopup = document.createElement('div');
        hourlyUnavailabilityPopup.className = 'hourly-unavailability-popup';
        hourlyUnavailabilityPopup.innerHTML = `
            <input type="date" id="unavailable-date" value="${moment(cellDate).format('YYYY-MM-DD')}">
            <input type="time" id="unavailable-start-time">
            <input type="time" id="unavailable-end-time">
            <button id="save-hourly-unavailability" style="font-size: 12px;">Save</button>
            <button id="cancel-hourly-unavailability" style="font-size: 12px;">Cancel</button>
            <div id="error-message"></div>
        `;

        // Center the popup
        hourlyUnavailabilityPopup.style.position = 'fixed';
        hourlyUnavailabilityPopup.style.top = '50%';
        hourlyUnavailabilityPopup.style.left = '50%';
        hourlyUnavailabilityPopup.style.transform = 'translate(-50%, -50%)';
        hourlyUnavailabilityPopup.style.zIndex = '1';

        document.body.appendChild(hourlyUnavailabilityPopup);

        // Add event listeners
        document.getElementById('save-hourly-unavailability').addEventListener('click', () => {
            const date = document.getElementById('unavailable-date').value;
            const startTime = document.getElementById('unavailable-start-time').value;
            const endTime = document.getElementById('unavailable-end-time').value;
            const errorMessage = document.getElementById('error-message');

            // Validate input fields
            if (!date || !startTime || !endTime) {
                errorMessage.innerText = 'Please fill in all fields.';
                return;
            }

            // Update cell for hourly unavailability
            function updateCellForHourlyUnavailability(tempId, cellDate, startTime, endTime) {
                let formattedCellDate = moment(cellDate).format('YYYY-MM-DD');
                let formattedStartTime = moment(`${formattedCellDate} ${startTime}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');
                let formattedEndTime = moment(`${formattedCellDate} ${endTime}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');

                var recordData = {
                    "Name1": tempId,
                    "Unavailability": "Hourly",
                    "From_Date_Time": formattedStartTime,
                    "To_Date": formattedEndTime
                };

                ZOHO.CRM.API.insertRecord({ Entity: "Time_Off", APIData: recordData, Trigger: [] })
                    .then(function(data) {
                        console.log("Insert Response: ", data);
                        if (data.data && data.data.length > 0 && data.data[0].code === "SUCCESS") {
                            alert("Hourly Unavailability Record created successfully! ");
                            let cellSelector = `td[data-time*='${moment(cellDate).format('MMM D, YYYY')}'][data-temp-id='${tempId}']`;
                            let cell = document.querySelector(cellSelector);
                            if (cell) {
                                let unavailabilityHtml = `
                                    <div class="unavailable-box">
                                        <p>Unavailable (${startTime} - ${endTime})</p><i class="fa-solid fa-trash"></i>
                                    </div>
                                `;
                                cell.innerHTML = unavailabilityHtml;
                                cell.classList.add('unavailable'); // Mark the cell as unavailable
                            }
                            fetchAndPopulateCalendar(); // Call this function to re-render the calendar
                        } else {
                            alert("Failed to create Hourly Unavailability Record: " + (data.data[0].message || "Unknown error"));
                        }
                    })
                    .catch(function(error) {
                        console.error('Error inserting Hourly Unavailability Record:', error);
                        alert('An error occurred while creating the Hourly Unavailability Record. Check the console for details. ');
                    });
            }

            updateCellForHourlyUnavailability(tempId, cellDate, startTime, endTime);
            hourlyUnavailabilityPopup.remove(); // Remove the popup
            backdropElement.remove(); // Remove the backdrop
        });

        document.getElementById('cancel-hourly-unavailability').addEventListener('click', () => {
            hourlyUnavailabilityPopup.remove(); // Remove the popup
            backdropElement.remove(); // Remove the backdrop
        });
    }
}


let searchTerm = '';

document.getElementById('prevWeek').addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() - 7);
    populateCalendarHeader();
    searchLeads(searchTerm); // Apply the search filter
});

document.getElementById('nextWeek').addEventListener('click', function() {
    currentDate.setDate(currentDate.getDate() + 7);
    populateCalendarHeader();
    searchLeads(searchTerm); // Apply the search filter
});

document.getElementById('currentWeek').addEventListener('click', function() {
    currentDate = new Date(today);
    populateCalendarHeader();
    searchLeads(searchTerm); // Apply the search filter
});

$(document).ready(function() {
    ZOHO.embeddedApp.on("PageLoad", function(data) {
        populateCalendarHeader();
        fetchAndPopulateCalendar();
    });

    ZOHO.embeddedApp.init();

 
    document.addEventListener('click', function(event) {
        let options = document.querySelectorAll('.unavailability-options');
        options.forEach(option => {
            if (!option.contains(event.target) && !event.target.classList.contains('three-dots-button')) {
                option.style.display = 'none';
            }
        });
    });
});
