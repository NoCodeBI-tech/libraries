import { setLoading } from "./managers/alertManager.js";
import { handlePageLoad } from "./managers/loadManager.js";
import { initializeLottieAnimation } from "./utils/domUtils.js";

// Entry point of the application
document.addEventListener("DOMContentLoaded", async () => {
    initializeLottieAnimation("[data-loading-canvas]");
    await handlePageLoad();
    setLoading(false);
});
