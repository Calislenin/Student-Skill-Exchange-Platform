"use strict";

const API_BASE_URL = "/api";
const pages = [...document.querySelectorAll(".page")];
const pageLinks = [...document.querySelectorAll(".page-link")];
const landingMenuButton = document.getElementById("landingMenuButton");
const landingMobileMenu = document.getElementById("landingMobileMenu");
const dashboardMenuButton = document.getElementById("dashboardMenuButton");
const dashboardMobileMenu = document.getElementById("dashboardMobileMenu");
const profileButton = document.getElementById("profileButton");
const profileMenu = document.getElementById("profileMenu");
const toast = document.getElementById("toast");
const skillDialog = document.getElementById("skillDialog");
const skillForm = document.getElementById("skillForm");
const lessonDialog = document.getElementById("lessonDialog");
const lessonForm = document.getElementById("lessonForm");
const noteDialog = document.getElementById("noteDialog");
const noteForm = document.getElementById("noteForm");
const profileDialog = document.getElementById("profileDialog");
const profileForm = document.getElementById("profileForm");
const sessionDialog = document.getElementById("sessionDialog");
const sessionForm = document.getElementById("sessionForm");
const meetingDialog = document.getElementById("meetingDialog");
const meetingForm = document.getElementById("meetingForm");
const notificationPanel = document.getElementById("notificationPanel");

const categoryVisuals = {
  Coding: { tone: "green", icon: "i-code" },
  Design: { tone: "blue", icon: "i-palette" },
  Communication: { tone: "violet", icon: "i-chat" },
  "Study Skills": { tone: "orange", icon: "i-file" },
  Other: { tone: "blue", icon: "i-book" },
};

let activeCategory = "All";
let searchQuery = "";
let skills = [];
let skillsLoadError = "";
let notes = [];
let notesLoadError = "";
let noteSearchQuery = "";
let noteSubject = "";
let sessions = [];
let sessionsLoadError = "";
let skillLessons = [];
let currentLessonSkill = null;
let savedSkills = readStorage("skillExchangeSaved", []);
let currentUser = null;
let toastTimer;
let sessionPollTimer;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The demo still works if browser storage is unavailable.
  }
}

function showPage(pageId) {
  pages.forEach((page) => page.classList.toggle("active-page", page.id === pageId));
  closeMenus();
  window.scrollTo(0, 0);
  if (pageId === "homePage") updateProfile();
}

function closeMenus() {
  landingMobileMenu?.classList.remove("open");
  dashboardMobileMenu?.classList.remove("open");
  profileMenu?.classList.remove("open");
  notificationPanel?.classList.remove("open");
  landingMenuButton?.setAttribute("aria-expanded", "false");
  dashboardMenuButton?.setAttribute("aria-expanded", "false");
  profileButton?.setAttribute("aria-expanded", "false");
  document.getElementById("notificationButton")?.setAttribute("aria-expanded", "false");
}

function toggleMenu(button, menu) {
  const willOpen = !menu.classList.contains("open");
  closeMenus();
  menu.classList.toggle("open", willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function setCurrentUser(user) {
  currentUser = user;
  if (!user && sessionPollTimer) {
    clearInterval(sessionPollTimer);
    sessionPollTimer = undefined;
  }
  updateProfile();
  renderSkills();
  renderNotes();
  renderSessions();
}

function updateProfile() {
  const displayName = currentUser?.fullName || "User";
  document.getElementById("profileName").textContent = displayName.split(" ")[0];
  document.getElementById("profileAvatar").textContent = getInitials(displayName);
  document.getElementById("profileMenuName").textContent = displayName;
  document.getElementById("welcomeName").textContent = displayName.split(" ")[0];
}

function showFormError(element, message) {
  element.textContent = message;
  element.classList.toggle("visible", Boolean(message));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setFormPending(form, isPending) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = isPending;
  submitButton.setAttribute("aria-busy", String(isPending));
}

async function apiRequest(path, options = {}) {
  try {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "The request could not be completed.");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot connect to the backend. Make sure npm run dev is running.");
    }
    throw error;
  }
}

async function loadSkills() {
  const emptyTitle = document.getElementById("emptySkillsTitle");
  const emptyMessage = document.getElementById("emptySkillsMessage");

  try {
    const result = await apiRequest("/skills?limit=100");
    skills = result.skills;
    skillsLoadError = "";
    emptyTitle.textContent = "No skills found";
    emptyMessage.textContent = "Try another word or choose a different category.";
  } catch (error) {
    skills = [];
    skillsLoadError = error.message;
    emptyTitle.textContent = "Could not load skills";
    emptyMessage.textContent = error.message;
  }

  renderSkills();
}

async function loadNotes() {
  try {
    const result = await apiRequest("/notes?limit=100");
    notes = result.notes;
    notesLoadError = "";
  } catch (error) {
    notes = [];
    notesLoadError = error.message;
  }
  updateNoteSubjects();
  renderNotes();
}

