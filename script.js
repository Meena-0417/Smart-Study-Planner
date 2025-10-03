// script.js
class StudyPlanner {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
        this.init();
    }

    init() {
        // DOM Elements
        this.taskForm = document.getElementById('taskForm');
        this.tasksList = document.getElementById('tasksList');
        this.timeline = document.getElementById('timeline');
        this.filterPriority = document.getElementById('filterPriority');
        this.filterStatus = document.getElementById('filterStatus');

        // Event Listeners
        this.taskForm.addEventListener('submit', (e) => this.addTask(e));
        this.filterPriority.addEventListener('change', () => this.renderTasks());
        this.filterStatus.addEventListener('change', () => this.renderTasks());

        // Set minimum date to today
        document.getElementById('taskDate').min = new Date().toISOString().split('T')[0];

        // Initial render
        this.renderTasks();
        this.renderTimeline();
        this.renderStats();
        
        // Start reminders
        this.checkReminders();
        setInterval(() => this.checkReminders(), 30 * 60 * 1000); // Check every 30 minutes
    }

    addTask(e) {
        e.preventDefault();
        
        const taskData = {
            id: Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            date: document.getElementById('taskDate').value,
            priority: document.getElementById('taskPriority').value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(taskData);
        this.saveTasks();
        this.renderTasks();
        this.renderTimeline();
        this.renderStats();
        this.taskForm.reset();

        // Show success feedback
        this.showNotification('Task added successfully!', 'success');
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.renderTimeline();
            this.renderStats();
            this.showNotification('Task deleted!', 'error');
        }
    }

    toggleTaskCompletion(taskId) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        this.saveTasks();
        this.renderTasks();
        this.renderTimeline();
        this.renderStats();
        
        const task = this.tasks.find(t => t.id === taskId);
        const message = task.completed ? 'Task completed! Great job! 🎉' : 'Task marked as pending';
        this.showNotification(message, 'success');
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Create edit form
        const editForm = `
            <div class="edit-form">
                <h3>Edit Task</h3>
                <form id="editTaskForm-${task.id}">
                    <div class="form-group">
                        <input type="text" id="editTitle-${task.id}" value="${this.escapeHtml(task.title)}" required>
                    </div>
                    <div class="form-group">
                        <textarea id="editDescription-${task.id}">${this.escapeHtml(task.description)}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editDate-${task.id}">Due Date:</label>
                            <input type="date" id="editDate-${task.id}" value="${task.date}" required>
                        </div>
                        <div class="form-group">
                            <label for="editPriority-${task.id}">Priority:</label>
                            <select id="editPriority-${task.id}">
                                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                    <div class="edit-form-buttons">
                        <button type="submit">Save Changes</button>
                        <button type="button" class="cancel-btn" onclick="planner.cancelEdit('${task.id}')">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        // Find task element and append edit form
        const taskElement = document.querySelector(`[onclick="planner.editTask('${task.id}')"]`).closest('.task-item');
        taskElement.insertAdjacentHTML('afterend', editForm);

        // Add event listener for form submission
        document.getElementById(`editTaskForm-${task.id}`).addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTaskEdit(task.id);
        });
    }

    saveTaskEdit(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        this.tasks[taskIndex] = {
            ...this.tasks[taskIndex],
            title: document.getElementById(`editTitle-${taskId}`).value,
            description: document.getElementById(`editDescription-${taskId}`).value,
            date: document.getElementById(`editDate-${taskId}`).value,
            priority: document.getElementById(`editPriority-${taskId}`).value
        };

        this.saveTasks();
        this.renderTasks();
        this.renderTimeline();
        this.renderStats();
        this.showNotification('Task updated successfully!', 'success');
    }

    cancelEdit(taskId) {
        const editForm = document.querySelector(`#editTaskForm-${taskId}`)?.closest('.edit-form');
        if (editForm) {
            editForm.remove();
        }
    }

    saveTasks() {
        localStorage.setItem('studyTasks', JSON.stringify(this.tasks));
    }

    getFilteredTasks() {
        let filtered = this.tasks;
        
        // Filter by priority
        if (this.filterPriority.value !== 'all') {
            filtered = filtered.filter(task => task.priority === this.filterPriority.value);
        }
        
        // Filter by status
        if (this.filterStatus.value !== 'all') {
            const statusFilter = this.filterStatus.value === 'completed';
            filtered = filtered.filter(task => task.completed === statusFilter);
        }
        
        return filtered;
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.tasksList.innerHTML = `
                <div class="empty-state">
                    <p>📚 No study tasks found</p>
                    <p>Add your first task to get started!</p>
                </div>
            `;
            return;
        }

        this.tasksList.innerHTML = filteredTasks
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(task => `
                <div class="task-item ${task.completed ? 'task-completed' : ''}">
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-date">📅 ${this.formatDate(task.date)}</span>
                            <span class="task-priority priority-${task.priority}">
                                ${task.priority.toUpperCase()}
                            </span>
                            ${task.completed ? '<span style="color: #10b981;">✅ Completed</span>' : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="planner.toggleTaskCompletion('${task.id}')">
                            ${task.completed ? '↶' : '✓'}
                        </button>
                        <button class="action-btn edit-btn" onclick="planner.editTask('${task.id}')">
                            ✏️
                        </button>
                        <button class="action-btn delete-btn" onclick="planner.deleteTask('${task.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');
    }

    renderTimeline() {
        const upcomingTasks = this.tasks
            .filter(task => !task.completed && new Date(task.date) >= new Date().setHours(0,0,0,0))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5); // Show only next 5 tasks

        if (upcomingTasks.length === 0) {
            this.timeline.innerHTML = `
                <div class="empty-state">
                    <p>🎉 No upcoming tasks! Great work!</p>
                    <p>Add new tasks to see them on your timeline.</p>
                </div>
            `;
            return;
        }

        // Group tasks by date
        const tasksByDate = upcomingTasks.reduce((groups, task) => {
            const date = task.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(task);
            return groups;
        }, {});

        this.timeline.innerHTML = Object.entries(tasksByDate)
            .map(([date, tasks]) => `
                <div class="timeline-item">
                    <div class="timeline-date">${this.formatDate(date)}</div>
                    <div class="timeline-tasks">
                        ${tasks.map(task => `
                            <div style="margin-bottom: 0.5rem;">
                                <strong>${this.escapeHtml(task.title)}</strong>
                                <span class="task-priority priority-${task.priority}" style="margin-left: 0.5rem;">
                                    ${task.priority.toUpperCase()}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    }

    renderStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const highPriorityTasks = this.tasks.filter(task => task.priority === 'high' && !task.completed).length;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const statsHTML = `
            <div class="stat-card stat-completed">
                <div class="stat-number">${completedTasks}</div>
                <div class="stat-label">Tasks Completed</div>
            </div>
            <div class="stat-card stat-pending">
                <div class="stat-number">${pendingTasks}</div>
                <div class="stat-label">Tasks Pending</div>
            </div>
            <div class="stat-card stat-high-priority">
                <div class="stat-number">${highPriorityTasks}</div>
                <div class="stat-label">High Priority Due</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completionRate}%</div>
                <div class="stat-label">Overall Progress</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionRate}%"></div>
                </div>
            </div>
        `;

        document.getElementById('stats').innerHTML = statsHTML;
    }

    checkReminders() {
        const today = new Date().toISOString().split('T')[0];
        const dueTasks = this.tasks.filter(task => 
            !task.completed && task.date === today
        );
        
        if (dueTasks.length > 0) {
            const taskTitles = dueTasks.map(task => task.title).join(', ');
            this.showNotification(`📚 Reminder: You have ${dueTasks.length} task(s) due today! ${taskTitles}`, 'success');
        }

        // Check for upcoming tasks (next 2 days)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        
        const upcomingTasks = this.tasks.filter(task => 
            !task.completed && 
            (task.date === tomorrow.toISOString().split('T')[0] || 
             task.date === dayAfter.toISOString().split('T')[0])
        );
        
        if (upcomingTasks.length > 0) {
            const upcomingCount = upcomingTasks.length;
            this.showNotification(`🔔 You have ${upcomingCount} task(s) coming up in the next 2 days!`, 'success');
        }
    }

    formatDate(dateString) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showNotification(message, type) {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.planner = new StudyPlanner();
});