import { test } from "node:test";
import assert from "node:assert/strict";
import { Dashboard } from "./dashboard-widget.js";

const mockDataTemplate = {
  habitCompletionRate: 75,
  avgStreak: 12,
  tasksCompleted: 8,
  level: 5,
  habits: [
    { id: 1, name: "Exercise", status: "done", streak: 15 },
    { id: 2, name: "Read", status: "pending", streak: 8 },
    { id: 3, name: "Meditate", status: "done", streak: 5 },
  ],
  tasks: [
    { id: 101, name: "Finish redesign", priority: "high", status: "done" },
    { id: 102, name: "Review code", priority: "high", status: "in-progress" },
    { id: 103, name: "Deploy", priority: "medium", status: "pending" },
  ],
  goals: [
    { id: 201, name: "Build MCP dashboard", progress: 85, targetDate: "2026-11-15" },
  ],
};

const getMockData = () => JSON.parse(JSON.stringify(mockDataTemplate));

test("Dashboard - Filter habits by done status", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.setFilter("done");
  const filtered = dashboard.getFilteredHabits();
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(h => h.status === "done"));
});

test("Dashboard - Filter habits by pending status", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.setFilter("pending");
  const filtered = dashboard.getFilteredHabits();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "Read");
});

test("Dashboard - Return all habits with 'all' filter", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.setFilter("all");
  const filtered = dashboard.getFilteredHabits();
  assert.equal(filtered.length, 3);
});

test("Dashboard - Filter tasks by priority", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.setFilter("high");
  const filtered = dashboard.getFilteredTasks();
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(t => t.priority === "high"));
});

test("Dashboard - Reject invalid filter", () => {
  const dashboard = new Dashboard(getMockData());
  const result = dashboard.setFilter("invalid");
  assert.equal(result, false);
});

test("Dashboard - Undo disabled initially", () => {
  const dashboard = new Dashboard(getMockData());
  assert.equal(dashboard.canUndo(), false);
});

test("Dashboard - Enable undo after state change", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.addHabit("Yoga");
  assert.equal(dashboard.canUndo(), true);
});

test("Dashboard - Undo state change", () => {
  const dashboard = new Dashboard(getMockData());
  const initial = dashboard.data.habits.length;
  dashboard.addHabit("Yoga");
  assert.equal(dashboard.data.habits.length, initial + 1);
  dashboard.undo();
  assert.equal(dashboard.data.habits.length, initial);
});

test("Dashboard - Redo state change", () => {
  const dashboard = new Dashboard(getMockData());
  const initial = dashboard.data.habits.length;
  dashboard.addHabit("Yoga");
  dashboard.undo();
  dashboard.redo();
  assert.equal(dashboard.data.habits.length, initial + 1);
});

test("Dashboard - Redo disabled at end of history", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.addHabit("Yoga");
  assert.equal(dashboard.canRedo(), false);
});

test("Dashboard - Clear redo history on new state after undo", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.addHabit("Yoga");
  dashboard.addHabit("Swimming");
  dashboard.undo();
  dashboard.addHabit("Dancing");
  assert.equal(dashboard.canRedo(), false);
});

test("Dashboard - Toggle habit status", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.toggleHabit(1);
  const habit = dashboard.data.habits.find(h => h.id === 1);
  assert.equal(habit.status, "pending");
});

test("Dashboard - Save state after toggle", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.toggleHabit(1);
  assert.equal(dashboard.canUndo(), true);
});

test("Dashboard - Add new habit", () => {
  const dashboard = new Dashboard(getMockData());
  const initial = dashboard.data.habits.length;
  const newHabit = dashboard.addHabit("Yoga");
  assert.equal(newHabit.name, "Yoga");
  assert.equal(newHabit.status, "pending");
  assert.equal(dashboard.data.habits.length, initial + 1);
});

test("Dashboard - Return false for invalid habit ID", () => {
  const dashboard = new Dashboard(getMockData());
  const result = dashboard.toggleHabit(999);
  assert.equal(result, false);
});

test("Dashboard - Calculate habit completion rate", () => {
  const dashboard = new Dashboard(getMockData());
  const metrics = dashboard.getMetrics();
  assert.equal(metrics.habitCompletionRate, 67); // 2 done out of 3
});

test("Dashboard - Calculate completed tasks", () => {
  const dashboard = new Dashboard(getMockData());
  const metrics = dashboard.getMetrics();
  assert.equal(metrics.tasksCompleted, 1);
});

test("Dashboard - Calculate average streak", () => {
  const dashboard = new Dashboard(getMockData());
  const metrics = dashboard.getMetrics();
  assert.equal(metrics.avgStreak, 9); // (15 + 8 + 5) / 3
});

test("Dashboard - Handle zero habits gracefully", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.data.habits = [];
  const metrics = dashboard.getMetrics();
  assert.equal(metrics.habitCompletionRate, 0);
  assert.equal(metrics.avgStreak, 0);
});

test("Dashboard - Reflect new habit in metrics", () => {
  const dashboard = new Dashboard(getMockData());
  dashboard.addHabit("NewHabit");
  const metrics = dashboard.getMetrics();
  assert.equal(metrics.habitsTotal, 4);
});

test("Dashboard - Maintain data across operations", () => {
  const dashboard = new Dashboard(getMockData());
  const original = JSON.parse(JSON.stringify(dashboard.data));
  dashboard.addHabit("Test");
  dashboard.undo();
  assert.deepEqual(dashboard.data, original);
});

test("Dashboard - Preserve all data fields", () => {
  const dashboard = new Dashboard(getMockData());
  assert.equal(dashboard.data.level, 5);
  assert.equal(dashboard.data.goals.length, 1);
  assert.equal(dashboard.data.habits.length, 3);
});