async function loadSessions() {
  if (!currentUser) {
    sessions = [];
    sessionsLoadError = "";
    renderSessions();
    return;
  }

  try {
    const result = await apiRequest("/sessions");
    sessions = result.sessions;
    sessionsLoadError = "";
  } catch (error) {
    sessions = [];
    sessionsLoadError = error.message;
  }
  renderSessions();
}

function updateNoteSubjects() {
  const select = document.getElementById("noteSubjectFilter");
  const subjects = [...new Set(notes.map((note) => note.subject))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = `<option value="">All subjects</option>${subjects
    .map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`)
    .join("")}`;
  select.value = subjects.includes(noteSubject) ? noteSubject : "";
  noteSubject = select.value;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function safeMeetingUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeVideoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function notificationSignature() {
  return sessions.map((session) => `${session.id}:${session.status}:${session.meetingAddedAt || ""}:${session.updatedAt}`).join("|");
}

function renderNotifications() {
  const list = document.getElementById("notificationList");
  const count = document.getElementById("notificationCount");
  const signature = notificationSignature();
  const seenSignature = currentUser ? readStorage(`skillExchangeNotificationSeen:${currentUser.id}`, "") : "";
  document.getElementById("notificationDot").hidden = !currentUser || !sessions.length || signature === seenSignature;
  count.textContent = `${sessions.length} ${sessions.length === 1 ? "update" : "updates"}`;

  if (!sessions.length) {
    list.innerHTML = `<p class="notification-empty">No booking updates yet.</p>`;
    return;
  }

  list.innerHTML = [...sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8).map((session) => {
    const isHost = session.hostId === currentUser?.id;
    const otherStudent = isHost ? session.requester.fullName : session.host.fullName;
    let title = "Session updated";
    let detail = `${session.skill.title} with ${otherStudent}`;
    if (isHost && session.status === "PENDING") title = "New session request";
    if (!isHost && session.status === "ACCEPTED" && !session.meetingUrl) title = "Request accepted";
    if (session.status === "ACCEPTED" && session.meetingUrl) title = "Meeting link ready";
    if (session.status === "DECLINED") title = "Request declined";
    if (session.status === "CANCELLED") title = "Session cancelled";
    if (session.status === "COMPLETED") title = "Session completed";
    return `<button class="notification-item" type="button" data-notification-session="${escapeHtml(session.id)}"><span>${escapeHtml(session.status.slice(0, 1))}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)} · ${formatDateTime(session.scheduledAt)}</small></span></button>`;
  }).join("");

  list.querySelectorAll("[data-notification-session]").forEach((button) => {
    button.addEventListener("click", () => {
      closeMenus();
      document.getElementById("sessionsSection").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function markNotificationsSeen() {
  if (!currentUser) return;
  writeStorage(`skillExchangeNotificationSeen:${currentUser.id}`, notificationSignature());
  renderNotifications();
}

function renderSessions() {
  const list = document.getElementById("sessionsList");
  const empty = document.getElementById("emptySessions");
  if (!list || !empty) return;

  list.innerHTML = sessions.map((session) => {
    const date = new Date(session.scheduledAt);
    const isHost = session.hostId === currentUser?.id;
    const otherStudent = isHost ? session.requester : session.host;
    const relationship = isHost ? `Requested by ${otherStudent.fullName}` : `Hosted by ${otherStudent.fullName}`;
    const statusClass = `status-${session.status.toLowerCase()}`;
    const actions = [];
    const meetingUrl = safeMeetingUrl(session.meetingUrl);

    if (isHost && session.status === "PENDING") {
      actions.push(`<button class="accept-action" type="button" data-session-status="ACCEPTED" data-session-id="${escapeHtml(session.id)}">Accept</button>`, `<button class="danger-action" type="button" data-session-status="DECLINED" data-session-id="${escapeHtml(session.id)}">Decline</button>`);
    }
    if (!isHost && ["PENDING", "ACCEPTED"].includes(session.status)) {
      actions.push(`<button class="danger-action" type="button" data-session-status="CANCELLED" data-session-id="${escapeHtml(session.id)}">Cancel</button>`);
    }
    if (session.status === "ACCEPTED") {
      if (meetingUrl) actions.unshift(`<a class="join-call-action" href="${escapeHtml(meetingUrl)}" target="_blank" rel="noopener noreferrer">Join Call</a>`);
      if (!meetingUrl && !isHost) actions.unshift(`<span class="waiting-link">Waiting for meeting link</span>`);
      if (isHost) {
        actions.push(`<button type="button" data-add-meeting="${escapeHtml(session.id)}">${meetingUrl ? "Edit Link" : "Add Meeting Link"}</button>`);
        if (date.getTime() <= Date.now()) actions.push(`<button class="accept-action" type="button" data-session-status="COMPLETED" data-session-id="${escapeHtml(session.id)}">Complete</button>`);
        else actions.push(`<span class="waiting-link">Complete after start time</span>`);
      }
    }

    return `<article class="session-row">
      <span class="date-chip"><strong>${String(date.getDate()).padStart(2, "0")}</strong><small>${date.toLocaleString(undefined, { month: "short" }).toUpperCase()}</small></span>
      <div class="session-info"><strong>${escapeHtml(session.skill.title)}</strong><small>${escapeHtml(relationship)} · ${formatDateTime(session.scheduledAt)} · ${session.durationMinutes} min</small><p class="session-message" title="${escapeHtml(session.message)}">${escapeHtml(session.message)}</p><span class="session-status ${statusClass}">${escapeHtml(session.status)}</span></div>
      ${actions.length ? `<div class="session-actions">${actions.join("")}</div>` : ""}
    </article>`;
  }).join("");

  renderNotifications();

  empty.hidden = sessions.length > 0;
  if (!sessions.length) {
    empty.querySelector("h3").textContent = sessionsLoadError ? "Could not load sessions" : "No session requests yet";
    empty.querySelector("p").textContent = sessionsLoadError || "Request a session from a skill card to start learning one-to-one.";
  }

  list.querySelectorAll("[data-session-status]").forEach((button) => {
    button.addEventListener("click", () => changeSessionStatus(button.dataset.sessionId, button.dataset.sessionStatus));
  });
  list.querySelectorAll("[data-add-meeting]").forEach((button) => {
    button.addEventListener("click", () => openMeetingDialog(sessions.find((session) => session.id === button.dataset.addMeeting)));
  });
}

async function changeSessionStatus(sessionId, status) {
  const labels = { ACCEPTED: "accept", DECLINED: "decline", CANCELLED: "cancel", COMPLETED: "complete" };
  if (!window.confirm(`Do you want to ${labels[status]} this session?`)) return;
  try {
    const result = await apiRequest(`/sessions/${sessionId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadSessions();
    showToast(result.message);
  } catch (error) {
    showToast(error.message);
  }
}

