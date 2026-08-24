/* ============================================================
   EmpRegistry Pro — front-end logic
   - employees[]    -> every registered record (array of objects),
                       loaded from and written to the MySQL database
                       via the PHP endpoints below (NOT localStorage
                       any more).
   - selectedRefs    -> refs currently ticked for bulk export on the Records page
   - editingRef      -> ref of the employee currently being edited, or null

   Backend contract used by this file:
     GET  api/query.php            -> { status, count, employees: [...] } (all rows)
     GET  api/query.php?q=term     -> same shape, filtered server-side
     POST api/register-employee.php -> insert a new employee, { status, id, regNo }
     POST api/update-employee.php   -> update an existing employee (by ref), { status }
     POST api/delete-employee.php   -> delete an employee (by ref), { status }

   NOTE: query.php and register-employee.php exist in this project already.
   update-employee.php and delete-employee.php do NOT exist yet among the
   uploaded files — they'll need to be added on the server for editing and
   deleting dossiers to actually persist. This file calls them optimistically
   and will surface a clear error if they're missing (404 / non-OK response).
   ============================================================ */

const API_BASE = 'api/'; // matches the existing form action="api/register-employee.php"

const DEFAULT_SKILLS = ['Communication', 'Project Management', 'JavaScript', 'Data Analysis', 'Customer Service', 'Leadership'];

let employees    = [];        // <- populated FROM THE DATABASE on load / after every change
let refCounter   = 100;       // next reference/registration number starts at 101; derived from loaded data
let selectedRefs = new Set(); // refs ticked for bulk export on the Records page
let editingRef   = null;      // ref of the employee being edited, or null when adding new

/* ---------- Map a raw DB row (from query.php) to the shape the UI already expects ---------- */
function mapServerRecord(row) {
  return {
    id: row.id,
    regNo: row.reg_no,
    ref: row.reference_no,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    employmentType: row.employment_type,
    officeLocation: row.office_location,
    jobTitle: row.job_title,
    salary: row.salary,
    confidential: !!row.is_confidential,
    startDate: row.start_date,
    skills: row.skills || [],
    photo: row.photo_path || null, // server stores a file path, not base64
    filedAt: row.filed_at,
    updatedAt: row.updated_at
  };
}

/* ---------- Recompute the next registration counter from whatever the DB gave us ---------- */
function computeRefCounterFromEmployees() {
  let max = 100;
  employees.forEach(emp => {
    const match = /(\d+)\s*$/.exec(emp.regNo || '');
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  });
  refCounter = max;
}

/* ---------- Small fetch wrapper: JSON in, JSON out, throws on failure ---------- */
async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let payload = null;
  try { payload = await res.json(); } catch (err) { /* non-JSON response */ }
  if (!res.ok || !payload || payload.status !== 'ok') {
    const message = (payload && payload.message) || `Request to ${path} failed (${res.status}).`;
    throw new Error(message);
  }
  return payload;
}

/* ---------- Load every employee from the database ---------- */
async function loadEmployeesFromServer() {
  try {
    const payload = await apiRequest('query.php');
    employees = (payload.employees || []).map(mapServerRecord);
    computeRefCounterFromEmployees();
  } catch (err) {
    employees = [];
    alert('Could not load employees from the database: ' + err.message);
  }
  renderEmployees();
}

/* ---------- DOM references ---------- */
const form              = document.getElementById('registrationForm');
const recordsList       = document.getElementById('recordsList');
const recordCount       = document.getElementById('recordCount');
const homeCount         = document.getElementById('homeCount');
const homeNextReg       = document.getElementById('homeNextReg');

const chipField         = document.getElementById('skillChips');
const skillsValueInput  = document.getElementById('skillsValue');
const skillCountLabel   = document.getElementById('skillCount');
const newSkillInput     = document.getElementById('newSkill');
const addSkillBtn       = document.getElementById('addSkillBtn');

const lockBtn           = document.getElementById('lockSalary');
const salaryInput       = document.getElementById('salary');
const salaryNote        = document.getElementById('salaryNote');

