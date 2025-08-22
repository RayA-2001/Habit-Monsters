import React, { useEffect, useMemo, useState } from "react";

// ------------------------------
// HabitMon MVP – single-file demo
// ------------------------------
// Goals:
// - Local-first (uses localStorage)
// - Add/Edit/Delete habits
// - Daily check-off with streaks
// - Creature evolution by completions
// - Cute, simple UI with Tailwind
//
// Notes:
// - No external UI libs used. Drop into any React app.
// - Dates are tracked in local time by ISO date string (YYYY-MM-DD).
// - Evolution thresholds are simple and easy to tweak below.

// ------------------------------
// Types
// ------------------------------
/**
 * HabitCategory drives creature "type" and emoji set.
 */
const CATEGORIES = [
  "Health",
  "Productivity",
  "Creativity",
  "Personal",
] as const;
export type HabitCategory = (typeof CATEGORIES)[number];

export type Habit = {
  id: string;
  name: string;
  category: HabitCategory;
  createdAt: string; // ISO timestamp
  completions: string[]; // list of ISO dates (YYYY-MM-DD) when completed
};

// ------------------------------
// Utilities
// ------------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateAdd = (isoDate: string, days: number) => {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

// Compute the current streak ending today (or yesterday if today not completed)
function computeStreak(completions: string[]): number {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let streak = 0;
  let cursor = set.has(todayISO()) ? todayISO() : dateAdd(todayISO(), -1);
  while (set.has(cursor)) {
    streak += 1;
    cursor = dateAdd(cursor, -1);
  }
  return streak;
}

// Total completions used for evolution thresholds
function totalCompletions(completions: string[]): number {
  return completions.length;
}

// ------------------------------
// Creature Logic
// ------------------------------
/** Emoji sets per category across 3 stages: Egg -> Baby -> Final */
const CREATURES: Record<HabitCategory, [string, string, string]> = {
  Health: ["🥚", "🐣", "🦋"], // nature vibe
  Productivity: ["🥚", "🤖", "🚀"], // tech vibe
  Creativity: ["🥚", "✨", "🌌"], // mystic vibe
  Personal: ["🥚", "🦊", "🦄"], // cozy/misc
} as any;

const THRESHOLDS = {
  baby: 4, // 0–3: egg; 4–10: baby
  final: 11, // 11+: final
};

type EvolutionStage = "Egg" | "Baby" | "Final";

function getStage(completions: number): EvolutionStage {
  if (completions >= THRESHOLDS.final) return "Final";
  if (completions >= THRESHOLDS.baby) return "Baby";
  return "Egg";
}

function creatureEmoji(category: HabitCategory, completions: number): string {
  const stage = getStage(completions);
  const [egg, baby, final] = CREATURES[category];
  return stage === "Egg" ? egg : stage === "Baby" ? baby : final;
}

function stageLabel(completions: number): string {
  const s = getStage(completions);
  return s === "Egg" ? "Egg" : s === "Baby" ? "Hatchling" : "Evolved";
}

// ------------------------------
// Storage
// ------------------------------
const STORAGE_KEY = "habitmon:v01:habits";
const load = (): Habit[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
};
const save = (habits: Habit[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));

// ------------------------------
// Components
// ------------------------------
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl shadow p-4 bg-white/5 border border-white/10 ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

function HabitForm({
  onAdd,
}: {
  onAdd: (data: Pick<Habit, "name" | "category">) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HabitCategory>("Health");

  return (
    <Card className="mb-4">
      <h3 className="text-lg font-semibold mb-3">Add a Habit</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 focus:outline-none"
          placeholder="e.g., Morning Walk"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10"
          value={category}
          onChange={(e) => setCategory(e.target.value as HabitCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-2 rounded-xl bg-white hover:bg-white/80 text-black font-medium"
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ name: name.trim(), category });
            setName("");
          }}
        >
          Add Habit
        </button>
      </div>
    </Card>
  );
}