function renderNotes() {
  const list = document.getElementById("notesList");
  const empty = document.getElementById("emptyNotes");
  const emptyTitle = document.getElementById("emptyNotesTitle");
  const emptyMessage = document.getElementById("emptyNotesMessage");
  const normalizedQuery = noteSearchQuery.trim().toLowerCase();
  const filtered = notes.filter((note) => {
    const searchable = `${note.title} ${note.subject} ${note.description} ${note.uploader?.fullName || ""}`.toLowerCase();
    return (!noteSubject || note.subject === noteSubject) && searchable.includes(normalizedQuery);
  });

  list.innerHTML = filtered.map((note) => {
    const uploaderName = note.uploader?.fullName || "SkillExchange student";
    const isOwner = currentUser?.id === note.uploaderId;
    return `
      <article class="note-card">
        <span class="note-file-icon"><svg><use href="#i-file"></use></svg></span>
        <div class="note-details">
          <span class="note-subject">${escapeHtml(note.subject)}</span>
          <h3 title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.description)}</p>
          <span class="note-meta">${escapeHtml(uploaderName)} · ${formatFileSize(note.fileSize)} · ${formatDate(note.createdAt)}</span>
        </div>
        <div class="note-actions">
          <a href="${API_BASE_URL}/notes/${encodeURIComponent(note.id)}/download">Download</a>
          ${isOwner ? `<button type="button" data-edit-note="${escapeHtml(note.id)}">Edit</button><button class="danger-action" type="button" data-delete-note="${escapeHtml(note.id)}">Delete</button>` : ""}
        </div>
      </article>`;
  }).join("");

  empty.hidden = filtered.length > 0;
  if (!filtered.length) {
    if (notesLoadError) {
      emptyTitle.textContent = "Could not load notes";
      emptyMessage.textContent = notesLoadError;
    } else if (notes.length) {
      emptyTitle.textContent = "No matching notes";
      emptyMessage.textContent = "Try another search or choose a different subject.";
    } else {
      emptyTitle.textContent = "No notes uploaded yet";
      emptyMessage.textContent = "Be the first student to share a useful PDF resource.";
    }
  }

  list.querySelectorAll("[data-edit-note]").forEach((button) => {
    button.addEventListener("click", () => openNoteDialog(notes.find((note) => note.id === button.dataset.editNote)));
  });
  list.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => removeNote(button.dataset.deleteNote));
  });
}

function openNoteDialog(note = null) {
  if (!currentUser) {
    showPage("loginPage");
    showToast("Please log in before uploading a note.");
    return;
  }

  noteForm.reset();
  showFormError(document.getElementById("noteFormError"), "");
  document.getElementById("editingNoteId").value = note?.id || "";
  document.getElementById("noteDialogTitle").textContent = note ? "Edit your note" : "Upload a PDF note";
  document.getElementById("noteTitle").value = note?.title || "";
  document.getElementById("noteSubject").value = note?.subject || "";
  document.getElementById("noteDescription").value = note?.description || "";
  document.getElementById("noteFileField").hidden = Boolean(note);
  document.getElementById("noteFile").required = !note;
  noteDialog.showModal();
}

function closeNoteDialog() {
  if (noteDialog.open) noteDialog.close();
}

