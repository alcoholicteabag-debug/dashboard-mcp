-- Supabase SQL Schema
-- Run this in your Supabase dashboard under SQL Editor

CREATE TABLE IF NOT EXISTS dashboard_state (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_dashboard_state_user_id ON dashboard_state(user_id);
CREATE INDEX idx_dashboard_state_updated_at ON dashboard_state(updated_at DESC);

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_state;

-- Initial data for demo user
INSERT INTO dashboard_state (user_id, data) VALUES (
  'default',
  '{
    "habitCompletionRate": 75,
    "avgStreak": 12,
    "tasksCompleted": 8,
    "level": 5,
    "habits": [
      {
        "id": 1,
        "name": "Exercise",
        "status": "done",
        "streak": 15,
        "createdAt": "2026-10-25T08:00:00Z"
      },
      {
        "id": 2,
        "name": "Read",
        "status": "pending",
        "streak": 8,
        "createdAt": "2026-10-26T09:00:00Z"
      },
      {
        "id": 3,
        "name": "Meditate",
        "status": "done",
        "streak": 5,
        "createdAt": "2026-10-27T06:30:00Z"
      }
    ],
    "tasks": [
      {
        "id": 101,
        "name": "Finish dashboard redesign",
        "priority": "high",
        "status": "done",
        "createdAt": "2026-10-28T10:00:00Z"
      },
      {
        "id": 102,
        "name": "Review MCP server code",
        "priority": "high",
        "status": "in-progress",
        "createdAt": "2026-10-29T11:00:00Z"
      },
      {
        "id": 103,
        "name": "Deploy to Railway",
        "priority": "medium",
        "status": "pending",
        "createdAt": "2026-10-30T09:00:00Z"
      }
    ],
    "goals": [
      {
        "id": 201,
        "name": "Build MCP dashboard",
        "progress": 85,
        "targetDate": "2026-11-15"
      }
    ]
  }'
) ON CONFLICT (user_id) DO NOTHING;
