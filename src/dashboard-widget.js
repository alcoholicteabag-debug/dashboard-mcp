// dashboard-widget.js — Testable dashboard logic

export class Dashboard {
  constructor(initialData) {
    this.data = initialData;
    this.history = [JSON.parse(JSON.stringify(initialData))];
    this.historyIndex = 0;
    this.currentFilter = "all";
  }

  getFilteredHabits() {
    let filtered = this.data.habits || [];
    if (this.currentFilter === "done") {
      filtered = filtered.filter(h => h.status === "done");
    }
    if (this.currentFilter === "pending") {
      filtered = filtered.filter(h => h.status === "pending");
    }
    return filtered;
  }

  getFilteredTasks() {
    let filtered = this.data.tasks || [];
    if (this.currentFilter === "high") {
      filtered = filtered.filter(t => t.priority === "high");
    }
    return filtered;
  }

  setFilter(filter) {
    if (["all", "done", "pending", "high"].includes(filter)) {
      this.currentFilter = filter;
      return true;
    }
    return false;
  }

  saveState() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.data)));
    this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.data = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.data = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  toggleHabit(habitId) {
    const habit = (this.data.habits || []).find(h => h.id === habitId);
    if (habit) {
      habit.status = habit.status === "done" ? "pending" : "done";
      this.saveState();
      return true;
    }
    return false;
  }

  addHabit(name) {
    const newHabit = {
      id: Date.now(),
      name,
      status: "pending",
      streak: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.habits = [...(this.data.habits || []), newHabit];
    this.saveState();
    return newHabit;
  }

  getMetrics() {
    const habits = this.data.habits || [];
    const tasks = this.data.tasks || [];

    const habitDone = habits.filter(h => h.status === "done").length;
    const habitRate = habits.length
      ? Math.round((habitDone / habits.length) * 100)
      : 0;

    return {
      habitCompletionRate: habitRate,
      habitsCompleted: habitDone,
      habitsTotal: habits.length,
      tasksCompleted: tasks.filter(t => t.status === "done").length,
      tasksTotal: tasks.length,
      avgStreak: habits.length
        ? Math.round(
            habits.reduce((sum, h) => sum + (h.streak || 0), 0) / habits.length
          )
        : 0,
      level: this.data.level || 1,
    };
  }
}