const photoUpload       = document.getElementById('photoUpload');
const photoPreview      = document.getElementById('photoPreview');
const photoPlaceholder  = document.getElementById('photoPlaceholder');
const removePhotoBtn    = document.getElementById('removePhoto');

const tabs               = document.querySelectorAll('.tab');

const topnavLinks        = document.querySelectorAll('.topnav-link');
const pages               = document.querySelectorAll('.page');
const gotoButtons         = document.querySelectorAll('[data-goto]');

const quickSearchInput    = document.getElementById('quickSearch');
const quickSearchBtn      = document.getElementById('quickSearchBtn');

const searchQueryInput    = document.getElementById('searchQuery');
const searchBtn           = document.getElementById('searchBtn');
const searchResults       = document.getElementById('searchResults');

const recordsSelectAll    = document.getElementById('recordsSelectAll');

const editBanner          = document.getElementById('editBanner');
const editBannerName      = document.getElementById('editBannerName');
const cancelEditBtn       = document.getElementById('cancelEditBtn');
const deleteEmployeeBtn   = document.getElementById('deleteEmployeeBtn');
const editExportWrap      = document.getElementById('editExportWrap');
const submitBtn           = document.getElementById('submitBtn');
const formFooterNote      = document.getElementById('formFooterNote');

/* ---------- Small utility: escape user text before it goes into innerHTML ---------- */
function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function sanitizeFilename(str) {
  return String(str || 'employee').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'employee';
}

/* ================= Page navigation (Home / Register / Records / Search) ================= */
function showPage(name) {
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  topnavLinks.forEach(link => link.classList.toggle('active', link.dataset.page === name));
}

topnavLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.page === 'register' && editingRef) exitEditMode();
    showPage(link.dataset.page);
    if (link.dataset.page === 'search') runSearch();
  });
});

gotoButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.goto === 'register' && editingRef) exitEditMode();
    showPage(btn.dataset.goto);
  });
});

/* ================= Skills (array-driven) ================= */
function getSelectedSkills() {
  return Array.from(chipField.querySelectorAll('.chip.selected'))
    .map(chip => chip.dataset.skill);
}

function refreshSkillsValue() {
  const selected = getSelectedSkills();
  skillsValueInput.value = selected.join(', ');
  skillCountLabel.textContent = selected.length;
}

chipField.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  chip.classList.toggle('selected');
  refreshSkillsValue();
});

function addNewSkill() {
  const value = newSkillInput.value.trim();
  if (!value) return;
  const existing = Array.from(chipField.querySelectorAll('.chip')).find(c => c.dataset.skill.toLowerCase() === value.toLowerCase());
  if (existing) {
    existing.classList.add('selected');
  } else {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip selected';
    chip.dataset.skill = value;
    chip.textContent = value;
    chipField.appendChild(chip);
  }
  newSkillInput.value = '';
  refreshSkillsValue();
  newSkillInput.focus();
}

addSkillBtn.addEventListener('click', addNewSkill);
newSkillInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addNewSkill(); }
});

/* ================= Salary confidentiality toggle ================= */
lockBtn.addEventListener('click', () => {
  const locked = lockBtn.getAttribute('aria-pressed') === 'true';
  lockBtn.setAttribute('aria-pressed', String(!locked));
  lockBtn.classList.toggle('locked', !locked);
  lockBtn.querySelector('.lock-icon').textContent = !locked ? '🔒' : '🔓';
  lockBtn.lastChild.textContent = !locked ? ' Confidential' : ' Mark confidential';
  salaryInput.type = !locked ? 'password' : 'number';
  salaryNote.textContent = !locked
    ? 'Hidden from this dossier view — marked confidential.'
    : 'Visible on this dossier by default.';
});

/* ================= Photo preview ================= */
photoUpload.addEventListener('change', () => {
  const file = photoUpload.files && photoUpload.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.src = e.target.result;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  };
  reader.readAsDataURL(file);
});

removePhotoBtn.addEventListener('click', () => {
  photoUpload.value = '';
  photoPreview.hidden = true;
  photoPreview.src = '';
  photoPlaceholder.hidden = false;
});

/* ================= Tab nav active state (inside Register page) ================= */
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

