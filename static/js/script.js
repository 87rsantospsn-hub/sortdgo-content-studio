const studioNameInput = document.querySelector('#studioName');
const instagramHandleInput = document.querySelector('#instagramHandle');
const themeSearchInput = document.querySelector('#themeSearch');
const suggestThemeBtn = document.querySelector('#suggestThemeBtn');
const suggestionsList = document.querySelector('#suggestionsList');
const seasonalChips = document.querySelector('#seasonalChips');
const popularChips = document.querySelector('#popularChips');
const selectedThemeCard = document.querySelector('#selectedThemeCard');
const selectedThemeText = document.querySelector('#selectedThemeText');
const clearThemeBtn = document.querySelector('#clearThemeBtn');
const uploadBox = document.querySelector('#uploadBox');
const photoInput = document.querySelector('#photoInput');
const photoPreview = document.querySelector('#photoPreview');
const photoPreviewImg = document.querySelector('#photoPreviewImg');
const removePhotoBtn = document.querySelector('#removePhotoBtn');
const formatCards = document.querySelector('#formatCards');
const styleChips = document.querySelector('#styleChips');
const toneChips = document.querySelector('#toneChips');
const useStyleToggle = document.querySelector('#useStyleToggle');
const extraContextInput = document.querySelector('#extraContext');
const openAiKeyInput = document.querySelector('#openAiKey');
const generateBtn = document.querySelector('#generateBtn');
const healthBadge = document.querySelector('#healthBadge');
const artTab = document.querySelector('#tab-art');
const captionTab = document.querySelector('#tab-caption');
const refineTab = document.querySelector('#tab-refine');
const tabButtons = document.querySelectorAll('.tab-button');
const artSpinner = document.querySelector('#artSpinner');
const resultImage = document.querySelector('#resultImage');
const artEmpty = document.querySelector('#artEmpty');
const captionOutput = document.querySelector('#captionOutput');
const copyCaptionBtn = document.querySelector('#copyCaptionBtn');
const regenerateCaptionBtn = document.querySelector('#regenerateCaptionBtn');
const refineInstruction = document.querySelector('#refineInstruction');
const refineBtn = document.querySelector('#refineBtn');
const refinePreviewImage = document.querySelector('#refinePreviewImage');
const saveHistoryBtn = document.querySelector('#saveHistoryBtn');
const newVersionBtn = document.querySelector('#newVersionBtn');
const downloadBtn = document.querySelector('#downloadBtn');

const formats = [
  'Feed 1:1',
  'Story 9:16',
  'Reels 9:16',
  'Carousel',
  'TikTok',
];

const styles = [
  'Fineline',
  'Blackwork',
  'Realism',
  'Old School',
  'Japanese',
  'Watercolor',
  'Geometric',
  'Neo Trad',
];

const tones = ['Inspirational', 'Educational', 'Humorous', 'Professional', 'Personal'];

let selectedTheme = '';
let selectedFormat = 'Feed 1:1';
let selectedStyle = 'Fineline';
let selectedTone = 'Inspirational';
let photoBase64 = '';
let currentPrompt = '';
let currentImageBase64 = '';

const historyKey = 'sortdgo_content_history';
const settingsKey = 'sortdgo_content_settings';
const API_BASE = window.API_BASE_URL || '';

function setHealth(status) {
  healthBadge.textContent = status;
}

function loadSettings() {
  const stored = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  if (stored.studioName) studioNameInput.value = stored.studioName;
  if (stored.instagramHandle) instagramHandleInput.value = stored.instagramHandle;
  if (stored.openAiKey) openAiKeyInput.value = stored.openAiKey;
}

function saveSettings() {
  localStorage.setItem(
    settingsKey,
    JSON.stringify({
      studioName: studioNameInput.value.trim(),
      instagramHandle: instagramHandleInput.value.trim(),
      openAiKey: openAiKeyInput.value.trim(),
    })
  );
}

function makeChart(url) {
  return url;
}

async function fetchThemes() {
  try {
    const response = await fetch(`${API_BASE}/api/themes`);
    const data = await response.json();
    renderThemeChips(data);
  } catch (error) {
    console.error('Failed to load themes', error);
  }
}

function renderThemeChips({ seasonal = [], popular = [] }) {
  seasonalChips.innerHTML = '';
  popularChips.innerHTML = '';
  seasonal.forEach((theme) => {
    const button = document.createElement('button');
    button.className = 'chip accent';
    button.textContent = theme;
    button.addEventListener('click', () => chooseTheme(theme));
    seasonalChips.appendChild(button);
  });
  popular.forEach((theme) => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.textContent = theme;
    button.addEventListener('click', () => chooseTheme(theme));
    popularChips.appendChild(button);
  });
}

