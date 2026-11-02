
const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

let apiUrl = "";
let apiKey = "";
let editingId = null;

async function request(method, query = "", data = null) {
    const options = {
        method: method,
        headers: {
            "apikey": apiKey
        }
    };

    if (data !== null) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    const response = await fetch(apiUrl + query, options);

    if (!response.ok) {
        throw new Error("Request failed: " + response.status +
            " " + await response.text());
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

function showError(error) {
    statusMessage.textContent = "Error: " + error.message;
}

async function loadTasks() {
    const tasks = await request("GET", "?select=*");

    taskList.innerHTML = "";

    for (const task of tasks) {
        const item = document.createElement("div");
        item.className = "task-item";
        item.dataset.id = task.id;

        const title = document.createElement("h3");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description || "";

        const status = document.createElement("p");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "Incomplete";

        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";
        editButton.onclick = () => editTask(task.id);

        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent = task.completed ? "Undo" : "Complete";
        toggleButton.onclick = () => toggleTask(task);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteTask(task.id);

        item.append(
            title,
            description,
            status,
            editButton,
            toggleButton,
            deleteButton
        );

        taskList.appendChild(item);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const task = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim()
    };

    if (!task.title) {
        statusMessage.textContent = "Enter a task title";
        return;
    }

    try {
        if (editingId === null) {
            await request("POST", "", task);
        } else {
            await request("PATCH", "?id=eq." + editingId, task);
        }

        editingId = null;
        form.reset();
        submitButton.textContent = "Save Task";

        await loadTasks();
        statusMessage.textContent = "Task saved successfully";
    } catch (error) {
        showError(error);
    }
});

async function editTask(id) {
    try {
        const tasks = await request("GET", "?id=eq." + id + "&select=*");

        if (tasks.length === 0) {
            throw new Error("Task not found");
        }

        const task = tasks[0];

        editingId = task.id;
        titleInput.value = task.title;
        descriptionInput.value = task.description || "";
        submitButton.textContent = "Update Task";
        statusMessage.textContent = "Editing task " + id;
    } catch (error) {
        showError(error);
    }
}

async function toggleTask(task) {
    try {
        await request("PATCH", "?id=eq." + task.id, {
            completed: !task.completed
        });

        await loadTasks();
        statusMessage.textContent = "Task status updated";
    } catch (error) {
        showError(error);
    }
}

async function deleteTask(id) {
    try {
        await request("DELETE", "?id=eq." + id);

        if (editingId === id) {
            editingId = null;
            form.reset();
            submitButton.textContent = "Save Task";
        }

        await loadTasks();
        statusMessage.textContent = "Task deleted";
    } catch (error) {
        showError(error);
    }
}

async function init() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Cannot load config.json");
        }

        const config = await response.json();

        apiUrl = config.supabaseUrl.replace(/\/$/, "") +
            "/rest/v1/" + config.tableName;

        apiKey = config.supabasePublishableKey;

        await loadTasks();
    } catch (error) {
        showError(error);
    }
}

init();
