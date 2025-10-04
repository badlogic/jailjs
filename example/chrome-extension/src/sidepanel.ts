const examples: Record<string, string> = {
   "Get Page Title": "document.title",

   "Count Links": `var links = document.querySelectorAll('a');
links.length + ' links found'`,

   "Highlight Links": `var links = document.querySelectorAll('a');
for (var i = 0; i < links.length; i++) {
  links[i].style.backgroundColor = 'yellow';
}
links.length + ' links highlighted'`,

   "Remove Images": `var images = document.querySelectorAll('img');
for (var i = 0; i < images.length; i++) {
  images[i].style.display = 'none';
}
images.length + ' images removed'`,

   "Auto-Scroll": `var scrollInterval = setInterval(function() {
  window.scrollBy(0, 2);
  if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
    clearInterval(scrollInterval);
  }
}, 10);
'Scrolling...'`,

   "Dark Mode": `var body = document.body;
if (body.style.filter === 'invert(1) hue-rotate(180deg)') {
  body.style.filter = '';
  'Dark mode disabled';
} else {
  body.style.filter = 'invert(1) hue-rotate(180deg)';
  'Dark mode enabled';
}`,
};

const codeTextarea = document.getElementById("code") as HTMLTextAreaElement;
const executeJailJSButton = document.getElementById("execute-jailjs") as HTMLButtonElement;
const executeEvalButton = document.getElementById("execute-eval") as HTMLButtonElement;
const executeScriptButton = document.getElementById("execute-script") as HTMLButtonElement;
const resultDiv = document.getElementById("result") as HTMLDivElement;
const resultContent = document.getElementById("result-content") as HTMLPreElement;

document.querySelectorAll(".example-btn").forEach((btn) => {
   btn.addEventListener("click", () => {
      const name = (btn as HTMLButtonElement).dataset.name;
      if (name && examples[name]) {
         codeTextarea.value = examples[name];
         codeTextarea.focus();
      }
   });
});

// Execute with JailJS sandbox
executeJailJSButton.addEventListener("click", () => executeCode("jailjs"));

// Execute with eval()
executeEvalButton.addEventListener("click", () => executeCode("eval"));

// Execute with <script> injection
executeScriptButton.addEventListener("click", () => executeCode("script"));

async function executeCode(mode: "jailjs" | "eval" | "script") {
   const code = codeTextarea.value.trim();

   if (!code) {
      showResult("Please enter some code", false);
      return;
   }

   const button = mode === "jailjs" ? executeJailJSButton : mode === "eval" ? executeEvalButton : executeScriptButton;

   button.disabled = true;
   button.textContent = "Executing...";

   try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
         throw new Error("No active tab found");
      }

      let response: any;
      try {
         response = await chrome.tabs.sendMessage(tab.id, {
            type: "EXECUTE_CODE",
            mode: mode,
            code: code,
         });
      } catch (_error) {
         // Content script not loaded, inject it
         await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
         });

         await new Promise((resolve) => setTimeout(resolve, 100));

         response = await chrome.tabs.sendMessage(tab.id, {
            type: "EXECUTE_CODE",
            mode: mode,
            code: code,
         });
      }

      if (response.success) {
         const modeLabel = mode === "jailjs" ? "[JailJS]" : mode === "eval" ? "[eval()]" : "[<script>]";
         showResult(`${modeLabel} ${formatResult(response.result)}`, true);
      } else {
         showResult(`Error: ${response.error}\n\n${response.stack || ""}`, false);
      }
   } catch (error: any) {
      let errorMsg = error.message;

      if (error.message.includes("Could not establish connection")) {
         errorMsg = "Could not connect to page. This page may not support extension scripts.";
      } else if (error.message.includes("Cannot access")) {
         errorMsg = "Cannot access this page. Extensions cannot run on chrome:// pages or the Chrome Web Store.";
      }

      showResult(`Error: ${errorMsg}`, false);
   } finally {
      button.disabled = false;
      button.textContent = mode === "jailjs" ? "JailJS Sandbox" : mode === "eval" ? "eval()" : "<script>";
   }
}

function formatResult(result: any): string {
   if (result === undefined) return "undefined";
   if (result === null) return "null";
   if (typeof result === "string") return result;
   if (typeof result === "object") {
      try {
         return JSON.stringify(result, null, 2);
      } catch {
         return String(result);
      }
   }
   return String(result);
}

function showResult(message: string, success: boolean) {
   resultDiv.classList.remove("hidden");
   resultContent.textContent = message;
   resultContent.className = success
      ? "font-mono text-sm text-green-700 whitespace-pre-wrap break-all"
      : "font-mono text-sm text-red-700 whitespace-pre-wrap break-all";
}

codeTextarea.addEventListener("keydown", (e) => {
   if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeJailJSButton.click();
   }
});
