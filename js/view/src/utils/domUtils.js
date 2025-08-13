// This file contains utility functions for manipulating the DOM, such as getting and setting attributes, injecting scripts and styles, and cloning elements.

const getAttributes = (component) => {
    return Array.from(component.attributes).reduce((attrAcc, attr) => {
        attrAcc[attr.name] = attr.value;
        return attrAcc;
    }, {});
};

const addAttributes = (element, attributes) => {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
};

const setAttributes = (element, attributes) => {
    Array.from(element.attributes).forEach((attr) => {
        element.removeAttribute(attr.name);
    });
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
};

const injectScript = async ({ src, isInline = false, content = "", document = null }) => {
    return new Promise((resolve, reject) => {
        const doc = document ? document : window.document;
        const script = doc.createElement("script");
        script.type = "text/javascript";
        if (isInline) {
            script.textContent = content;
            doc.head.appendChild(script);
            resolve();
        } else {
            script.src = src;
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${src}`));
            };
            doc.head.appendChild(script);
        }
    });
};

const injectStyle = async ({ href, isInline = false, content = "", document = null }) => {
    return new Promise((resolve, reject) => {
        const doc = document ? document : window.document;
        if (isInline) {
            const style = doc.createElement("style");
            style.textContent = content;
            doc.head.appendChild(style);
            resolve(); // Resolve immediately for inline styles
        } else {
            const link = doc.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = () => {
                resolve(); // Resolve the promise when the style is loaded
            };
            link.onerror = () => {
                reject(new Error(`Failed to load style: ${href}`)); // Reject the promise on error
            };

            doc.head.appendChild(link);
        }
    });
};

export { getAttributes, addAttributes, setAttributes, injectScript, injectStyle };