/* ================= Stop Enter from silently submitting the form =================
   Enter should only add a skill (handled above) — actually saving a dossier
   should only happen when "Register employee" / "Update employee" is clicked. */
form.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const tag = e.target.tagName;
  const type = (e.target.type || '').toLowerCase();
  if (tag !== 'TEXTAREA' && type !== 'submit' && type !== 'button') {
    e.preventDefault();
  }
});

/* ================= Render one employee card (shared by Records + Search) ================= */
function employeeCardHTML(emp, opts = {}) {
  const selectable = opts.selectable !== false;
  return `
    <article class="record-card" data-ref="${escapeHTML(emp.ref)}">
      ${selectable ? `<input type="checkbox" class="record-select" data-ref="${escapeHTML(emp.ref)}" aria-label="Select ${escapeHTML(emp.name)} for export" ${selectedRefs.has(emp.ref) ? 'checked' : ''}>` : ''}
      <div class="record-avatar">
        ${emp.photo
          ? `<img src="${emp.photo}" alt="${escapeHTML(emp.name)}">`
          : `<span>${escapeHTML((emp.name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase())}</span>`
        }
      </div>
      <div class="record-body">
        <div class="record-top">
          <h3>${escapeHTML(emp.name)}</h3>
          <span class="record-ref">${escapeHTML(emp.ref)}</span>
        </div>
        <p class="record-role">${escapeHTML(emp.jobTitle || '—')} · ${escapeHTML(emp.department)}</p>
        <p class="record-contact">${escapeHTML(emp.email)} · ${escapeHTML(emp.phone)}</p>
        <p class="record-meta">
          ${escapeHTML(emp.employmentType)} · ${escapeHTML(emp.officeLocation)}
          ${emp.startDate ? ` · from ${escapeHTML(emp.startDate)}` : ''}
          · reg. ${escapeHTML(emp.regNo)}
        </p>
        <p class="record-salary">${emp.confidential ? '🔒 Salary confidential' : `💰 PKR ${escapeHTML(emp.salary || '0')}`}</p>
        ${emp.skills && emp.skills.length
          ? `<div class="record-skills">${emp.skills.map(s => `<span class="record-skill">${escapeHTML(s)}</span>`).join('')}</div>`
          : ''
        }
      </div>
    </article>
  `;
}

/* ================= Render employees[] -> Records page (one fast write) ================= */
function renderEmployees() {
  recordCount.textContent = `(${employees.length})`;
  homeCount.textContent = String(employees.length);
  homeNextReg.textContent = `REG-${String(refCounter + 1).padStart(6, '0')}`;

  if (employees.length === 0) {
    recordsList.innerHTML = '<p class="empty-state" id="emptyState">No employees filed yet. Register one to see a record appear here.</p>';
  } else {
    const html = employees
      .slice()
      .reverse() // newest first
      .map(emp => employeeCardHTML(emp, { selectable: true }))
      .join('');
    recordsList.innerHTML = html;
  }
  syncSelectAllState();
}

function syncSelectAllState() {
  if (!recordsSelectAll) return;
  recordsSelectAll.checked = employees.length > 0 && employees.every(e => selectedRefs.has(e.ref));
}

recordsSelectAll.addEventListener('change', () => {
  employees.forEach(emp => {
    if (recordsSelectAll.checked) selectedRefs.add(emp.ref);
    else selectedRefs.delete(emp.ref);
  });
  renderEmployees();
});

/* ================= Click a card: tick its checkbox, or open it for editing ================= */
function handleRecordAreaClick(e) {
  const checkbox = e.target.closest('.record-select');
  if (checkbox) {
    if (checkbox.checked) selectedRefs.add(checkbox.dataset.ref);
    else selectedRefs.delete(checkbox.dataset.ref);
    syncSelectAllState();
    return;
  }
  const card = e.target.closest('.record-card');
  if (!card) return;
  openEmployeeForEdit(card.dataset.ref);
}
recordsList.addEventListener('click', handleRecordAreaClick);
searchResults.addEventListener('click', handleRecordAreaClick);

/* ================= Search records (server-side, via query.php?q=) ================= */
async function runSearch() {
  const query = searchQueryInput.value.trim();

  try {
    const payload = await apiRequest(`query.php${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const list = (payload.employees || []).map(mapServerRecord);

    if (list.length === 0) {
      searchResults.innerHTML = query
        ? '<p class="empty-state">No dossier matches that search.</p>'
        : '<p class="empty-state">No employees filed yet. Register one first.</p>';
      return;
    }

    searchResults.innerHTML = list.map(emp => employeeCardHTML(emp, { selectable: false })).join('');
  } catch (err) {
    searchResults.innerHTML = '<p class="empty-state">Could not search the database right now.</p>';
  }
}

searchBtn.addEventListener('click', runSearch);
searchQueryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
});

/* ================= Quick search (top navigation) ================= */
function runQuickSearch() {
  searchQueryInput.value = quickSearchInput.value.trim();
  showPage('search');
  runSearch();
}
quickSearchBtn.addEventListener('click', runQuickSearch);
quickSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); runQuickSearch(); }
});

/* ================= Export helpers (CSV / TXT / PDF / Excel) ================= */
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const EXPORT_HEADERS = [
  'Registration No', 'Reference No', 'Full Name', 'Email', 'Phone',
  'Department', 'Employment Type', 'Office Location', 'Job Title',
  'Salary', 'Confidential', 'Start Date', 'Skills'
];

function exportRows(list) {
  return list.map(emp => [
    emp.regNo, emp.ref, emp.name, emp.email, emp.phone,
    emp.department, emp.employmentType, emp.officeLocation, emp.jobTitle,
    emp.confidential ? 'Confidential' : emp.salary, emp.confidential ? 'Yes' : 'No',
    emp.startDate, (emp.skills || []).join('; ')
  ]);
}

function filenameBaseFor(list) {
  if (list.length === 1) return `${sanitizeFilename(list[0].name)}_${list[0].regNo}`;
  const stamp = new Date().toISOString().slice(0, 10);
  return `Employees_Export_${stamp}`;
}

function exportCSV(list, base) {
  const csv = [EXPORT_HEADERS, ...exportRows(list)].map(row => row.map(csvEscape).join(',')).join('\n');
  downloadBlob(csv, `${base}.csv`, 'text/csv;charset=utf-8;');
}

function buildEmployeeTXT(emp) {
  return [
    'EMPREGISTRY PRO — PERSONNEL DOSSIER',
    '='.repeat(42),
    `Name: ${emp.name}`,
    `Registration No: ${emp.regNo}`,
    `Reference No: ${emp.ref}`,
    `Job Title: ${emp.jobTitle || '—'}`,
    `Department: ${emp.department || '—'}`,
    `Email: ${emp.email}`,
    `Phone: ${emp.phone}`,
    `Employment Type: ${emp.employmentType || '—'}`,
    `Office Location: ${emp.officeLocation || '—'}`,
    `Start Date: ${emp.startDate || '—'}`,
    `Monthly Salary (PKR): ${emp.confidential ? 'Confidential' : (emp.salary || '0')}`,
    `Skills: ${emp.skills && emp.skills.length ? emp.skills.join(', ') : '—'}`
  ].join('\n');
}

function exportTXT(list, base) {
  const text = list.map(buildEmployeeTXT).join('\n\n' + '-'.repeat(42) + '\n\n');
  downloadBlob(text, `${base}.txt`, 'text/plain;charset=utf-8;');
}

function exportXLSX(list, base) {
  if (typeof XLSX === 'undefined') { alert('Excel export library did not load — check your internet connection and try again.'); return; }
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...exportRows(list)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, `${base}.xlsx`);
}

function buildEmployeePDFPage(doc, emp, isFirst) {
  if (!isFirst) doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 42, 56);
  doc.text('EmpRegistry Pro', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(75, 87, 104);
  doc.text('Personnel Dossier', 20, y + 6);

  y += 12;
  doc.setDrawColor(30, 42, 56);
  doc.setLineWidth(0.6);
  doc.line(20, y, pageWidth - 20, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 42, 56);
  doc.text(emp.name || 'Unnamed employee', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(75, 87, 104);
  doc.text(`${emp.jobTitle || '—'}  ·  ${emp.department || '—'}`, 20, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(166, 61, 64);
  doc.text(`Reg. No: ${emp.regNo}      Ref No: ${emp.ref}`, 20, y);
  y += 12;

  const rows = [
    ['Email', emp.email || '—'],
    ['Phone', emp.phone || '—'],
    ['Employment type', emp.employmentType || '—'],
    ['Office location', emp.officeLocation || '—'],
    ['Start date', emp.startDate || '—'],
    ['Monthly salary (PKR)', emp.confidential ? 'Confidential' : (emp.salary || '0')],
    ['Skills', emp.skills && emp.skills.length ? emp.skills.join(', ') : '—']
  ];

  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 42, 56);
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 87, 104);
    const lines = doc.splitTextToSize(String(value), pageWidth - 75);
    doc.text(lines, 65, y);
    y += 7 * lines.length;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Filed: ${emp.filedAt ? new Date(emp.filedAt).toLocaleString() : '—'}`, 20, 285);
}

function exportPDF(list, base) {
  if (typeof window.jspdf === 'undefined') { alert('PDF export library did not load — check your internet connection and try again.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  list.forEach((emp, idx) => buildEmployeePDFPage(doc, emp, idx === 0));
  doc.save(`${base}.pdf`);
}

function runExport(format, list) {
  if (!list.length) { alert('There is nothing to export yet.'); return; }
  const base = filenameBaseFor(list);
  if (format === 'csv') exportCSV(list, base);
  else if (format === 'txt') exportTXT(list, base);
  else if (format === 'pdf') exportPDF(list, base);
  else if (format === 'xlsx') exportXLSX(list, base);
}

/* ================= Export menu wiring (Records bulk export + single-dossier export) ================= */
function wireExportMenu(btnId, menuId, getList) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.export-menu').forEach(m => { if (m !== menu) m.hidden = true; });
    menu.hidden = !menu.hidden;
  });
  menu.addEventListener('click', (e) => {
    const formatBtn = e.target.closest('button[data-format]');
    if (!formatBtn) return;
    runExport(formatBtn.dataset.format, getList());
    menu.hidden = true;
  });
}

wireExportMenu('recordsExportBtn', 'recordsExportMenu', () => selectedRefs.size ? employees.filter(e => selectedRefs.has(e.ref)) : employees);
wireExportMenu('editExportBtn', 'editExportMenu', () => editingRef ? employees.filter(e => e.ref === editingRef) : []);

document.addEventListener('click', () => {
  document.querySelectorAll('.export-menu').forEach(m => m.hidden = true);
});

/* ================= Edit mode: open a filed employee back into the form ================= */
function openEmployeeForEdit(ref) {
  const emp = employees.find(e => e.ref === ref);
  if (!emp) return;
  editingRef = ref;

  form.fullName.value = emp.name || '';
  form.email.value = emp.email || '';
  form.phone.value = emp.phone || '';
  form.department.value = emp.department || '';
  form.employmentType.value = emp.employmentType || '';
  form.officeLocation.value = emp.officeLocation || '';
  form.jobTitle.value = emp.jobTitle || '';
  form.startDate.value = emp.startDate || '';

  const isLocked = lockBtn.getAttribute('aria-pressed') === 'true';
  if (!!emp.confidential !== isLocked) lockBtn.click();
  salaryInput.value = emp.salary || '';

  chipField.querySelectorAll('.chip').forEach(chip => chip.classList.remove('selected'));
  (emp.skills || []).forEach(skill => {
    let chip = Array.from(chipField.querySelectorAll('.chip')).find(c => c.dataset.skill === skill);
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.skill = skill;
      chip.textContent = skill;
      chipField.appendChild(chip);
    }
    chip.classList.add('selected');
  });
  refreshSkillsValue();

  photoUpload.value = '';
  if (emp.photo) {
    photoPreview.src = emp.photo; // relative path served by the backend, or a fresh base64 preview once re-uploaded
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  } else {
    photoPreview.hidden = true;
    photoPreview.src = '';
    photoPlaceholder.hidden = false;
  }

  editBanner.hidden = false;
  editBannerName.textContent = emp.name || 'this employee';
  submitBtn.textContent = 'Update employee';
  formFooterNote.textContent = 'Editing an existing dossier — changes are saved to the database.';
  deleteEmployeeBtn.hidden = false;
  editExportWrap.hidden = false;

  showPage('register');
  tabs.forEach(t => t.classList.remove('active'));
  tabs[0].classList.add('active');
  document.getElementById('sec-identity').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEditMode() {
  editingRef = null;
  form.reset();

  Array.from(chipField.querySelectorAll('.chip')).forEach(chip => {
    if (!DEFAULT_SKILLS.includes(chip.dataset.skill)) chip.remove();
    else chip.classList.remove('selected');
  });
  refreshSkillsValue();

  photoUpload.value = '';
  photoPreview.hidden = true;
  photoPreview.src = '';
  photoPlaceholder.hidden = false;

  if (lockBtn.getAttribute('aria-pressed') === 'true') lockBtn.click();

  editBanner.hidden = true;
  submitBtn.textContent = 'Register employee';
  formFooterNote.textContent = 'Filed dossiers are saved to the database and sent to the registry endpoint.';
  deleteEmployeeBtn.hidden = true;
  editExportWrap.hidden = true;
}

cancelEditBtn.addEventListener('click', () => {
  exitEditMode();
  showPage('records');
});

/* ---------- Delete: remove from the database, then re-render from the server ----------
   Calls api/delete-employee.php, which does not exist among the current PHP files yet —
   this endpoint needs to be created for delete to actually persist. */
deleteEmployeeBtn.addEventListener('click', async () => {
  if (!editingRef) return;
  const emp = employees.find(e => e.ref === editingRef);
  if (!emp) return;
  const ok = confirm(`Delete the dossier for ${emp.name}? This cannot be undone.`);
  if (!ok) return;

  const refBeingDeleted = editingRef;
  deleteEmployeeBtn.disabled = true;
  try {
    await apiRequest('delete-employee.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: refBeingDeleted })
    });
    selectedRefs.delete(refBeingDeleted);
    exitEditMode();
    showPage('records');
    await loadEmployeesFromServer();
  } catch (err) {
    alert('Could not delete this dossier: ' + err.message);
  } finally {
    deleteEmployeeBtn.disabled = false;
  }
});

