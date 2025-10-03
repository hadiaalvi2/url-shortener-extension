document.getElementById("shortenBtn").addEventListener("click", async () => {
  const longUrl = document.getElementById("urlInput").value.trim();
  const output = document.getElementById("shortUrl");

  if (!longUrl) {
    output.textContent = "Please enter a URL";
    return;
  }

  try {
    
    const response = await fetch("https://cleanuri.com/api/v1/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "url=" + encodeURIComponent(longUrl)
    });

    const data = await response.json();

    if (data.result_url) {
      output.innerHTML = `Short URL: <a href="${data.result_url}" target="_blank">${data.result_url}</a>`;
      
      navigator.clipboard.writeText(data.result_url);
    } else {
      output.textContent = "❌ Failed to shorten URL";
    }
  } catch (err) {
    output.textContent = "❌ Error: " + err.message;
  }
});
