// Default sample dataset (includes an empty array to test adding the first item)
const defaultData = {
  project: "JSON Editor Web Stack",
  version: 1.0,
  active: true,
  settings: {
    theme: "dark",
    autoSave: false,
    maxHistory: 50
  },
  tags: ["javascript", "web-dev", "json", "tooling"],
  notesList: [],
  metadata: {
    author: "Developer",
    license: "MIT",
    notes: null
  }
};

let currentData = JSON.parse(JSON.stringify(defaultData));

// DOM Elements
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const dropZone = document.getElementById('drop-zone');
const errorBanner = document.getElementById('error-banner');
const treeRoot = document.getElementById('tree-root');
const jsonPreview = document.getElementById('json-preview');
const nodeCountEl = document.getElementById('node-count');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const toast = document.getElementById('toast');

document.addEventListener('DOMContentLoaded', () => {
  render();
  setupEventListeners();
});

function setupEventListeners() {
  fileInput.addEventListener('change', handleFileSelect);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
  });

  dropZone.addEventListener('drop', handleDrop, false);

  btnCopy.addEventListener('click', copyToClipboard);
  btnDownload.addEventListener('click', downloadJSON);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (file.type !== "application/json" && !file.name.endsWith('.json')) {
    showError("Please select a valid .json file");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      currentData = parsed;
      fileInfo.textContent = `${file.name} (${formatBytes(file.size)})`;
      clearError();
      render();
      showToast("JSON loaded successfully");
    } catch (err) {
      showError("Invalid JSON structure: " + err.message);
    }
  };
  reader.readAsText(file);
}

function getNestedValue(obj, path) {
  let curr = obj;
  for (let i = 0; i < path.length; i++) {
    curr = curr[path[i]];
  }
  return curr;
}

function render() {
  treeRoot.innerHTML = '';
  let count = 0;

  function buildTree(obj, container, path = []) {
    for (const key in obj) {
      count++;
      const val = obj[key];
      const currentPath = [...path, key];
      const isObject = typeof val === 'object' && val !== null;

      if (isObject) {
        const isArray = Array.isArray(val);
        const branchHeader = document.createElement('div');
        branchHeader.className = 'tree-branch-header';

        const symbolSpan = document.createElement('span');
        symbolSpan.textContent = isArray ? '[]' : '{}';

        const keyTitleSpan = document.createElement('span');
        keyTitleSpan.textContent = key;

        branchHeader.appendChild(symbolSpan);
        branchHeader.appendChild(keyTitleSpan);

        const subContainer = document.createElement('div');
        subContainer.className = 'tree-node';

        if (isArray) {
          const addBtn = document.createElement('button');
          addBtn.type = 'button';
          addBtn.className = 'btn btn-secondary btn-small add-item-btn';
          addBtn.textContent = '+ Add';

          addBtn.onclick = () => {
            if (subContainer.querySelector('.array-add-row')) return;

            const addRow = document.createElement('div');
            addRow.className = 'array-add-row';

            const inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.className = 'array-add-input';
            inputEl.placeholder = 'Enter text item...';

            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'btn btn-primary btn-small';
            confirmBtn.textContent = 'Add';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-secondary btn-small';
            cancelBtn.textContent = 'Cancel';

            const commitItem = () => {
              const targetArray = getNestedValue(currentData, currentPath);
              if (Array.isArray(targetArray)) {
                targetArray.push(String(inputEl.value));
                render();
                showToast(`Added item to ${key}`);
              }
            };

            confirmBtn.onclick = commitItem;
            inputEl.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitItem();
              } else if (e.key === 'Escape') {
                addRow.remove();
              }
            });

            cancelBtn.onclick = () => addRow.remove();

            addRow.appendChild(inputEl);
            addRow.appendChild(confirmBtn);
            addRow.appendChild(cancelBtn);
            subContainer.prepend(addRow);
            inputEl.focus();
          };

          branchHeader.appendChild(addBtn);
        }

        container.appendChild(branchHeader);
        container.appendChild(subContainer);

        buildTree(val, subContainer, currentPath);
      } else {
        const item = document.createElement('div');
        item.className = 'tree-item';

        const keySpan = document.createElement('span');
        keySpan.className = 'tree-key';
        keySpan.textContent = key;

        const sepSpan = document.createElement('span');
        sepSpan.className = 'tree-separator';
        sepSpan.textContent = ':';

        const valSpan = document.createElement('span');
        valSpan.className = `tree-value type-${val === null ? 'null' : typeof val}`;
        valSpan.textContent = val === null ? 'null' : (typeof val === 'string' ? `"${val}"` : String(val));

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'type-badge';
        badgeSpan.textContent = val === null ? 'null' : typeof val;

        const actionCell = document.createElement('div');
        actionCell.className = 'edit-actions-cell';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-small';
        editBtn.textContent = 'Edit';

        editBtn.onclick = () => {
          if (editBtn.textContent === 'Edit') {
            editBtn.textContent = 'Save';
            editBtn.className = 'btn btn-primary btn-small';

            let inputEl;
            if (typeof val === 'boolean') {
              inputEl = document.createElement('select');
              inputEl.className = 'edit-select';
              inputEl.innerHTML = `<option value="true" ${val ? 'selected' : ''}>true</option><option value="false" ${!val ? 'selected' : ''}>false</option>`;
            } else {
              inputEl = document.createElement('input');
              inputEl.type = typeof val === 'number' ? 'number' : 'text';
              inputEl.className = 'edit-input';
              inputEl.value = val === null ? '' : val;
            }

            valSpan.replaceWith(inputEl);
            inputEl.focus();

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary btn-small';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => render();
            actionCell.appendChild(cancelBtn);
          } else {
            const inputEl = actionCell.parentElement.querySelector('.edit-input, .edit-select');
            let rawValue = inputEl.value;
            let typedValue;

            const originalType = typeof val;
            if (val === null) {
              typedValue = rawValue === '' ? null : rawValue;
            } else if (originalType === 'number') {
              typedValue = Number(rawValue);
            } else if (originalType === 'boolean') {
              typedValue = rawValue === 'true';
            } else {
              typedValue = String(rawValue);
            }

            setNestedValue(currentData, currentPath, typedValue);
            render();
            showToast(`Updated key: ${key}`);
          }
        };

        actionCell.appendChild(editBtn);

        item.appendChild(keySpan);
        item.appendChild(sepSpan);
        item.appendChild(valSpan);
        item.appendChild(badgeSpan);
        item.appendChild(actionCell);

        container.appendChild(item);
      }
    }
  }

  buildTree(currentData, treeRoot);
  jsonPreview.textContent = JSON.stringify(currentData, null, 2);
  nodeCountEl.textContent = `${count} fields tracked`;
}

function setNestedValue(obj, path, value) {
  let curr = obj;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]];
  }
  curr[path[path.length - 1]] = value;
}

function copyToClipboard() {
  const jsonString = JSON.stringify(currentData, null, 2);
  navigator.clipboard.writeText(jsonString).then(() => {
    showToast("JSON copied to clipboard!");
  }).catch(err => {
    showError("Failed to copy: " + err);
  });
}

function downloadJSON() {
  const jsonString = JSON.stringify(currentData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "updated_data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("File download started");
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}

function clearError() {
  errorBanner.textContent = '';
  errorBanner.style.display = 'none';
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}