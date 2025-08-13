// This file contains functions related to alert management, such as displaying alerts to the user when errors occur during data fetching or processing.

const showAlert = ({ type, title, description }) => {
    // Implementation for displaying alerts to the user
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <strong>${title}</strong>
        <p>${description}</p>
    `;

    alertContainer.appendChild(alertElement);

    // Automatically remove the alert after a timeout
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
};

export { showAlert };