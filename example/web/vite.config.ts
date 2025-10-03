import { defineConfig } from "vite";
import packageJson from "../../package.json";

export default defineConfig({
   define: {
      __JAILJS_VERSION__: JSON.stringify(packageJson.version),
   },
});