function renderFormatCards() {
  formats.forEach((format) => {
    const button = document.createElement('button');
    button.className = 'format-card';
    button.textContent = format;
    if (format === selectedFormat) button.classList.add('active');
    button.addEventListener('click', () => {
      selectedFormat = format;
      document.querySelectorAll('.format-card').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
    formatCards.appendChild(button);
  });
}

function renderStyleChips() {
  styles.forEach((style) => {
    const button = document.createElement('button');
    button.className = 'style-chip';
    button.textContent = style;
    if (style === selectedStyle) button.classList.add('active');
    button.addEventListener('click', () => {
      selectedStyle = style;
      document.querySelectorAll('.style-chip').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
    styleChips.appendChild(button);
  });
}

function renderToneChips() {
  tones.forEach((tone) => {
    const button = document.createElement('button');
    button.className = 'tone-chip';
    button.textContent = tone;
    if (tone === selectedTone) button.classList.add('active');
    button.addEventListener('click', () => {
      selectedTone = tone;
      document.querySelectorAll('.tone-chip').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
    toneChips.appendChild(button);
  });
}

function chooseTheme(theme) {
  selectedTheme = theme;
  selectedThemeCard.hidden = false;
  selectedThemeText.textContent = theme;
}

function clearTheme() {
  selectedTheme = '';
  selectedThemeCard.hidden = true;
}

function showSuggestions(items) {
  suggestionsList.innerHTML = '';
  if (!items.length) {
    suggestionsList.textContent = 'No suggestions found.';
    return;
  }
  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.textContent = item;
    button.addEventListener('click', () => {
      chooseTheme(item);
      suggestionsList.innerHTML = '';
    });
    suggestionsList.appendChild(button);
  });
}

async function suggestTheme() {
  const query = themeSearchInput.value.trim();
  if (!query) return;
  setHealth('Suggesting themes…');
  try {
    const response = await fetch(`${API_BASE}/api/suggest-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    if (data.suggestions) {
      showSuggestions(data.suggestions);
      setHealth('Theme suggestions loaded');
    } else {
      throw new Error(data.error || 'Invalid response');
    }
  } catch (error) {
    console.error(error);
    setHealth('Unable to suggest themes');
  }
}

function setLoading(active) {
  artSpinner.hidden = !active;
  if (active) {
    artEmpty.textContent = 'Generating content…';
  } else {
    artEmpty.textContent = currentImageBase64 ? '' : 'No art yet. Generate content to preview.';
  }
}

function updateArtPreview(base64) {
  if (base64) {
    resultImage.src = `data:image/png;base64,${base64}`;
    resultImage.hidden = false;
    artEmpty.hidden = true;
    refinePreviewImage.src = resultImage.src;
    currentImageBase64 = base64;
  } else {
    resultImage.hidden = true;
    artEmpty.hidden = false;
  }
}

async function generateCaption() {
  const payload = {
    theme: selectedTheme || themeSearchInput.value.trim() || 'Fresh ink',
    tone: selectedTone,
    handle: instagramHandleInput.value.trim() || '@understairsink',
    studio_name: studioNameInput.value.trim() || 'Understairs Ink',
    extra_context: extraContextInput.value.trim(),
  };
  try {
    const response = await fetch(`${API_BASE}/api/generate-caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.caption) {
      captionOutput.textContent = data.caption;
    } else {
      captionOutput.textContent = `Error: ${data.error || 'Unable to generate caption'}`;
    }
  } catch (error) {
    console.error(error);
    captionOutput.textContent = 'Failed to generate caption.';
  }
}

async function generateContent() {
  const openAiKey = openAiKeyInput.value.trim();
  if (!openAiKey) {
    alert('Enter your OpenAI API key first.');
    return;
  }

  const payload = {
    theme: selectedTheme || themeSearchInput.value.trim() || 'Fresh ink',
    studio_name: studioNameInput.value.trim() || 'Understairs Ink',
    handle: instagramHandleInput.value.trim() || '@understairsink',
    format: selectedFormat,
    style: selectedStyle,
    use_style: useStyleToggle.checked,
    tone: selectedTone,
    extra_context: extraContextInput.value.trim(),
    photo_base64: photoBase64,
  };
  currentPrompt = '';
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/api/generate-art`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-Key': openAiKey,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.image_base64) {
      updateArtPreview(data.image_base64);
      currentPrompt = data.prompt || '';
      setHealth('Art generated');
      await generateCaption();
    } else {
      throw new Error(data.error || 'No art returned');
    }
  } catch (error) {
    console.error(error);
    setHealth('Art generation failed');
    artEmpty.textContent = 'Art generation failed. Check console for details.';
  } finally {
    setLoading(false);
  }
}

async function refineArt() {
  const instruction = refineInstruction.value.trim();
  const openAiKey = openAiKeyInput.value.trim();
  if (!currentImageBase64) {
    alert('Generate art before refining.');
    return;
  }
  if (!instruction) {
    alert('Add a refinement instruction.');
    return;
  }
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/api/refine-art`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-Key': openAiKey,
      },
      body: JSON.stringify({
        current_art_base64: currentImageBase64,
        instruction,
        current_prompt: currentPrompt,
        format: selectedFormat,
      }),
    });
    const data = await response.json();
    if (data.image_base64) {
      updateArtPreview(data.image_base64);
      currentPrompt = data.prompt || currentPrompt;
      setHealth('Art refined');
    } else {
      throw new Error(data.error || 'No art returned');
    }
  } catch (error) {
    console.error(error);
    setHealth('Refinement failed');
    artEmpty.textContent = 'Refinement failed. Check console for details.';
  } finally {
    setLoading(false);
  }
}

