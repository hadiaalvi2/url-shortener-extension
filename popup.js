// Tab switching functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load history when history tab is opened
    if (tabName === 'history') {
      loadHistory();
    }
  });
});

// QR Code Generator Function
function generateQRCode(text) {
  const size = 200;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  return qrApiUrl;
}

// Native Share Function
window.nativeShare = async function(url) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Shortened URL',
        text: 'Check out this link!',
        url: url
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        alert('Share failed. Please try copying the link instead.');
      }
    }
  } else {
    alert('Native sharing is not supported in this browser. Please use the share icons or copy the link.');
  }
}

// QR Modal Function
window.showQRModal = function(url) {
  const modal = document.createElement('div');
  modal.className = 'qr-modal';
  modal.innerHTML = `
    <div class="qr-modal-content">
      <div class="qr-modal-header">
        <h3>QR</h3>
        <button class="qr-close-btn">&times;</button>
      </div>
      <div class="qr-modal-body">
        <img src="${generateQRCode(url)}" alt="QR Code" class="qr-code-img">
        <p class="qr-url">${url}</p>
        <button class="qr-download-btn">Download QR Code</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button
  modal.querySelector('.qr-close-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Download QR code
  modal.querySelector('.qr-download-btn').addEventListener('click', async () => {
    const qrUrl = generateQRCode(url);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download QR code. Please try right-clicking on the image and saving it.');
    }
  });
}

// URL Shortener functionality
document.getElementById("shortenBtn").addEventListener("click", async () => {
  const urlInput = document.getElementById("urlInput");
  const output = document.getElementById("shortUrl");
  const longUrl = urlInput.value.trim();

  if (!longUrl) {
    output.textContent = "Please enter a URL";
    return;
  }

  try {
    output.textContent = "Shortening...";

    let validUrl;
    try {
      validUrl = new URL(longUrl);
    } catch {
      output.textContent = "Invalid URL format";
      return;
    }

    const response = await fetch("https://cleanuri.com/api/v1/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "url=" + encodeURIComponent(validUrl.href),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (data.result_url) {
      output.innerHTML = `Short URL: <a href="${data.result_url}" target="_blank">${data.result_url}</a>`;

      // Show share icons with QR code and native share
      showShareIcons(data.result_url);

      // Save to history
      await saveToHistory(validUrl.href, data.result_url);

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(data.result_url);
        } else {
          const tempInput = document.createElement("input");
          tempInput.value = data.result_url;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          tempInput.remove();
        }
        output.innerHTML += `<br><small>Copied to clipboard!</small>`;
      } catch (err) {
        output.innerHTML += `<br><small>Copy failed: ${err.message}</small>`;
      }
    } else {
      output.textContent = "Failed to shorten URL. Try again.";
    }
  } catch (err) {
    output.textContent = "Error: " + err.message;
  }
});

// History Management
async function saveToHistory(originalUrl, shortUrl) {
  try {
    const result = await chrome.storage.local.get(['urlHistory']);
    let history = result.urlHistory || [];
    
    // Add new entry at the beginning
    history.unshift({
      id: Date.now(),
      originalUrl: originalUrl,
      shortUrl: shortUrl,
      date: new Date().toISOString()
    });
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await chrome.storage.local.set({ urlHistory: history });
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(['urlHistory']);
    const history = result.urlHistory || [];
    const container = document.getElementById('historyContainer');
    const clearBtn = document.getElementById('clearHistoryBtn');
    
    if (history.length === 0) {
      container.innerHTML = '<div class="history-empty">No history yet. Start shortening URLs!</div>';
      clearBtn.style.display = 'none';
      return;
    }
    
    clearBtn.style.display = 'block';
    
    container.innerHTML = history.map(item => {
      const date = new Date(item.date);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-date">${formattedDate}</div>
          <div class="history-item-original">Original: ${truncateUrl(item.originalUrl)}</div>
          <div class="history-item-short">Short: ${item.shortUrl}</div>
          <div class="history-item-actions">
            <button class="history-btn copy-btn" data-url="${item.shortUrl}">Copy</button>
            <button class="history-btn open-btn" data-url="${item.shortUrl}">Open</button>
            <button class="history-btn qr-btn" data-url="${item.shortUrl}">QR</button>
            <button class="history-btn delete" data-id="${item.id}">Delete</button>
          </div>
          <div class="history-share-icons">
            ${getHistoryShareIcons(item.shortUrl)}
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners for history actions
    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const url = e.target.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          const originalText = e.target.textContent;
          e.target.textContent = 'Copied!';
          setTimeout(() => {
            e.target.textContent = originalText;
          }, 1500);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      });
    });
    
    container.querySelectorAll('.open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        chrome.tabs.create({ url: url });
      });
    });

    container.querySelectorAll('.qr-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        window.showQRModal(url);
      });
    });
    
    container.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await deleteHistoryItem(id);
        await loadHistory();
      });
    });
    
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

async function deleteHistoryItem(id) {
  try {
    const result = await chrome.storage.local.get(['urlHistory']);
    let history = result.urlHistory || [];
    history = history.filter(item => item.id !== id);
    await chrome.storage.local.set({ urlHistory: history });
  } catch (err) {
    console.error('Failed to delete history item:', err);
  }
}

async function clearAllHistory() {
  try {
    await chrome.storage.local.set({ urlHistory: [] });
    await loadHistory();
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}

function truncateUrl(url, maxLength = 40) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// Clear history button
document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all history?')) {
    await clearAllHistory();
  }
});

// Load history on startup if history tab is active
if (document.getElementById('historyTab').classList.contains('active')) {
  loadHistory();
}

// Share functionality
function showShareIcons(url) {
  const shareSection = document.getElementById('shareSection');
  const shareIcons = document.getElementById('shareIcons');
  
  const encodedUrl = encodeURIComponent(url);
  const shareText = encodeURIComponent('Check out this link!');
  
  shareIcons.innerHTML = `
    <button class="share-icon native-share" title="Share" data-url="${url}">
      <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
    </button>
    <a href="https://wa.me/?text=${shareText}%20${encodedUrl}" target="_blank" class="share-icon whatsapp" title="WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </a>
    <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}" target="_blank" class="share-icon twitter" title="Twitter/X">
      <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-icon facebook" title="Facebook">
      <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    </a>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" class="share-icon linkedin" title="LinkedIn">
      <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    </a>
    <a href="https://t.me/share/url?url=${encodedUrl}&text=${shareText}" target="_blank" class="share-icon telegram" title="Telegram">
      <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
    </a>
    <a href="mailto:?subject=Check%20this%20out&body=${shareText}%20${encodedUrl}" class="share-icon email" title="Email">
      <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    </a>
    <a href="https://reddit.com/submit?url=${encodedUrl}&title=${shareText}" target="_blank" class="share-icon reddit" title="Reddit">
      <svg viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
    </a>
    <button class="share-icon copy" title="Copy Link" data-url="${url}">
      <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
    </button>
  `;
  
  shareSection.classList.add('visible');
  
  // Add event listeners
  const nativeShareBtn = shareIcons.querySelector('.native-share');
  if (nativeShareBtn) {
    nativeShareBtn.addEventListener('click', () => {
      window.nativeShare(nativeShareBtn.dataset.url);
    });
  }
  
  const copyBtn = shareIcons.querySelector('.copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      window.copyShareUrl(copyBtn.dataset.url);
    });
  }
}

window.copyShareUrl = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    const copyBtn = document.querySelector('.share-icon.copy');
    if (copyBtn) {
      const originalContent = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span style="font-size: 20px;">✓</span>';
      setTimeout(() => {
        copyBtn.innerHTML = originalContent;
      }, 1500);
    }
  });
}

function getHistoryShareIcons(url) {
  const encodedUrl = encodeURIComponent(url);
  const shareText = encodeURIComponent('Check out this link!');
  
  return `
    <button class="history-share-icon native-share" title="Share" data-url="${url}" style="background: #000; color: white; border: none; cursor: pointer;">
      <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
    </button>
    <a href="https://wa.me/?text=${shareText}%20${encodedUrl}" target="_blank" class="history-share-icon whatsapp" title="WhatsApp" style="background: #25D366; color: white;">
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </a>
    <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}" target="_blank" class="history-share-icon twitter" title="Twitter/X" style="background: #1DA1F2; color: white;">
      <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="history-share-icon facebook" title="Facebook" style="background: #1877F2; color: white;">
      <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    </a>
    <a href="https://t.me/share/url?url=${encodedUrl}&text=${shareText}" target="_blank" class="history-share-icon telegram" title="Telegram" style="background: #0088cc; color: white;">
      <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
    </a>
  `;
}

// Initialize history share buttons event listeners
document.addEventListener('click', function(e) {
  if (e.target.closest('.history-share-icon.native-share')) {
    const btn = e.target.closest('.history-share-icon.native-share');
    const url = btn.dataset.url;
    if (url) {
      window.nativeShare(url);
    }
  }
});   