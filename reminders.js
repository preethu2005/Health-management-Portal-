
document.getElementById('health-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const healthData = document.getElementById('healthData').value;
    const reminders = document.getElementById('reminders').value.split(',');

    const response = await fetch('/addRecord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age, healthData, reminders })
    });

    const result = await response.json();
    alert(result.message);
    loadRecords();  // Reload records
});

async function loadRecords() {
    const response = await fetch('/records');
    const records = await response.json();

    const recordsDiv = document.getElementById('records');
    recordsDiv.innerHTML = '';

    records.forEach(record => {
        const recordEl = document.createElement('div');
        recordEl.className = 'record';
        recordEl.innerHTML = `<strong>Name:</strong> ${record.name} <br>
                              <strong>Age:</strong> ${record.age} <br>
                              <strong>Health Data:</strong> ${record.healthData} <br>
                              <strong>Reminders:</strong> ${record.reminders.join(', ')}`;
        recordsDiv.appendChild(recordEl);
    });
}

loadRecords();  // Initial load
