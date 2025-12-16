import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register PWA Service Worker
import "./registerSW";

createRoot(document.getElementById("root")!).render(<App />);
