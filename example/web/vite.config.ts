import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import packageJson from "../../package.json";

export default defineConfig({
   plugins: [tailwindcss()],
   define: {
      __JAILJS_VERSION__: JSON.stringify(packageJson.version),
   },
});
