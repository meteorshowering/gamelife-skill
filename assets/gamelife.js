(() => {
  "use strict";

  const STORAGE_KEY = "gamelife-skill:state:v1";
  const TODAY = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const TYPE_LABELS = {
    study: "学习",
    work: "工作",
    health: "健康",
    creative: "创作",
    life: "生活",
    review: "复盘",
    other: "其他",
  };
  const PRIORITY_LABELS = {
    low: "低优先级",
    medium: "普通优先级",
    high: "高优先级",
    urgent: "紧急任务",
  };
  const STATUS_LABELS = {
    todo: "待开始",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
    archived: "已归档",
  };
  const PRIORITY_SCORE = { urgent: 40, high: 30, medium: 20, low: 10 };

  const DEFAULT_STATE = {
    schema_version: "1.0",
    version: "0.0.2",
    updated_at: "2026-08-27T00:00:00.000Z",
    profile: { nickname: "旅行者" },
    chapters: [
      {
        id: "chapter-main-study",
        title: "大学学业",
        description: "把课程、复习和知识积累推进成一条稳定的主线。",
        type: "main",
        status: "active",
        progress: 35,
        order: 1,
      },
      {
        id: "chapter-side-creative",
        title: "AI 创作",
        description: "记录创意、实验和作品产出的支线旅程。",
        type: "side",
        status: "active",
        progress: 20,
        order: 2,
      },
      {
        id: "chapter-side-health",
        title: "体能训练",
        description: "用小步行动保持身体状态和生活节奏。",
        type: "side",
        status: "active",
        progress: 100,
        order: 3,
      },
    ],
    tasks: [
      {
        id: "task-course-review",
        chapter_id: "chapter-main-study",
        title: "完成本周课程复盘",
        description: "整理课堂笔记，并写下三个还没有掌握的知识点。",
        type: "study",
        status: "in_progress",
        priority: "high",
        progress: 35,
        due_date: "",
        subtasks: [],
        ai_generated: false,
        ai_reason: "",
        created_at: "2026-08-27T00:00:00.000Z",
        updated_at: "2026-08-27T00:00:00.000Z",
        completed_at: "",
      },
      {
        id: "task-library",
        chapter_id: "chapter-main-study",
        title: "图书馆深度研习",
        description: "完成第三章习题集，记录一道最有挑战的题目。",
        type: "study",
        status: "todo",
        priority: "medium",
        progress: 0,
        due_date: "",
        subtasks: [],
        ai_generated: false,
        ai_reason: "",
        created_at: "2026-08-27T00:00:00.000Z",
        updated_at: "2026-08-27T00:00:00.000Z",
        completed_at: "",
      },
      {
        id: "task-ai-materials",
        chapter_id: "chapter-side-creative",
        title: "整理 AI 创作素材库",
        description: "清理旧素材，并为下一次创作保留可复用的提示词。",
        type: "creative",
        status: "in_progress",
        priority: "medium",
        progress: 65,
        due_date: "",
        subtasks: [],
        ai_generated: false,
        ai_reason: "",
        created_at: "2026-08-27T00:00:00.000Z",
        updated_at: "2026-08-27T00:00:00.000Z",
        completed_at: "",
      },
      {
        id: "task-experiment",
        chapter_id: "chapter-side-creative",
        title: "完成一个小型实验",
        description: "用一个小时验证一个创作想法，不追求一次做到完美。",
        type: "creative",
        status: "todo",
        priority: "low",
        progress: 0,
        due_date: "",
        subtasks: [],
        ai_generated: false,
        ai_reason: "",
        created_at: "2026-08-27T00:00:00.000Z",
        updated_at: "2026-08-27T00:00:00.000Z",
        completed_at: "",
      },
      {
        id: "task-training",
        chapter_id: "chapter-side-health",
        title: "晨间体能强化",
        description: "完成 30 分钟核心训练或一次轻量散步。",
        type: "health",
        status: "completed",
        priority: "medium",
        progress: 100,
        due_date: "",
        subtasks: [],
        ai_generated: false,
        ai_reason: "",
        created_at: "2026-08-27T00:00:00.000Z",
        updated_at: "2026-08-27T00:00:00.000Z",
        completed_at: "2026-08-27T00:00:00.000Z",
      },
    ],
    daily_recommendations: {},
    sources: [],
    settings: { daily_recommendation_count: 4 },
  };

  let state = null;
  let filters = { chapter: "all", status: "all", keyword: "" };
  let draftSubtasks = [];
  let expandedTasks = new Set();
  let toastTimer = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeState(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const chapters = Array.isArray(source.chapters) ? source.chapters : clone(DEFAULT_STATE.chapters);
    const tasks = Array.isArray(source.tasks) ? source.tasks : clone(DEFAULT_STATE.tasks);
    return {
      schema_version: String(source.schema_version || "1.0"),
      version: String(source.version || "0.0.2"),
      updated_at: String(source.updated_at || nowIso()),
      profile: source.profile && typeof source.profile === "object" ? source.profile : { nickname: "旅行者" },
      chapters,
      tasks: tasks.map((task) => ({
        ...task,
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
        progress: Number.isFinite(Number(task.progress)) ? Math.max(0, Math.min(100, Number(task.progress))) : 0,
      })),
      daily_recommendations:
        source.daily_recommendations && typeof source.daily_recommendations === "object"
          ? source.daily_recommendations
          : {},
      sources: Array.isArray(source.sources) ? source.sources : [],
      settings: source.settings && typeof source.settings === "object" ? source.settings : { daily_recommendation_count: 4 },
    };
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return clone(DEFAULT_STATE);
      return normalizeState(JSON.parse(stored));
    } catch (error) {
      setSaveStatus("状态读取失败，当前使用示例数据");
      return clone(DEFAULT_STATE);
    }
  }

  function saveState(message = "本地状态已保存") {
    state.updated_at = nowIso();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus(message);
    } catch (error) {
      setSaveStatus("浏览器未能保存状态");
      showToast("保存失败，请检查浏览器本地存储权限");
    }
  }

  function setSaveStatus(message) {
    const element = document.querySelector("#save-status");
    if (element) element.textContent = message;
  }

  function showToast(message) {
    const element = document.querySelector("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove("show"), 2400);
  }

  function getChapter(chapterId) {
    return state.chapters.find((chapter) => chapter.id === chapterId) || null;
  }

  function updateChapterProgress() {
    state.chapters = state.chapters.map((chapter) => {
      const chapterTasks = state.tasks.filter((task) => task.chapter_id === chapter.id);
      const completed = chapterTasks.filter((task) => task.status === "completed").length;
      const progress = chapterTasks.length ? Math.round((completed / chapterTasks.length) * 100) : 0;
      return {
        ...chapter,
        progress,
        status: progress === 100 && chapterTasks.length ? "completed" : "active",
      };
    });
  }

  function dueScore(task, dayKey) {
    if (!task.due_date) return { score: 0, reason: "" };
    const due = new Date(`${task.due_date.slice(0, 10)}T00:00:00`);
    const today = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(due.getTime())) return { score: 0, reason: "" };
    const delta = Math.ceil((due - today) / 86400000);
    if (delta <= 0) return { score: 34, reason: "截止日期临近或已经到期" };
    if (delta <= 2) return { score: 27, reason: "截止日期很近" };
    if (delta <= 7) return { score: 16, reason: "本周需要推进" };
    return { score: 5, reason: "有明确的后续截止日期" };
  }

  function scoreTask(task, dayKey) {
    const chapter = getChapter(task.chapter_id);
    const due = dueScore(task, dayKey);
    let score = PRIORITY_SCORE[task.priority] || 0;
    const reasons = [];
    if (["urgent", "high"].includes(task.priority)) reasons.push("优先级较高");
    if (due.reason) reasons.push(due.reason);
    score += due.score;
    if (task.status === "in_progress") {
      score += 12;
      reasons.push("已经开始，适合保持推进");
    } else if (task.progress > 0) {
      score += 6;
      reasons.push("已有部分进度");
    }
    if (chapter?.type === "main") {
      score += 6;
      reasons.push("属于主线冒险");
    }
    if (!reasons.length) reasons.push("从未完成任务中选择一个适合今天开始的行动");
    return { score, reason: reasons.join("；") };
  }

  function ensureTodayRecommendations(force = false) {
    const dayKey = TODAY();
    const existing = state.daily_recommendations[dayKey];
    if (existing && Array.isArray(existing.items) && existing.items.length === 4 && !force) return existing;

    const candidates = state.tasks
      .filter((task) => ["todo", "in_progress"].includes(task.status))
      .sort((a, b) => {
        const aScore = scoreTask(a, dayKey).score;
        const bScore = scoreTask(b, dayKey).score;
        return bScore - aScore || String(b.updated_at).localeCompare(String(a.updated_at)) || a.id.localeCompare(b.id);
      });

    const items = Array.from({ length: 4 }, (_, index) => {
      const rank = index + 1;
      const task = candidates[index];
      if (!task) {
        return {
          id: `recommendation-${dayKey}-${rank}`,
          task_id: null,
          rank,
          title_snapshot: "待补充",
          reason: "当前可选任务不足四项；需要确认后再创建新行动",
          status: "placeholder",
        };
      }
      return {
        id: `recommendation-${dayKey}-${rank}`,
        task_id: task.id,
        rank,
        title_snapshot: task.title,
        reason: scoreTask(task, dayKey).reason,
        status: "suggested",
      };
    });
    const record = { date: dayKey, generated_at: nowIso(), items };
    state.daily_recommendations[dayKey] = record;
    return record;
  }

  function formatToday(dayKey) {
    const date = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dayKey;
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function renderSummary() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.status === "completed").length;
    const active = total - completed;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    document.querySelector("#total-count").textContent = total;
    document.querySelector("#completed-count").textContent = completed;
    document.querySelector("#active-count").textContent = active;
    document.querySelector("#overall-progress").textContent = `${progress}%`;
    document.querySelector("#overall-progress-fill").style.width = `${progress}%`;
    document.querySelector("#profile-caption").textContent = `${state.profile.nickname || "旅行者"} · ${state.chapters.length} 条冒险线`;
  }

  function recommendationStatus(item, task) {
    if (!task) return "待补充";
    if (task.status === "completed" || item.status === "completed") return "已完成";
    if (item.status === "skipped") return "已跳过";
    return "今日聚焦";
  }

  function renderRecommendations() {
    const dayKey = TODAY();
    const record = ensureTodayRecommendations();
    document.querySelector("#today-date").textContent = formatToday(dayKey);
    document.querySelector("#today-caption").textContent = `已为今天安排 ${record.items.length} 个推荐位，重复打开不会重复追加。`;
    const list = document.querySelector("#recommendation-list");
    list.innerHTML = record.items
      .map((item) => {
        const task = item.task_id ? state.tasks.find((candidate) => candidate.id === item.task_id) : null;
        const title = task?.title || item.title_snapshot || "待补充";
        const isPlaceholder = !task;
        const completed = task?.status === "completed";
        return `
          <article class="recommendation-card ${isPlaceholder ? "placeholder" : ""} ${completed ? "completed" : ""}">
            <div class="recommendation-head">
              <span class="recommendation-rank">${item.rank}</span>
              <span class="recommendation-status">${escapeHtml(recommendationStatus(item, task))}</span>
            </div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(item.reason || "今天给自己一个清晰的开始。")}</p>
            <div class="recommendation-actions">
              ${task ? `<button class="mini-action" type="button" data-action="view-task" data-task-id="${escapeHtml(task.id)}">查看任务</button>` : ""}
              ${task && !completed ? `<button class="mini-action" type="button" data-action="toggle-task" data-task-id="${escapeHtml(task.id)}">完成</button>` : ""}
            </div>
          </article>`;
      })
      .join("");
  }

  function taskMatches(task) {
    const chapter = getChapter(task.chapter_id);
    const keyword = filters.keyword.trim().toLowerCase();
    const chapterMatch = filters.chapter === "all" || chapter?.type === filters.chapter;
    const statusMatch =
      filters.status === "all" ||
      (filters.status === "completed" && task.status === "completed") ||
      (filters.status === "active" && task.status !== "completed");
    const keywordMatch =
      !keyword ||
      String(task.title).toLowerCase().includes(keyword) ||
      String(task.description).toLowerCase().includes(keyword);
    return chapterMatch && statusMatch && keywordMatch;
  }

  function renderTasks() {
    const list = document.querySelector("#task-list");
    const tasks = state.tasks.filter(taskMatches);
    document.querySelector("#task-empty").hidden = tasks.length > 0;
    list.hidden = tasks.length === 0;
    list.innerHTML = tasks
      .map((task) => {
        const chapter = getChapter(task.chapter_id);
        const completed = task.status === "completed";
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const expanded = expandedTasks.has(task.id);
        const subtaskCount = subtasks.length;
        return `
          <article class="task-card ${completed ? "is-completed" : ""}" data-task-card="${escapeHtml(task.id)}">
            <div class="task-card-main">
              <div class="task-card-head">
                <button class="check-button ${completed ? "checked" : ""}" type="button" aria-label="${completed ? "重新开启任务" : "完成任务"}" data-action="toggle-task" data-task-id="${escapeHtml(task.id)}">${completed ? "✓" : ""}</button>
                <div class="task-copy">
                  <div class="task-meta">
                    <span>${escapeHtml(TYPE_LABELS[task.type] || TYPE_LABELS.other)}</span>
                    <span class="dot">·</span>
                    <span class="${["high", "urgent"].includes(task.priority) ? "priority-" + task.priority : ""}">${escapeHtml(PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium)}</span>
                  </div>
                  <h3 class="task-title">${escapeHtml(task.title)}</h3>
                  <p class="task-description">${escapeHtml(task.description || "还没有写下任务说明，点击编辑补充。")}</p>
                </div>
                <div class="task-menu">
                  <button type="button" aria-label="编辑任务" data-action="edit-task" data-task-id="${escapeHtml(task.id)}">⋯</button>
                  <button class="delete-task" type="button" aria-label="删除任务" data-action="delete-task" data-task-id="${escapeHtml(task.id)}">×</button>
                </div>
              </div>
              <div class="task-progress-row">
                <div class="task-progress-track"><span style="width: ${Math.max(0, Math.min(100, Number(task.progress) || 0))}%"></span></div>
                <span class="task-progress-value">${Math.round(Number(task.progress) || 0)}%</span>
              </div>
              <div class="task-card-foot">
                <span class="chapter-chip">${escapeHtml(chapter?.title || "未分类")}</span>
                <div class="task-foot-right">
                  ${subtaskCount ? `<button class="subtask-toggle" type="button" data-action="toggle-subtasks" data-task-id="${escapeHtml(task.id)}">${expanded ? "收起" : "查看"} ${subtaskCount} 个子任务</button>` : ""}
                  <span class="task-status ${completed ? "done" : ""}">${escapeHtml(STATUS_LABELS[task.status] || STATUS_LABELS.todo)}</span>
                </div>
              </div>
            </div>
            ${expanded && subtaskCount ? `<div class="subtasks">${subtasks.map((subtask) => `
              <label class="subtask-item ${subtask.status === "completed" ? "completed" : ""}">
                <input class="subtask-check" type="checkbox" ${subtask.status === "completed" ? "checked" : ""} data-action="toggle-subtask" data-task-id="${escapeHtml(task.id)}" data-subtask-id="${escapeHtml(subtask.id)}" />
                <span><strong>${escapeHtml(subtask.title)}</strong><small>${escapeHtml(subtask.description || "待完成")} ${subtask.estimated_minutes ? `· ${subtask.estimated_minutes} min` : ""}</small></span>
              </label>`).join("")}</div>` : ""}
          </article>`;
      })
      .join("");
  }

  function render() {
    updateChapterProgress();
    renderSummary();
    renderRecommendations();
    renderTasks();
    const search = document.querySelector("#task-search");
    const clear = document.querySelector("#clear-search");
    if (search && search.value !== filters.keyword) search.value = filters.keyword;
    if (clear) clear.hidden = !filters.keyword;
  }

  function populateChapterOptions(selectedId = "") {
    const select = document.querySelector("#task-chapter");
    select.innerHTML = state.chapters
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((chapter) => `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}（${chapter.type === "main" ? "主线" : "支线"}）</option>`)
      .join("");
    if (selectedId && state.chapters.some((chapter) => chapter.id === selectedId)) select.value = selectedId;
  }

  function openTaskModal(task = null) {
    const modal = document.querySelector("#task-modal");
    const form = document.querySelector("#task-form");
    form.reset();
    document.querySelector("#editing-task-id").value = task?.id || "";
    document.querySelector("#modal-title").textContent = task ? "编辑任务" : "创建新任务";
    populateChapterOptions(task?.chapter_id || state.chapters.find((chapter) => chapter.type === "main")?.id || state.chapters[0]?.id || "");
    document.querySelector("#task-title").value = task?.title || "";
    document.querySelector("#task-description").value = task?.description || "";
    document.querySelector("#task-type").value = task?.type || "study";
    document.querySelector("#task-priority").value = task?.priority || "medium";
    document.querySelector("#task-due-date").value = task?.due_date || "";
    document.querySelector("#task-progress").value = task?.progress || 0;
    document.querySelector("#task-progress-output").value = `${task?.progress || 0}%`;
    draftSubtasks = task ? clone(task.subtasks || []) : [];
    renderDraftSubtasks();
    modal.hidden = false;
    window.setTimeout(() => document.querySelector("#task-title").focus(), 0);
  }

  function closeTaskModal() {
    document.querySelector("#task-modal").hidden = true;
    draftSubtasks = [];
  }

  function inferSubtasks(title, description, type) {
    const text = `${title} ${description}`;
    let steps;
    if (/(复习|学习|课程|考试|论文)/.test(text) || type === "study") {
      steps = [
        ["整理材料并明确完成标准", "收集需要用到的笔记、资料或题目，写下本次行动的完成标准。", 20],
        ["完成核心学习或练习", "集中处理最关键的一小段内容，不把所有后续工作混在一起。", 40],
        ["检查结果并记录薄弱点", "快速检查输出，记录还不清楚的地方和下一步行动。", 15],
      ];
    } else if (/(开发|项目|网站|代码|功能)/.test(text) || type === "work") {
      steps = [
        ["确认需求和验收标准", "把要解决的问题、边界和完成条件写清楚。", 20],
        ["实现最小可用部分", "先完成能够验证方向的核心实现，不同时扩展无关功能。", 45],
        ["验证并记录待办", "运行检查或手动验证，把问题和下一步记录下来。", 20],
      ];
    } else if (/(写|文章|报告|内容|创作)/.test(text) || type === "creative") {
      steps = [
        ["确定主题和结构", "明确受众、核心观点和内容结构。", 20],
        ["完成第一版草稿", "先形成完整草稿，不在第一遍追求最终表达。", 45],
        ["检查并整理输出", "检查逻辑、格式和遗漏，形成下一步修改清单。", 20],
      ];
    } else if (/(运动|锻炼|健康|散步)/.test(text) || type === "health") {
      steps = [
        ["准备行动环境", "准备所需物品并确定可执行的时间和地点。", 10],
        ["完成主要行动", "按当前状态完成一段适度、可持续的训练或活动。", 30],
        ["记录感受和结果", "记录完成情况与身体感受，决定是否需要调整下一次计划。", 10],
      ];
    } else {
      steps = [
        ["明确完成标准", "写下这项任务做到什么程度可以算完成。", 15],
        ["完成核心行动", "处理最直接、最能推动任务前进的一步。", 30],
        ["检查结果并安排下一步", "确认结果，记录剩余问题或后续行动。", 15],
      ];
    }
    return steps.map(([stepTitle, stepDescription, minutes], index) => ({
      id: createId(`subtask-draft-${index + 1}`),
      task_id: "",
      title: stepTitle,
      description: stepDescription,
      status: "todo",
      order: index + 1,
      estimated_minutes: minutes,
      needs_confirmation: true,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: "",
    }));
  }

  function renderDraftSubtasks() {
    const panel = document.querySelector("#decomposition-panel");
    const list = document.querySelector("#decomposition-list");
    if (!draftSubtasks.length) {
      panel.hidden = true;
      list.innerHTML = "";
      return;
    }
    panel.hidden = false;
    list.innerHTML = draftSubtasks
      .map((subtask, index) => `
        <div class="draft-subtask" data-draft-index="${index}">
          <input type="text" value="${escapeHtml(subtask.title)}" aria-label="子任务标题" data-draft-field="title" />
          <input type="number" min="0" step="5" value="${Number(subtask.estimated_minutes) || 0}" aria-label="预计分钟数" data-draft-field="minutes" />
          <button type="button" aria-label="移除步骤" data-action="remove-draft" data-draft-index="${index}">×</button>
        </div>`)
      .join("");
  }

  function syncDraftFromDom() {
    document.querySelectorAll(".draft-subtask").forEach((row) => {
      const index = Number(row.dataset.draftIndex);
      if (!draftSubtasks[index]) return;
      const title = row.querySelector('[data-draft-field="title"]');
      const minutes = row.querySelector('[data-draft-field="minutes"]');
      draftSubtasks[index].title = title.value.trim();
      draftSubtasks[index].estimated_minutes = Math.max(0, Number(minutes.value) || 0);
    });
    draftSubtasks = draftSubtasks.filter((subtask) => subtask.title);
    draftSubtasks.forEach((subtask, index) => { subtask.order = index + 1; });
  }

  function saveTaskFromForm(event) {
    event.preventDefault();
    syncDraftFromDom();
    const taskId = document.querySelector("#editing-task-id").value;
    const title = document.querySelector("#task-title").value.trim();
    if (!title) {
      showToast("请先填写任务名称");
      return;
    }
    const taskData = {
      title,
      description: document.querySelector("#task-description").value.trim(),
      chapter_id: document.querySelector("#task-chapter").value,
      type: document.querySelector("#task-type").value,
      priority: document.querySelector("#task-priority").value,
      due_date: document.querySelector("#task-due-date").value,
      progress: Math.max(0, Math.min(100, Number(document.querySelector("#task-progress").value) || 0)),
    };
    const timestamp = nowIso();
    if (taskId) {
      const task = state.tasks.find((candidate) => candidate.id === taskId);
      if (!task) return;
      Object.assign(task, taskData, {
        updated_at: timestamp,
        status: taskData.progress >= 100 ? "completed" : taskData.progress > 0 ? "in_progress" : task.status === "completed" ? "todo" : task.status,
        completed_at: taskData.progress >= 100 ? task.completed_at || timestamp : "",
      });
      if (draftSubtasks.length) task.subtasks = draftSubtasks.map((subtask, index) => ({ ...subtask, task_id: task.id, order: index + 1, needs_confirmation: false, updated_at: timestamp }));
      showToast("任务已更新");
    } else {
      const task = {
        id: createId("task"),
        ...taskData,
        status: taskData.progress >= 100 ? "completed" : taskData.progress > 0 ? "in_progress" : "todo",
        subtasks: draftSubtasks.map((subtask, index) => ({ ...subtask, id: createId("subtask"), task_id: "", order: index + 1, needs_confirmation: false, updated_at: timestamp })),
        ai_generated: false,
        ai_reason: draftSubtasks.length ? "用户在 HTML 中确认的本地拆解" : "",
        created_at: timestamp,
        updated_at: timestamp,
        completed_at: taskData.progress >= 100 ? timestamp : "",
      };
      task.subtasks.forEach((subtask) => { subtask.task_id = task.id; });
      state.tasks.unshift(task);
      showToast(draftSubtasks.length ? "任务和子任务已保存" : "任务已加入冒险手册");
    }
    updateChapterProgress();
    saveState();
    closeTaskModal();
    render();
  }

  function toggleTask(taskId) {
    const task = state.tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    const completed = task.status === "completed";
    task.status = completed ? "todo" : "completed";
    task.progress = completed ? 0 : 100;
    task.completed_at = completed ? "" : nowIso();
    task.updated_at = nowIso();
    const record = state.daily_recommendations[TODAY()];
    const item = record?.items?.find((candidate) => candidate.task_id === task.id);
    if (item) item.status = completed ? "suggested" : "completed";
    updateChapterProgress();
    saveState(completed ? "任务已重新开启" : "任务完成，继续前进！");
    render();
  }

  function toggleSubtask(taskId, subtaskId, checked) {
    const task = state.tasks.find((candidate) => candidate.id === taskId);
    const subtask = task?.subtasks?.find((candidate) => candidate.id === subtaskId);
    if (!task || !subtask) return;
    subtask.status = checked ? "completed" : "todo";
    subtask.completed_at = checked ? nowIso() : "";
    subtask.updated_at = nowIso();
    const total = task.subtasks.length;
    const completed = task.subtasks.filter((candidate) => candidate.status === "completed").length;
    task.progress = total ? Math.round((completed / total) * 100) : task.progress;
    task.status = task.progress >= 100 ? "completed" : task.progress > 0 ? "in_progress" : "todo";
    task.completed_at = task.status === "completed" ? task.completed_at || nowIso() : "";
    task.updated_at = nowIso();
    updateChapterProgress();
    saveState("子任务状态已更新");
    render();
  }

  function deleteTask(taskId) {
    const task = state.tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    if (!window.confirm(`确定删除“${task.title}”吗？此操作会移除它的子任务。`)) return;
    state.tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
    Object.values(state.daily_recommendations).forEach((record) => {
      record.items = record.items.map((item) => item.task_id === taskId ? { ...item, task_id: null, title_snapshot: "待补充", status: "placeholder", reason: "原任务已删除，需要重新安排" } : item);
    });
    updateChapterProgress();
    saveState("任务已删除");
    render();
  }

  function viewTask(taskId) {
    const element = Array.from(document.querySelectorAll("[data-task-card]")).find((card) => card.dataset.taskCard === taskId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.animate([
      { boxShadow: "0 0 0 4px rgba(29, 140, 135, .28)" },
      { boxShadow: "0 16px 36px rgba(22, 61, 76, .08)" },
    ], { duration: 850 });
  }

  function refreshRecommendations() {
    const current = state.daily_recommendations[TODAY()];
    if (current && !window.confirm("要重新安排今天的四项行动吗？当前推荐顺序会被替换。")) return;
    ensureTodayRecommendations(true);
    saveState("今天的四项行动已重新安排");
    render();
  }

  function resetDemo() {
    if (!window.confirm("恢复示例数据会覆盖当前浏览器中的本地任务，确定继续吗？")) return;
    state = clone(DEFAULT_STATE);
    ensureTodayRecommendations();
    saveState("已恢复示例数据");
    render();
    showToast("示例数据已恢复");
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action], [data-scroll-target], [data-chapter-filter], [data-status-filter]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "toggle-task") toggleTask(target.dataset.taskId);
    if (action === "view-task") viewTask(target.dataset.taskId);
    if (action === "edit-task") openTaskModal(state.tasks.find((task) => task.id === target.dataset.taskId));
    if (action === "delete-task") deleteTask(target.dataset.taskId);
    if (action === "toggle-subtasks") {
      if (expandedTasks.has(target.dataset.taskId)) expandedTasks.delete(target.dataset.taskId);
      else expandedTasks.add(target.dataset.taskId);
      renderTasks();
    }
    if (action === "remove-draft") {
      syncDraftFromDom();
      draftSubtasks.splice(Number(target.dataset.draftIndex), 1);
      renderDraftSubtasks();
    }
    if (target.dataset.scrollTarget) {
      document.querySelector(`#${target.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth" });
      document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button === target));
    }
    if (target.dataset.chapterFilter) {
      filters.chapter = target.dataset.chapterFilter;
      document.querySelectorAll("[data-chapter-filter]").forEach((button) => button.classList.toggle("active", button === target));
      renderTasks();
    }
    if (target.dataset.statusFilter) {
      filters.status = target.dataset.statusFilter;
      document.querySelectorAll("[data-status-filter]").forEach((button) => button.classList.toggle("active", button === target));
      renderTasks();
    }
  }

  function handleChange(event) {
    const input = event.target;
    if (input.matches('[data-action="toggle-subtask"]')) {
      toggleSubtask(input.dataset.taskId, input.dataset.subtaskId, input.checked);
    }
  }

  function init() {
    state = loadState();
    ensureTodayRecommendations();
    saveState();
    render();

    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.querySelector("#task-form").addEventListener("submit", saveTaskFromForm);
    document.querySelector("#open-create-task").addEventListener("click", () => openTaskModal());
    document.querySelector("#open-empty-create").addEventListener("click", () => openTaskModal());
    document.querySelector("#open-mobile-create").addEventListener("click", () => openTaskModal());
    document.querySelector("#close-task-modal").addEventListener("click", closeTaskModal);
    document.querySelector("#cancel-task-modal").addEventListener("click", closeTaskModal);
    document.querySelector("#refresh-recommendations").addEventListener("click", refreshRecommendations);
    document.querySelector("#reset-demo").addEventListener("click", resetDemo);
    document.querySelector("#decompose-task").addEventListener("click", () => {
      const title = document.querySelector("#task-title").value.trim();
      const description = document.querySelector("#task-description").value.trim();
      const type = document.querySelector("#task-type").value;
      if (!title) {
        showToast("先写下任务名称，再生成拆解预览");
        document.querySelector("#task-title").focus();
        return;
      }
      draftSubtasks = inferSubtasks(title, description, type);
      renderDraftSubtasks();
      showToast("已生成拆解草稿，请检查后保存");
    });
    document.querySelector("#add-subtask").addEventListener("click", () => {
      syncDraftFromDom();
      draftSubtasks.push({
        id: createId("subtask-draft"),
        task_id: "",
        title: "",
        description: "用户补充的步骤",
        status: "todo",
        order: draftSubtasks.length + 1,
        estimated_minutes: 15,
        needs_confirmation: true,
        created_at: nowIso(),
        updated_at: nowIso(),
        completed_at: "",
      });
      renderDraftSubtasks();
    });
    document.querySelector("#task-progress").addEventListener("input", (event) => {
      document.querySelector("#task-progress-output").value = `${event.target.value}%`;
    });
    document.querySelector("#task-search").addEventListener("input", (event) => {
      filters.keyword = event.target.value;
      document.querySelector("#clear-search").hidden = !filters.keyword;
      renderTasks();
    });
    document.querySelector("#clear-search").addEventListener("click", () => {
      filters.keyword = "";
      document.querySelector("#task-search").value = "";
      document.querySelector("#clear-search").hidden = true;
      renderTasks();
    });
    document.querySelector("#task-modal").addEventListener("click", (event) => {
      if (event.target.id === "task-modal") closeTaskModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.querySelector("#task-modal").hidden) closeTaskModal();
    });

    window.GameLife = {
      getState: () => clone(state),
      recommendToday: () => {
        const record = ensureTodayRecommendations();
        saveState();
        render();
        return clone(record);
      },
      resetDemo,
    };
  }

  window.addEventListener("DOMContentLoaded", init);
})();
