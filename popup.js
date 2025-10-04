document.getElementById("shortenBtn").addEventListener("click", async () => {
  const urlInput = document.getElementById("urlInput");
  const output = document.getElementById("shortUrl");
  const longUrl = urlInput.value.trim();

  if (!longUrl) {
    output.textContent = " Please enter a URL";
    return;
  }

  try {
    output.textContent = " Shortening...";

   
    let validUrl;
    try {
      validUrl = new URL(longUrl);
    } catch {
      output.textContent = " Invalid URL format";
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
        output.innerHTML += `<br><small> Copied to clipboard!</small>`;
      } catch (err) {
        output.innerHTML += `<br><small>Copy failed: ${err.message}</small>`;
      }
    } else {
      output.textContent = " Failed to shorten URL. Try again.";
    }
  } catch (err) {
    output.textContent = " Error: " + err.message;
  }
});