async function removeNote(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note || !window.confirm(`Delete "${note.title}" and its PDF? This cannot be undone.`)) return;

  try {
    await apiRequest(`/notes/${noteId}`, { method: "DELETE" });
    await loadNotes();
    showToast("Note deleted successfully.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderSkills() {
  const grid = document.getElementById("skillsGrid");
  const empty = document.getElementById("emptySkills");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = skills.filter((skill) => {
    const matchesCategory = activeCategory === "All" || skill.category === activeCategory;
    const searchable = `${skill.title} ${skill.description} ${skill.creator?.fullName || ""} ${skill.category}`.toLowerCase();
    return matchesCategory && searchable.includes(normalizedQuery);
  });

  grid.innerHTML = filtered.map((skill) => {
    const isSaved = savedSkills.includes(skill.id);
    const teacherName = skill.creator?.fullName || "SkillExchange student";
    const teacherInitials = getInitials(teacherName);
    const visual = categoryVisuals[skill.category] || categoryVisuals.Other;
    const isOwner = currentUser?.id === skill.creatorId;
    return `
      <article class="skill-card">
        <div class="skill-art skill-${visual.tone}">
          <svg><use href="#${visual.icon}"></use></svg>
          <button class="bookmark-button ${isSaved ? "saved" : ""}" type="button" data-skill-id="${escapeHtml(skill.id)}" data-skill-title="${escapeHtml(skill.title)}" aria-label="${isSaved ? "Remove" : "Save"} ${escapeHtml(skill.title)}">
            <svg><use href="#i-bookmark"></use></svg>
          </button>
        </div>
        <div class="skill-content">
          <div class="skill-meta"><span class="skill-level">${escapeHtml(skill.level)}</span><span class="skill-lessons">${skill.lessonCount} ${skill.lessonCount === 1 ? "lesson" : "lessons"}</span></div>
          <h3>${escapeHtml(skill.title)}</h3>
          <div class="skill-footer">
            <span class="teacher"><span class="teacher-avatar">${escapeHtml(teacherInitials)}</span>${escapeHtml(teacherName)}</span>
            <span class="learners">${escapeHtml(skill.category)}</span>
          </div>
          ${isOwner ? `<button class="skill-lesson-button" type="button" data-view-lessons="${escapeHtml(skill.id)}">Manage video lessons</button><div class="skill-owner-actions"><button type="button" data-edit-skill="${escapeHtml(skill.id)}">Edit</button><button class="danger-action" type="button" data-delete-skill="${escapeHtml(skill.id)}">Delete</button></div>` : `<button class="skill-lesson-button" type="button" data-view-lessons="${escapeHtml(skill.id)}">View video lessons</button><button class="request-session-button" type="button" data-request-session="${escapeHtml(skill.id)}">Request 1-to-1 session</button>`}
        </div>
      </article>`;
  }).join("");

  empty.hidden = filtered.length > 0;
  if (!filtered.length && !searchQuery && activeCategory === "All" && !skills.length && !skillsLoadError) {
    document.getElementById("emptySkillsTitle").textContent = "No skills shared yet";
    document.getElementById("emptySkillsMessage").textContent = "Be the first student to share a skill with the community.";
  }

  grid.querySelectorAll(".bookmark-button").forEach((button) => {
    button.addEventListener("click", () => toggleSaved(button.dataset.skillId, button.dataset.skillTitle));
  });
  grid.querySelectorAll("[data-edit-skill]").forEach((button) => {
    button.addEventListener("click", () => openSkillDialog(skills.find((skill) => skill.id === button.dataset.editSkill)));
  });
  grid.querySelectorAll("[data-delete-skill]").forEach((button) => {
    button.addEventListener("click", () => removeSkill(button.dataset.deleteSkill));
  });
  grid.querySelectorAll("[data-request-session]").forEach((button) => {
    button.addEventListener("click", () => openSessionDialog(skills.find((skill) => skill.id === button.dataset.requestSession)));
  });
  grid.querySelectorAll("[data-view-lessons]").forEach((button) => {
    button.addEventListener("click", () => openLessonDialog(skills.find((skill) => skill.id === button.dataset.viewLessons)));
  });
}

function toggleSaved(id, title) {
  if (savedSkills.includes(id)) {
    savedSkills = savedSkills.filter((item) => item !== id);
    showToast(`${title} removed from saved skills.`);
  } else {
    savedSkills.push(id);
    showToast(`${title} saved successfully.`);
  }
  writeStorage("skillExchangeSaved", savedSkills);
  renderSkills();
}

function openSkillDialog(skill = null) {
  if (!currentUser) {
    showPage("loginPage");
    showToast("Please log in before sharing a skill.");
    return;
  }

  skillForm.reset();
  showFormError(document.getElementById("skillFormError"), "");
  document.getElementById("editingSkillId").value = skill?.id || "";
  document.getElementById("skillDialogTitle").textContent = skill ? "Edit your skill" : "Share a skill";
  document.getElementById("skillTitle").value = skill?.title || "";
  document.getElementById("skillDescription").value = skill?.description || "";
  document.getElementById("skillCategory").value = skill?.category || "";
  document.getElementById("skillLevel").value = skill?.level || "";
  document.getElementById("skillLessonCount").value = skill?.lessonCount || 1;
  skillDialog.showModal();
}

function closeSkillDialog() {
  if (skillDialog.open) skillDialog.close();
}

async function removeSkill(skillId) {
  const skill = skills.find((item) => item.id === skillId);
  if (!skill || !window.confirm(`Delete "${skill.title}"? This cannot be undone.`)) return;

  try {
    await apiRequest(`/skills/${skillId}`, { method: "DELETE" });
    savedSkills = savedSkills.filter((item) => item !== skillId);
    writeStorage("skillExchangeSaved", savedSkills);
    await loadSkills();
    showToast("Skill deleted successfully.");
  } catch (error) {
    showToast(error.message);
  }
}

function resetLessonForm() {
  lessonForm.reset();
  document.getElementById("editingLessonId").value = "";
  document.getElementById("lessonFormTitle").textContent = "Publish a lesson";
  document.getElementById("lessonPosition").value = skillLessons.length + 1;
  showFormError(document.getElementById("lessonFormError"), "");
}

function renderLessonList() {
  const list = document.getElementById("lessonList");
  const isOwner = currentLessonSkill?.creatorId === currentUser?.id;
  const plannedCount = currentLessonSkill?.lessonCount || 0;
  document.getElementById("lessonProgress").textContent = `${skillLessons.length} published of ${plannedCount} planned ${plannedCount === 1 ? "lesson" : "lessons"}`;
  lessonForm.hidden = !isOwner;

  if (!skillLessons.length) {
    list.innerHTML = `<p class="lesson-empty">No video lessons have been published for this skill yet.</p>`;
    return;
  }

  list.innerHTML = skillLessons.map((lesson) => {
    const videoUrl = safeVideoUrl(lesson.videoUrl);
    return `<article class="lesson-card">
      <span class="lesson-number">${String(lesson.position).padStart(2, "0")}</span>
      <div class="lesson-details"><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.description)}</p></div>
      <div class="lesson-actions">
        ${videoUrl ? `<a class="watch-lesson" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer">Watch video</a>` : ""}
        ${isOwner ? `<button type="button" data-edit-lesson="${escapeHtml(lesson.id)}">Edit</button><button class="danger-action" type="button" data-delete-lesson="${escapeHtml(lesson.id)}">Delete</button>` : ""}
      </div>
    </article>`;
  }).join("");

  list.querySelectorAll("[data-edit-lesson]").forEach((button) => {
    button.addEventListener("click", () => editLesson(button.dataset.editLesson));
  });
  list.querySelectorAll("[data-delete-lesson]").forEach((button) => {
    button.addEventListener("click", () => removeLesson(button.dataset.deleteLesson));
  });
}

async function loadLessons() {
  if (!currentLessonSkill) return;
  const list = document.getElementById("lessonList");
  list.innerHTML = `<p class="lesson-empty">Loading lessons...</p>`;
  try {
    const result = await apiRequest(`/skills/${currentLessonSkill.id}/lessons`);
    skillLessons = result.lessons;
    renderLessonList();
    if (!document.getElementById("editingLessonId").value) {
      document.getElementById("lessonPosition").value = skillLessons.length + 1;
    }
  } catch (error) {
    skillLessons = [];
    list.innerHTML = `<p class="lesson-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function openLessonDialog(skill) {
  if (!skill) return;
  currentLessonSkill = skill;
  skillLessons = [];
  document.getElementById("lessonDialogTitle").textContent = currentUser?.id === skill.creatorId ? "Manage video lessons" : "Video lessons";
  document.getElementById("lessonSkillTitle").textContent = skill.title;
  resetLessonForm();
  lessonForm.hidden = currentUser?.id !== skill.creatorId;
  lessonDialog.showModal();
  await loadLessons();
}

function closeLessonDialog() {
  if (lessonDialog.open) lessonDialog.close();
  currentLessonSkill = null;
  skillLessons = [];
}

function editLesson(lessonId) {
  const lesson = skillLessons.find((item) => item.id === lessonId);
  if (!lesson) return;
  document.getElementById("editingLessonId").value = lesson.id;
  document.getElementById("lessonFormTitle").textContent = "Edit lesson";
  document.getElementById("lessonTitle").value = lesson.title;
  document.getElementById("lessonVideoUrl").value = lesson.videoUrl;
  document.getElementById("lessonPosition").value = lesson.position;
  document.getElementById("lessonDescription").value = lesson.description;
  lessonForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removeLesson(lessonId) {
  const lesson = skillLessons.find((item) => item.id === lessonId);
  if (!lesson || !currentLessonSkill || !window.confirm(`Delete lesson "${lesson.title}"?`)) return;
  try {
    await apiRequest(`/skills/${currentLessonSkill.id}/lessons/${lessonId}`, { method: "DELETE" });
    resetLessonForm();
    await loadLessons();
    showToast("Lesson deleted successfully.");
  } catch (error) {
    showToast(error.message);
  }
}

async function openProfileDialog() {
  closeMenus();
  showFormError(document.getElementById("profileFormError"), "");
  try {
    const result = await apiRequest("/profiles/me");
    const profile = result.profile;
    currentUser = { ...currentUser, ...profile };
    document.getElementById("profileDialogAvatar").textContent = getInitials(profile.fullName);
    document.getElementById("profileDialogName").textContent = profile.fullName;
    document.getElementById("profileDialogEmail").textContent = profile.email;
    document.getElementById("profileFullName").value = profile.fullName;
    document.getElementById("profileDepartment").value = profile.department || "";
    document.getElementById("profileStudyYear").value = profile.studyYear || "";
    document.getElementById("profileBio").value = profile.bio || "";
    document.getElementById("profileSkillCount").textContent = profile._count?.skills ?? 0;
    document.getElementById("profileNoteCount").textContent = profile._count?.notes ?? 0;
    document.getElementById("profileSessionCount").textContent = profile._count?.hostedSessions ?? 0;
    profileDialog.showModal();
  } catch (error) {
    showToast(error.message);
  }
}

function closeProfileDialog() {
  if (profileDialog.open) profileDialog.close();
}

function openSessionDialog(skill) {
  if (!currentUser) {
    showPage("loginPage");
    showToast("Please log in before requesting a session.");
    return;
  }
  if (!skill || skill.creatorId === currentUser.id) {
    showToast("Choose a skill shared by another student.");
    return;
  }

  sessionForm.reset();
  showFormError(document.getElementById("sessionFormError"), "");
  document.getElementById("sessionSkillId").value = skill.id;
  document.getElementById("sessionSkillTitle").textContent = skill.title;
  document.getElementById("sessionHostName").textContent = `With ${skill.creator?.fullName || "SkillExchange student"}`;
  const earliest = new Date(Date.now() + 16 * 60 * 1000);
  document.getElementById("sessionDateTime").min = localDateTimeValue(earliest);
  document.getElementById("sessionDateTime").value = localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
  sessionDialog.showModal();
}

function closeSessionDialog() {
  if (sessionDialog.open) sessionDialog.close();
}

function openMeetingDialog(session) {
  if (!session || session.hostId !== currentUser?.id || session.status !== "ACCEPTED") {
    showToast("Only the host can add a link to an accepted session.");
    return;
  }
  meetingForm.reset();
  showFormError(document.getElementById("meetingFormError"), "");
  document.getElementById("meetingSessionId").value = session.id;
  document.getElementById("meetingSkillTitle").textContent = session.skill.title;
  document.getElementById("meetingStudentName").textContent = `With ${session.requester.fullName}`;
  document.getElementById("meetingUrl").value = session.meetingUrl || "";
  document.getElementById("meetingDialogTitle").textContent = session.meetingUrl ? "Edit meeting link" : "Add meeting link";
  meetingDialog.showModal();
}

function closeMeetingDialog() {
  if (meetingDialog.open) meetingDialog.close();
}

function startSessionPolling() {
  if (sessionPollTimer) clearInterval(sessionPollTimer);
  sessionPollTimer = window.setInterval(() => {
    if (currentUser && document.visibilityState === "visible") void loadSessions();
  }, 30000);
}

pageLinks.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

landingMenuButton?.addEventListener("click", () => toggleMenu(landingMenuButton, landingMobileMenu));
dashboardMenuButton?.addEventListener("click", () => toggleMenu(dashboardMenuButton, dashboardMobileMenu));
profileButton?.addEventListener("click", () => toggleMenu(profileButton, profileMenu));
document.getElementById("editProfileButton").addEventListener("click", openProfileDialog);
document.getElementById("quickProfileButton").addEventListener("click", openProfileDialog);
document.getElementById("notificationButton").addEventListener("click", () => {
  const willOpen = !notificationPanel.classList.contains("open");
  toggleMenu(document.getElementById("notificationButton"), notificationPanel);
  if (willOpen) markNotificationsSeen();
});

document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", closeMenus);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-group")) {
    profileMenu?.classList.remove("open");
    notificationPanel?.classList.remove("open");
    profileButton?.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
    button.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
  });
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const error = document.getElementById("loginError");

  if (!isValidEmail(email)) {
    showFormError(error, "Enter a valid college email address.");
    return;
  }
  if (!password) {
    showFormError(error, "Enter your password.");
    return;
  }

  setFormPending(form, true);
  showFormError(error, "");

  try {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setCurrentUser(result.user);
    form.reset();
    showPage("homePage");
    await loadSessions();
    startSessionPolling();
    showToast("Login successful. Welcome to SkillExchange!");
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(form, false);
  }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const error = document.getElementById("registerError");

  if (name.length < 2) {
    showFormError(error, "Enter your full name.");
    return;
  }
  if (!isValidEmail(email)) {
    showFormError(error, "Enter a valid college email address.");
    return;
  }
  if (password.length < 8) {
    showFormError(error, "Password must contain at least 8 characters.");
    return;
  }
  if (password !== confirmPassword) {
    showFormError(error, "Password and confirm password do not match.");
    return;
  }

  setFormPending(form, true);
  showFormError(error, "");

  try {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName: name, email, password }),
    });
    setCurrentUser(result.user);
    form.reset();
    showPage("homePage");
    await loadSessions();
    startSessionPolling();
    showToast("Account created successfully. Welcome!");
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(form, false);
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Clear the screen session even if the server is temporarily unavailable.
  } finally {
    setCurrentUser(null);
    showPage("landingPage");
    showToast("You have been logged out.");
  }
});

