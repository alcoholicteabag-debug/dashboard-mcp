import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as readline from "readline";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function handleRequest(request: Record<string, unknown>) {
  const { method, params } = request as {
    method: string;
    params?: Record<string, unknown>;
  };

  if (method === "tools/list") {
    return {
      tools: [
        {
          name: "get_dashboard_state",
          description:
            "Fetch current dashboard state: habits, tasks, metrics, goals",
          inputSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "User ID (defaults to 'default')",
              },
            },
          },
        },
        {
          name: "add_habit",
          description: "Add a new habit to track",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Habit name" },
              userId: {
                type: "string",
                description: "User ID (defaults to 'default')",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "toggle_habit",
          description: "Mark a habit as done or pending",
          inputSchema: {
            type: "object",
            properties: {
              habitId: { type: "number", description: "Habit ID" },
              userId: {
                type: "string",
                description: "User ID (defaults to 'default')",
              },
            },
            required: ["habitId"],
          },
        },
        {
          name: "get_metrics",
          description: "Get weekly/monthly metrics and analytics",
          inputSchema: {
            type: "object",
            properties: {
              period: {
                type: "string",
                enum: ["daily", "weekly", "monthly"],
                description: "Time period",
              },
              userId: {
                type: "string",
                description: "User ID (defaults to 'default')",
              },
            },
          },
        },
      ],
    };
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params as {
      name: string;
      arguments?: Record<string, unknown>;
    };
    const arg = (args || {}) as Record<string, unknown>;

    try {
      if (name === "get_dashboard_state") {
        const userId = (arg.userId as string) || "default";
        const { data: state, error } = await supabase
          .from("dashboard_state")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  habitCompletionRate: 0,
                  avgStreak: 0,
                  tasksCompleted: 0,
                  level: 1,
                  habits: [],
                  tasks: [],
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(state.data || {}),
            },
          ],
        };
      }

      if (name === "add_habit") {
        const habitName = arg.name as string;
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const currentData = state?.data || { habits: [], tasks: [], goals: [] };
        const newHabit = {
          id: Date.now(),
          name: habitName,
          status: "pending",
          streak: 0,
          createdAt: new Date().toISOString(),
        };

        currentData.habits = [
          ...(currentData.habits || []),
          newHabit,
        ];

        await supabase
          .from("dashboard_state")
          .upsert({ user_id: userId, data: currentData });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, habit: newHabit }),
            },
          ],
        };
      }

      if (name === "toggle_habit") {
        const habitId = arg.habitId as number;
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const currentData = state?.data || {};
        const habit = (currentData.habits || []).find(
          (h: Record<string, unknown>) => h.id === habitId
        );
        if (!habit) throw new Error("Habit not found");

        habit.status = habit.status === "done" ? "pending" : "done";

        await supabase
          .from("dashboard_state")
          .upsert({ user_id: userId, data: currentData });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                habit,
                message: `Habit marked as ${habit.status}`,
              }),
            },
          ],
        };
      }

      if (name === "get_metrics") {
        const period = (arg.period as string) || "weekly";
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const data = state?.data || {};
        const habits = (data.habits as Record<string, unknown>[]) || [];
        const tasks = (data.tasks as Record<string, unknown>[]) || [];

        const habitDone = habits.filter((h) => h.status === "done").length;
        const habitRate = habits.length
          ? Math.round((habitDone / habits.length) * 100)
          : 0;
        const avgStreak = habits.length
          ? Math.round(
              habits.reduce(
                (sum: number, h) => sum + ((h.streak as number) || 0),
                0
              ) / habits.length
            )
          : 0;
        const tasksDone = tasks.filter((t) => t.status === "done").length;

        const metrics = {
          period,
          habitCompletionRate: habitRate,
          habitsCompleted: habitDone,
          habitsTotal: habits.length,
          tasksCompleted: tasksDone,
          tasksTotal: tasks.length,
          avgStreak,
          topHabit:
            habits.reduce(
              (best: Record<string, unknown>, h) =>
                ((h.streak as number) || 0) > ((best.streak as number) || 0)
                  ? h
                  : best,
              habits[0] || {}
            ).name || "N/A",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(metrics) }],
        };
      }

      if (name === "export_digest") {
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const data = state?.data || {};
        const habits = (data.habits as Record<string, unknown>[]) || [];
        const tasks = (data.tasks as Record<string, unknown>[]) || [];

        const habitDone = habits.filter((h) => h.status === "done").length;
        const habitRate = habits.length
          ? Math.round((habitDone / habits.length) * 100)
          : 0;
        const tasksDone = tasks.filter((t) => t.status === "done").length;

        const digest = {
          date: new Date().toISOString().split("T")[0],
          summary: `${habitRate}% habits done, ${tasksDone}/${tasks.length} tasks completed`,
          habitCompletionRate: habitRate,
          habitsCompleted: habitDone,
          habitsTotal: habits.length,
          tasksCompleted: tasksDone,
          tasksTotal: tasks.length,
          doneHabits: habits
            .filter((h) => h.status === "done")
            .map((h) => (h as Record<string, unknown>).name),
          pendingHabits: habits
            .filter((h) => h.status === "pending")
            .map((h) => (h as Record<string, unknown>).name),
          completedTasks: tasks
            .filter((t) => (t as Record<string, unknown>).status === "done")
            .map((t) => (t as Record<string, unknown>).name),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(digest),
            },
          ],
        };
      }

      if (name === "get_goals") {
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const data = state?.data || {};
        const goals = (data.goals as Record<string, unknown>[]) || [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ goals, count: goals.length }),
            },
          ],
        };
      }

      if (name === "take_screenshot") {
        const userId = (arg.userId as string) || "default";

        const { data: state } = await supabase
          .from("dashboard_state")
          .select("data")
          .eq("user_id", userId)
          .single();

        const data = state?.data || {};
        const screenshotData = {
          timestamp: new Date().toISOString(),
          userId,
          metrics: {
            habitRate:
              (data as Record<string, unknown>).habitCompletionRate || 0,
            level: (data as Record<string, unknown>).level || 1,
          },
          habitsCount:
            (
              (data as Record<string, unknown>).habits as
                | Record<string, unknown>[]
                | undefined
            )?.length || 0,
          tasksCount:
            (
              (data as Record<string, unknown>).tasks as
                | Record<string, unknown>[]
                | undefined
            )?.length || 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(screenshotData),
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(e) }),
          },
        ],
      };
    }
  }

  return { error: `Unknown method: ${method}` };
}

