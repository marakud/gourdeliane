import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un package.json/package-lock.json preexistant vit dans le dossier parent
  // (Cours/) pour un autre projet non lie -- on fixe explicitement la racine
  // pour eviter que Turbopack ne la detecte par erreur comme workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