document.getElementById("categoryButtons").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll("#categoryButtons button").forEach((item) => item.classList.toggle("active", item === button));
  renderSkills();
});

document.getElementById("skillSearch").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderSkills();
});

document.getElementById("searchButton").addEventListener("click", () => {
  searchQuery = document.getElementById("skillSearch").value;
  renderSkills();
  document.getElementById("skillsSection").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("clearFilters").addEventListener("click", () => {
  activeCategory = "All";
  searchQuery = "";
  document.getElementById("skillSearch").value = "";
  document.querySelectorAll("#categoryButtons button").forEach((button) => button.classList.toggle("active", button.dataset.category === "All"));
  renderSkills();
});

document.getElementById("noteSearch").addEventListener("input", (event) => {
  noteSearchQuery = event.target.value;
  renderNotes();
});

document.getElementById("noteSubjectFilter").addEventListener("change", (event) => {
  noteSubject = event.target.value;
  renderNotes();
});

document.getElementById("shareSkillButton").addEventListener("click", () => openSkillDialog());
document.getElementById("closeSkillDialog").addEventListener("click", closeSkillDialog);
document.getElementById("cancelSkillDialog").addEventListener("click", closeSkillDialog);

skillDialog.addEventListener("click", (event) => {
  if (event.target === skillDialog) closeSkillDialog();
});

document.getElementById("closeLessonDialog").addEventListener("click", closeLessonDialog);
document.getElementById("cancelLessonEdit").addEventListener("click", resetLessonForm);
lessonDialog.addEventListener("click", (event) => {
  if (event.target === lessonDialog) closeLessonDialog();
});

document.getElementById("uploadNoteButton").addEventListener("click", () => openNoteDialog());
document.getElementById("closeNoteDialog").addEventListener("click", closeNoteDialog);
document.getElementById("cancelNoteDialog").addEventListener("click", closeNoteDialog);

noteDialog.addEventListener("click", (event) => {
  if (event.target === noteDialog) closeNoteDialog();
});

document.getElementById("closeProfileDialog").addEventListener("click", closeProfileDialog);
document.getElementById("cancelProfileDialog").addEventListener("click", closeProfileDialog);
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) closeProfileDialog();
});