rl.on("line", async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (e) {
    console.log(
      JSON.stringify({ error: String(e) })
    );
  }
});

console.error("Dashboard MCP server running on stdio");

// ========== EXPRESS REST API FOR MOBILE ==========

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET dashboard state
app.get("/api/dashboard/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: state, error } = await supabase
      .from("dashboard_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) return res.status(404).json({ error: "Not found" });
    return res.json(state.data || {});
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST add habit
app.post("/api/dashboard/:userId/habit", async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "name required" });

  try {
    const { data: state } = await supabase
      .from("dashboard_state")
      .select("data")
      .eq("user_id", userId)
      .single();

    const currentData = state?.data || { habits: [], tasks: [], goals: [] };
    const newHabit = {
      id: Date.now(),
      name,
      status: "pending",
      streak: 0,
      createdAt: new Date().toISOString(),
    };

    currentData.habits = [...(currentData.habits || []), newHabit];

    await supabase
      .from("dashboard_state")
      .upsert({ user_id: userId, data: currentData });

    return res.json({ success: true, habit: newHabit });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST toggle habit
app.post("/api/dashboard/:userId/habit/:habitId/toggle", async (req, res) => {
  const { userId, habitId } = req.params;

  try {
    const { data: state } = await supabase
      .from("dashboard_state")
      .select("data")
      .eq("user_id", userId)
      .single();

    const currentData = state?.data || {};
    const habit = (currentData.habits || []).find(
      (h: Record<string, unknown>) => h.id === Number(habitId)
    );

    if (!habit) return res.status(404).json({ error: "Habit not found" });

    habit.status = habit.status === "done" ? "pending" : "done";

    await supabase
      .from("dashboard_state")
      .upsert({ user_id: userId, data: currentData });

    return res.json({ success: true, habit });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET digest (daily summary)
app.get("/api/dashboard/:userId/digest", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: state } = await supabase
      .from("dashboard_state")
      .select("data")
      .eq("user_id", userId)
      .single();

    const data = state?.data || {};
    const habits = (data.habits as Record<string, unknown>[]) || [];
    const tasks = (data.tasks as Record<string, unknown>[]) || [];

    const habitDone = habits.filter((h) => h.status === "done").length;
    const habitRate = habits.length
      ? Math.round((habitDone / habits.length) * 100)
      : 0;
    const tasksDone = tasks.filter((t) => t.status === "done").length;

    const digest = {
      date: new Date().toISOString().split("T")[0],
      habitCompletionRate: habitRate,
      habitsCompleted: habitDone,
      habitsTotal: habits.length,
      tasksCompleted: tasksDone,
      tasksTotal: tasks.length,
      summary: `${habitRate}% habits done, ${tasksDone}/${tasks.length} tasks`,
    };

    return res.json(digest);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET goals
app.get("/api/dashboard/:userId/goals", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: state } = await supabase
      .from("dashboard_state")
      .select("data")
      .eq("user_id", userId)
      .single();

    const data = state?.data || {};
    const goals = (data.goals as Record<string, unknown>[]) || [];

    return res.json({ goals });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// Health check
app.get("/health", (_req, res) => {
  return res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.error(`REST API running on port ${PORT}`);
  console.error(`Health check: http://localhost:${PORT}/health`);
});
