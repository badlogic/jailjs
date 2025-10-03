import { Jail } from "@mariozechner/jailjs";

// Example placeholder
const examplesDiv = document.getElementById("examples");

if (examplesDiv) {
   const example = document.createElement("div");
   example.className = "example";
   example.innerHTML = `
      <h2>Example 1: Basic Usage</h2>
      <div class="output">
         <pre>TODO: Implement JailJS demo</pre>
      </div>
   `;
   examplesDiv.appendChild(example);

   // Test that Jail class is available
   const jail = new Jail();
   console.log("JailJS initialized:", jail);
}