document.getElementById("closeSessionDialog").addEventListener("click", closeSessionDialog);
document.getElementById("cancelSessionDialog").addEventListener("click", closeSessionDialog);
sessionDialog.addEventListener("click", (event) => {
  if (event.target === sessionDialog) closeSessionDialog();
});

document.getElementById("closeMeetingDialog").addEventListener("click", closeMeetingDialog);
document.getElementById("cancelMeetingDialog").addEventListener("click", closeMeetingDialog);
meetingDialog.addEventListener("click", (event) => {
  if (event.target === meetingDialog) closeMeetingDialog();
});

skillForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("skillFormError");
  const editingSkillId = document.getElementById("editingSkillId").value;
  const title = document.getElementById("skillTitle").value.trim();
  const description = document.getElementById("skillDescription").value.trim();
  const category = document.getElementById("skillCategory").value;
  const level = document.getElementById("skillLevel").value;
  const lessonCount = Number(document.getElementById("skillLessonCount").value);

  if (title.length < 3) {
    showFormError(error, "Skill title must contain at least 3 characters.");
    return;
  }
  if (description.length < 10) {
    showFormError(error, "Description must contain at least 10 characters.");
    return;
  }
  if (!category || !level) {
    showFormError(error, "Select a category and level.");
    return;
  }
  if (!Number.isInteger(lessonCount) || lessonCount < 1 || lessonCount > 100) {
    showFormError(error, "Number of lessons must be between 1 and 100.");
    return;
  }

  setFormPending(skillForm, true);
  showFormError(error, "");

  try {
    const result = await apiRequest(editingSkillId ? `/skills/${editingSkillId}` : "/skills", {
      method: editingSkillId ? "PATCH" : "POST",
      body: JSON.stringify({ title, description, category, level, lessonCount }),
    });
    closeSkillDialog();
    await loadSkills();
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(skillForm, false);
  }
});

lessonForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentLessonSkill) return;
  const error = document.getElementById("lessonFormError");
  const editingLessonId = document.getElementById("editingLessonId").value;
  const title = document.getElementById("lessonTitle").value.trim();
  const videoUrl = document.getElementById("lessonVideoUrl").value.trim();
  const position = Number(document.getElementById("lessonPosition").value);
  const description = document.getElementById("lessonDescription").value.trim();

  if (title.length < 3) {
    showFormError(error, "Lesson title must contain at least 3 characters.");
    return;
  }
  if (!safeVideoUrl(videoUrl)) {
    showFormError(error, "Enter a valid video link beginning with https://");
    return;
  }
  if (!Number.isInteger(position) || position < 1 || position > 100) {
    showFormError(error, "Lesson number must be between 1 and 100.");
    return;
  }
  if (description.length < 5) {
    showFormError(error, "Description must contain at least 5 characters.");
    return;
  }

  setFormPending(lessonForm, true);
  showFormError(error, "");
  try {
    const result = await apiRequest(
      editingLessonId
        ? `/skills/${currentLessonSkill.id}/lessons/${editingLessonId}`
        : `/skills/${currentLessonSkill.id}/lessons`,
      {
        method: editingLessonId ? "PATCH" : "POST",
        body: JSON.stringify({ title, description, videoUrl, position }),
      },
    );
    resetLessonForm();
    await loadLessons();
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(lessonForm, false);
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("noteFormError");
  const editingNoteId = document.getElementById("editingNoteId").value;
  const title = document.getElementById("noteTitle").value.trim();
  const subject = document.getElementById("noteSubject").value.trim();
  const description = document.getElementById("noteDescription").value.trim();
  const file = document.getElementById("noteFile").files[0];

  if (title.length < 3) {
    showFormError(error, "Note title must contain at least 3 characters.");
    return;
  }
  if (subject.length < 2) {
    showFormError(error, "Subject must contain at least 2 characters.");
    return;
  }
  if (description.length < 10) {
    showFormError(error, "Description must contain at least 10 characters.");
    return;
  }
  if (!editingNoteId && !file) {
    showFormError(error, "Choose a PDF file to upload.");
    return;
  }
  if (file && !file.name.toLowerCase().endsWith(".pdf")) {
    showFormError(error, "Only PDF files are allowed.");
    return;
  }
  if (file && file.size > 10 * 1024 * 1024) {
    showFormError(error, "The PDF must be 10 MB or smaller.");
    return;
  }

  setFormPending(noteForm, true);
  showFormError(error, "");

  try {
    let result;
    if (editingNoteId) {
      result = await apiRequest(`/notes/${editingNoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, subject, description }),
      });
    } else {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("file", file);
      result = await apiRequest("/notes", { method: "POST", body: formData });
    }
    closeNoteDialog();
    await loadNotes();
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(noteForm, false);
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("profileFormError");
  const fullName = document.getElementById("profileFullName").value.trim();
  const department = document.getElementById("profileDepartment").value.trim();
  const studyYearValue = document.getElementById("profileStudyYear").value;
  const bio = document.getElementById("profileBio").value.trim();

  if (fullName.length < 2) {
    showFormError(error, "Enter your full name.");
    return;
  }

  setFormPending(profileForm, true);
  showFormError(error, "");
  try {
    const result = await apiRequest("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify({ fullName, department: department || null, studyYear: studyYearValue ? Number(studyYearValue) : null, bio: bio || null }),
    });
    setCurrentUser({ ...currentUser, ...result.profile });
    closeProfileDialog();
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(profileForm, false);
  }
});

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("sessionFormError");
  const skillId = document.getElementById("sessionSkillId").value;
  const dateTimeValue = document.getElementById("sessionDateTime").value;
  const durationMinutes = Number(document.getElementById("sessionDuration").value);
  const message = document.getElementById("sessionMessage").value.trim();

  if (!dateTimeValue || new Date(dateTimeValue).getTime() < Date.now() + 15 * 60 * 1000) {
    showFormError(error, "Choose a time at least 15 minutes from now.");
    return;
  }
  if (message.length < 10) {
    showFormError(error, "Message must contain at least 10 characters.");
    return;
  }

  setFormPending(sessionForm, true);
  showFormError(error, "");
  try {
    const result = await apiRequest("/sessions", {
      method: "POST",
      body: JSON.stringify({ skillId, scheduledAt: new Date(dateTimeValue).toISOString(), durationMinutes, message }),
    });
    closeSessionDialog();
    await loadSessions();
    document.getElementById("sessionsSection").scrollIntoView({ behavior: "smooth" });
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(sessionForm, false);
  }
});

meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("meetingFormError");
  const sessionId = document.getElementById("meetingSessionId").value;
  const meetingUrl = document.getElementById("meetingUrl").value.trim();

  if (!safeMeetingUrl(meetingUrl)) {
    showFormError(error, "Enter a valid meeting link beginning with https://");
    return;
  }

  setFormPending(meetingForm, true);
  showFormError(error, "");
  try {
    const result = await apiRequest(`/sessions/${sessionId}/meeting`, {
      method: "PATCH",
      body: JSON.stringify({ meetingUrl }),
    });
    closeMeetingDialog();
    await loadSessions();
    showToast(result.message);
  } catch (requestError) {
    showFormError(error, requestError.message);
  } finally {
    setFormPending(meetingForm, false);
  }
});

async function restoreSession() {
  try {
    const result = await apiRequest("/auth/me");
    setCurrentUser(result.user);
    showPage("homePage");
    await loadSessions();
    startSessionPolling();
  } catch {
    setCurrentUser(null);
    showPage("landingPage");
  }
}

async function initializeApp() {
  await Promise.all([loadSkills(), loadNotes()]);
  await restoreSession();
}

void initializeApp();
