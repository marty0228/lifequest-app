const KEY = "lifequest.tasks";

export function loadTasks<T>(): T[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTasks<T>(tasks: T[]) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}