function saveHistory() {
  if (!currentImageBase64) {
    alert('Generate art before saving history.');
    return;
  }
  const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const record = {
    theme: selectedTheme || themeSearchInput.value.trim() || 'Fresh ink',
    format: selectedFormat,
    caption: captionOutput.textContent,
    art: currentImageBase64,
    date: new Date().toISOString(),
  };
  existing.unshift(record);
  localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));
  setHealth('Saved to history');
}

function newVersion() {
  resultImage.src = '';
  resultImage.hidden = true;
  artEmpty.hidden = false;
  artEmpty.textContent = 'No art yet. Generate content to preview.';
  captionOutput.textContent = 'Your caption will appear here.';
  refineInstruction.value = '';
  currentImageBase64 = '';
  currentPrompt = '';
  refinePreviewImage.src = '';
  setHealth('Ready for a new version');
}

function downloadArt() {
  if (!currentImageBase64) {
    alert('Generate art before downloading.');
    return;
  }
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${currentImageBase64}`;
  link.download = 'sortdgo-tattoo-art.png';
  link.click();
}

function copyCaption() {
  navigator.clipboard.writeText(captionOutput.textContent).then(() => {
    setHealth('Caption copied');
  });
}

function attachDropHandlers() {
  uploadBox.addEventListener('click', () => photoInput.click());
  uploadBox.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadBox.classList.add('dragging');
  });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragging'));
  uploadBox.addEventListener('drop', async (event) => {
    event.preventDefault();
    uploadBox.classList.remove('dragging');
    const file = event.dataTransfer.files[0];
    if (file) {
      await loadPhoto(file);
    }
  });
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (file) await loadPhoto(file);
  });
  removePhotoBtn.addEventListener('click', () => {
    photoBase64 = '';
    photoPreview.hidden = true;
    photoPreviewImg.src = '';
    photoInput.value = '';
  });
}

function handleTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      document.querySelectorAll('.tab-content').forEach((panel) => panel.classList.remove('active'));
      document.querySelector(`#tab-${button.dataset.tab}`).classList.add('active');
    });
  });
}

async function loadPhoto(file) {
  const reader = new FileReader();
  reader.onload = () => {
    photoBase64 = reader.result.split(',')[1];
    photoPreviewImg.src = reader.result;
    photoPreview.hidden = false;
  };
  reader.readAsDataURL(file);
}

function attachEvents() {
  suggestThemeBtn.addEventListener('click', suggestTheme);
  themeSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      suggestTheme();
    }
  });
  clearThemeBtn.addEventListener('click', clearTheme);
  generateBtn.addEventListener('click', async () => {
    saveSettings();
    await generateContent();
  });
  copyCaptionBtn.addEventListener('click', copyCaption);
  regenerateCaptionBtn.addEventListener('click', generateCaption);
  refineBtn.addEventListener('click', refineArt);
  saveHistoryBtn.addEventListener('click', saveHistory);
  newVersionBtn.addEventListener('click', newVersion);
  downloadBtn.addEventListener('click', downloadArt);
  [studioNameInput, instagramHandleInput, openAiKeyInput].forEach((input) => {
    input.addEventListener('blur', saveSettings);
  });
}

function init() {
  loadSettings();
  fetchThemes();
  renderFormatCards();
  renderStyleChips();
  renderToneChips();
  attachDropHandlers();
  attachEvents();
  handleTabs();
  setHealth('Ready');
}

window.addEventListener('DOMContentLoaded', init);