/* ================= Read the common (non-identity-number) fields off the form ================= */
function readCommonFields() {
  return {
    name: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    department: form.department.value.trim(),
    employmentType: form.employmentType.value.trim(),
    officeLocation: form.officeLocation.value.trim(),
    jobTitle: form.jobTitle.value.trim(),
    salary: form.salary.value,
    confidential: lockBtn.getAttribute('aria-pressed') === 'true',
    startDate: form.startDate.value,
    skills: getSelectedSkills(),
    photo: photoPreview.hidden ? null : photoPreview.src
  };
}

/* ================= Submit -> INSERT or UPDATE in the database, then reload + render =================
   Both requests block the UI briefly (unlike the old fire-and-forget POST) because the
   record list is no longer kept locally — it has to come back from the database for the
   Records/Search pages to be accurate. */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const common = readCommonFields();
  submitBtn.disabled = true;

  try {
    if (editingRef) {
      // NOTE: api/update-employee.php does not exist among the current PHP files yet —
      // this endpoint needs to be created for edits to actually persist.
      await apiRequest('update-employee.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ ref: editingRef }, common))
      });
      exitEditMode();
      showPage('records');
      await loadEmployeesFromServer();
      return;
    }

    refCounter += 1;
    const employee = Object.assign({
      regNo: `REG-${String(refCounter).padStart(6, '0')}`,
      ref: `ERP-2026-${String(refCounter).padStart(5, '0')}`,
      filedAt: new Date().toISOString()
    }, common);

    await apiRequest('register-employee.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });

    exitEditMode();
    showPage('records');
    await loadEmployeesFromServer();
  } catch (err) {
    refCounter -= editingRef ? 0 : 1; // don't burn a registration number on a failed insert
    alert('Could not save this dossier to the database: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

/* ================= Initial load: pull everything from the database before rendering ================= */
loadEmployeesFromServer();
runSearch();