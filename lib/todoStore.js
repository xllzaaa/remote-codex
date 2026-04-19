const PRIORITY_ORDER = ["高", "中", "低"];

const initialTodos = [
  {
    id: 1,
    text: "给《深度工作》做一次 20 分钟章节复盘",
    done: false,
    priority: "高",
    bookId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    text: "整理本周 3 条可执行摘录",
    done: false,
    priority: "中",
    bookId: null,
    createdAt: new Date().toISOString(),
  },
];

if (!globalThis.__todoStore) {
  globalThis.__todoStore = {
    todos: [...initialTodos],
    nextId: initialTodos.length + 1,
  };
}

const store = globalThis.__todoStore;

function normalizePriority(value) {
  return PRIORITY_ORDER.includes(value) ? value : "中";
}

function normalizeBookId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sortTodos(items) {
  return items
    .slice()
    .sort((a, b) => {
      if (a.done !== b.done) {
        return Number(a.done) - Number(b.done);
      }

      const priorityGap = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      if (priorityGap !== 0) {
        return priorityGap;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function listTodos() {
  return sortTodos(store.todos);
}

export function getTodo(id) {
  return store.todos.find((todo) => todo.id === id) || null;
}

export function createTodo(input) {
  const todo = {
    id: store.nextId++,
    text: String(input.text || "").trim(),
    done: false,
    priority: normalizePriority(String(input.priority || "中")),
    bookId: normalizeBookId(input.bookId),
    createdAt: new Date().toISOString(),
  };

  store.todos.push(todo);
  return todo;
}

export function updateTodo(id, patch) {
  const todo = getTodo(id);
  if (!todo) {
    return null;
  }

  if (typeof patch.text === "string") {
    todo.text = patch.text;
  }

  if (typeof patch.done === "boolean") {
    todo.done = patch.done;
  }

  if (typeof patch.priority === "string") {
    todo.priority = normalizePriority(patch.priority);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "bookId")) {
    todo.bookId = normalizeBookId(patch.bookId);
  }

  return todo;
}

export function deleteTodo(id) {
  const index = store.todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return false;
  }

  store.todos.splice(index, 1);
  return true;
}