function HabitItem({
  habit,
  onToggleToday,
  onDelete,
}: {
  habit: Habit;
  onToggleToday: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const completions = habit.completions;
  const total = totalCompletions(completions);
  const streak = computeStreak(completions);
  const emoji = creatureEmoji(habit.category, total);
  const today = todayISO();
  const doneToday = completions.includes(today);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="text-4xl select-none">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-lg truncate">{habit.name}</div>
          <div className="text-xs opacity-70">
            {habit.category} • {stageLabel(total)} • {total} total
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Stat label="Streak" value={streak} />
          <button
            className={`px-3 py-2 rounded-xl font-medium border border-white/10 ${
              doneToday
                ? "bg-green-500/80 text-black"
                : "bg-white/10 hover:bg-white/20"
            }`}
            onClick={() => onToggleToday(habit.id)}
            title={doneToday ? "Completed today" : "Mark complete"}
          >
            {doneToday ? "Done" : "Do today"}
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-red-500/80 text-black font-medium"
            onClick={() => onDelete(habit.id)}
            title="Delete habit"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filter, setFilter] = useState<"All" | HabitCategory>("All");

  useEffect(() => {
    setHabits(load());
  }, []);

  useEffect(() => {
    save(habits);
  }, [habits]);

  const filtered = useMemo(
    () =>
      filter === "All" ? habits : habits.filter((h) => h.category === filter),
    [habits, filter]
  );

  const addHabit = (data: Pick<Habit, "name" | "category">) => {
    const newHabit: Habit = {
      id: Math.random().toString(36).substring(2, 9),,
      name: data.name,
      category: data.category,
      createdAt: new Date().toISOString(),
      completions: [],
    };
    setHabits((prev) => [newHabit, ...prev]);
  };

  const toggleToday = (id: string) => {
    const iso = todayISO();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const done = h.completions.includes(iso);
        return {
          ...h,
          completions: done
            ? h.completions.filter((d) => d !== iso)
            : uniq([...h.completions, iso]).sort(),
        };
      })
    );
  };

  const deleteHabit = (id: string) =>
    setHabits((prev) => prev.filter((h) => h.id !== id));

  // Quick stats
  const totalChecks = habits.reduce((acc, h) => acc + h.completions.length, 0);
  const activeStreaks = habits.reduce(
    (acc, h) => acc + (computeStreak(h.completions) > 0 ? 1 : 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-indigo-900 to-fuchsia-900 text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              HabitMon{" "}
              <span className="opacity-70 text-base font-medium">v0.1</span>
            </h1>
            <p className="opacity-80 text-sm">
              Raise cute creatures by doing your real-life habits. Stay cozy,
              not crunchy.
            </p>
          </div>
          <div className="flex gap-4">
            <Stat label="Total checks" value={totalChecks} />
            <Stat label="Active streaks" value={activeStreaks} />
          </div>
        </header>

        <HabitForm onAdd={addHabit} />

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Your Habits</div>
            <select
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="All">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="opacity-70 text-sm">
                No habits yet. Add one above — your egg awaits. 🥚
              </div>
            ) : (
              filtered.map((h) => (
                <HabitItem
                  key={h.id}
                  habit={h}
                  onToggleToday={toggleToday}
                  onDelete={deleteHabit}
                />
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="text-sm opacity-80 leading-relaxed">
            <div className="font-semibold mb-1">How it works</div>
            Complete a habit to earn a check for today. Your creature evolves by
            total completions:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>0–3: Egg 🥚</li>
              <li>4–10: Hatchling 🐣 / ✨ / 🤖 / 🦊</li>
              <li>11+: Evolved 🦋 / 🌌 / 🚀 / 🦄</li>
            </ul>
            Streaks show how many consecutive days you’ve kept it up. Missing a
            day won’t punish your creature — it just won’t grow that day.
          </div>
        </Card>

        <footer className="opacity-70 text-xs text-center">
          Built as a system-first MVP. Swap emoji for art later, adjust
          thresholds, and add animations when ready.
        </footer>
      </div>
    </div>
  );
}
