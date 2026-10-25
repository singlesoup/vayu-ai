import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyTheme, bindSystemTheme } from "./lib/theme";
import "./styles/tokens.css";
import "./App.css";

applyTheme();
bindSystemTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
