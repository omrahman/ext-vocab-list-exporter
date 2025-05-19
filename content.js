// Log when content script is loaded
function printTranslateLinks() {
  const results = [];
  
  // SpanishDict specific selectors
  const translationLinks = document.querySelectorAll('a[href*="/translate/"]');
  
  translationLinks.forEach(link => {
    // SpanishDict specific structure - looking for direct text nodes and spans
    const spanishText = link.querySelector('span[lang="es"]')?.textContent.trim() || 
                       link.querySelector('.word')?.textContent.trim() || 
                       link.childNodes[0]?.textContent.trim() || '';
    
    const englishText = link.querySelector('span[lang="en"]')?.textContent.trim() || 
                       link.querySelector('.translation')?.textContent.trim() || 
                       link.childNodes[1]?.textContent.trim() || '';
    
    if (spanishText || englishText) {
      results.push({
        spanish: spanishText,
        english: englishText,
        link: link.href
      });
    }
  });
  
  return results;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findTranslateLinks') {
    try {
      const results = printTranslateLinks();
      sendResponse(results);
    } catch (error) {
      console.error('Error in printTranslateLinks:', error);
      sendResponse({ error: error.message });
    }
  }
  return true; // Required for async sendResponse
}); 