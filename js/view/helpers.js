import { SERVER_IP } from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/constants.js";
import { DotLottie } from "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm";
import axios from "https://cdn.jsdelivr.net/npm/axios@1.9.0/+esm";
/**
 * Generates a UUID (Universally Unique Identifier) using the browser's crypto API.
 *
 * @returns {string} A randomly generated UUID.
 */
export const generateUUID = () => {
    return window.crypto.randomUUID();
};

/**
 * Creates a debounced function that delays invoking the provided function until after the specified wait time has elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} - Returns the new debounced function.
 */
export const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

/**
 * Formats a given timestamp into a specified format.
 *
 * @param {number|string|Date} timestamp - The timestamp to format. Can be a number, string, or Date object.
 * @param {string} [format="YYYY-MM-DD HH:mm:ss A"] - The format string to use. Defaults to "YYYY-MM-DD HH:mm:ss A".
 * @returns {string} The formatted date string.
 */
export const formatDate = (timestamp, format = "YYYY-MM-DD HH:mm:ss A") => {
    return moment(timestamp).format(format);
};

/**
 * Converts a date to a timestamp.
 *
 * @param {Date|string|number} date - The date to convert. Can be a Date object, a string, or a number.
 * @returns {number} The timestamp value of the given date.
 */
export const dateToTimestamp = (date) => {
    return moment(date).valueOf();
};

/**
 * Converts an image file to a Base64 string.
 *
 * @param {Object} params - The parameters for the function.
 * @param {File} params.file - The image file to be converted.
 * @param {number} [params.fileSize=null] - The maximum allowed file size in KB. If the file size exceeds this limit, the function will reject the promise.
 * @returns {Promise<string>} A promise that resolves to the Base64 string of the image file.
 * @throws {Error} If the file size exceeds the limit or the file type is invalid.
 */
export const imageToBase64String = ({ file, fileSize = null, acceptType = ["image/png", "image/jpeg"] }) => {
    return new Promise((resolve, reject) => {
        // Get the first selected file
        if (file) {
            if (fileSize && file.size > fileSize * 1024) {
                alert(`File size should be less than ${fileSize}KB`);
                return reject(new Error("File size exceeds limit"));
            }
            if (!acceptType.includes(file.type)) {
                alert("File type should be image/jpeg or image/png");
                return reject(new Error("Invalid file type"));
            }

            const reader = new FileReader();

            reader.onload = () => {
                const base64String = reader.result; // The Base64 string of the file
                resolve(base64String);
            };

            reader.onerror = () => {
                console.error("Failed to read file as Base64");
                reject(new Error("Failed to read file"));
            };

            reader.readAsDataURL(file); // Convert the file to a Base64 string
        } else {
            alert("No file selected");
            reject(new Error("No file selected"));
        }
    });
};

/**
 * Makes an HTTP request using axios.
 *
 * @param {Object} options - The options for the request.
 * @param {string} options.method - The HTTP method ('get', 'post', 'put', 'delete').
 * @param {string} options.url - The URL for the request.
 * @param {Object} [options.data={}] - The data for POST/PUT requests, can be null for GET/DELETE.
 * @param {Object} [options.headers={}] - The default headers for the request.
 * @param {Object} [options.isLoading={}] - Vue's loading state object.
 * @param {string} [options.loading=""] - The key for the specific loading state (e.g., 'createNewInstanceLoading').
 * @param {number} [options.timeout=5000] - The timeout for the request in milliseconds.
 * @returns {Promise<Array>} A promise that resolves to an array containing the response data, error message, status, and message.
 */
export const makeRequest = async ({
    method, // HTTP method ('get', 'post', 'put', 'delete')
    url,
    data = {}, // Data for POST/PUT request, can be null for GET/DELETE
    headers = {}, // Default headers
    isLoading = {}, // Vue's loading state object
    loading = "", // Key for the specific loading state (e.g., 'createNewInstanceLoading')
    timeout = 10000, // Timeout in milliseconds
    onUploadProgress = null,
}) => {
    isLoading[loading] = true;
    try {
        let response;
        const config = { headers: { "Content-Type": "application/json", ...headers }, timeout };

        // Add onUploadProgress to config if provided
        if (onUploadProgress) {
            config.onUploadProgress = onUploadProgress;
        }

        if (method === "get") {
            response = await axios.get(`${SERVER_IP}${url}`, config);
        } else if (method === "post") {
            response = await axios.post(`${SERVER_IP}${url}`, data, config);
        } else if (method === "put") {
            response = await axios.put(`${SERVER_IP}${url}`, data, config);
        } else if (method === "delete") {
            response = await axios.delete(`${SERVER_IP}${url}`, config);
        } else {
            throw new Error("Unsupported HTTP method");
        }
        if (response.status === 200) {
            const parsedData = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            const { status, data, message, transaction } = parsedData;
            if (status === "SUCCESS") {
                return [data, null, status, message, transaction];
            } else if (status === "REDIRECT") {
                if (data?.target === "_blank") window.open(data?.url, "_blank");
                else window.location.href = data?.url;
                return [data, null, status, message, transaction];
            } else if (status === "ERROR") {
                return [null, message, status, message, transaction];
            } else {
                return [response.data, null, status, message, transaction];
            }
        }
        return [null, `Unexpected status code: ${response.status}`, "ERROR", "Unexpected response", {}];
    } catch (error) {
        console.error("Request failed:", error.message);
        return [null, error.response ? error.response.data : error.message, "ERROR", error.message, {}];
    } finally {
        isLoading[loading] = false;
    }
};

/**
 * Creates a resizable element using the interact.js library.
 *
 * @param {string} selector - The CSS selector of the element to make resizable.
 * @param {Object} [options={}] - Configuration options for resizing.
 * @param {boolean} [options.width=false] - Whether to allow horizontal resizing.
 * @param {boolean} [options.height=false] - Whether to allow vertical resizing.
 * @param {Object} [options.edges={ top: false, left: false, bottom: false, right: false }] - Specifies which edges of the element can be resized.
 * @param {boolean} [options.edges.top=false] - Whether the top edge can be resized.
 * @param {boolean} [options.edges.left=false] - Whether the left edge can be resized.
 * @param {boolean} [options.edges.bottom=false] - Whether the bottom edge can be resized.
 * @param {boolean} [options.edges.right=false] - Whether the right edge can be resized.
 * @param {number} [options.minWidth=0] - The minimum width of the element.
 * @param {number} [options.maxWidth=500] - The maximum width of the element.
 * @param {number} [options.minHeight=0] - The minimum height of the element.
 * @param {number} [options.maxHeight=window.innerHeight] - The maximum height of the element.
 * @returns {Object} - The interact.js instance for the resizable element.
 */
export const createResizable = (selector, options = {}) => {
    const { width = false, height = false, edges = { top: false, left: false, bottom: false, right: false }, minWidth = 0, maxWidth = 500, minHeight = 0, maxHeight = window.innerHeight } = options;

    return interact(selector)
        .resizable({
            edges,
            inertia: true,
            restrictEdges: {
                outer: "parent",
                endOnly: true,
            },
            restrictSize: {
                min: {
                    width: width ? minWidth : undefined,
                    height: height ? minHeight : undefined,
                },
                max: {
                    width: width ? maxWidth : undefined,
                    height: height ? maxHeight : undefined,
                },
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            let x = parseFloat(target.dataset.x) || 0;
            let y = parseFloat(target.dataset.y) || 0;

            // Update width
            if (width) {
                target.style.width = `${event.rect.width}px`;
            }

            // Update height
            if (height) {
                target.style.height = `${Math.max(minHeight, Math.min(event.rect.height, maxHeight))}px`;
            }

            // Prevent unwanted upward shifting when resizing height
            let newY = y;
            if (!edges.top) {
                newY += event.deltaRect.top; // Only update y when not resizing from the top
            }

            target.style.transform = `translate(${x}px, ${newY}px)`;
            target.dataset.x = x;
            target.dataset.y = newY;
        });
};

/**
 * Creates a jsTree instance with the specified configuration and binds event handlers.
 *
 * @param {Object} params - The parameters for creating the jsTree.
 * @param {HTMLElement} params.el - The DOM element to attach the jsTree to.
 * @param {Array} params.data - The data to populate the jsTree with.
 * @param {string} [params.icon="hgi-stroke hgi-folder-01"] - The default icon for tree nodes.
 * @returns {Object} An object containing the jsTree instance and methods to handle events.
 * @returns {Object} return.tree - The jsTree instance.
 * @returns {Function} return.onCreate - Binds a callback to the "create_node.jstree" event.
 * @returns {Function} return.onMove - Binds a callback to the "move_node.jstree" event.
 * @returns {Function} return.onRename - Binds a callback to the "rename_node.jstree" event.
 * @returns {Function} return.onDelete - Binds a callback to the "delete_node.jstree" event.
 * @returns {Function} return.onSelect - Binds a callback to the "select_node.jstree" event.
 * @returns {Function} return.getJson - Retrieves the JSON representation of the jsTree.
 */
export const createJsTree = ({ el, data, icon = "hgi-stroke hgi-folder-01" }) => {
    const tree = $(el).jstree({
        core: {
            data,
            themes: {
                responsive: true,
            },
            check_callback: true,
            open_all: true,
        },
        plugins: ["contextmenu", "dnd", "search", "state", "types", "wholerow"],
        types: {
            default: {
                icon,
            },
            file: {
                icon: "hgi-stroke hgi-file-01",
            },
        },
    });
    // Event binding
    const eventHandlers = {
        onCreate: (callback) => {
            tree.on("create_node.jstree", (e, data) => {
                const newId = generateUUID();
                tree.jstree("set_id", data.node, newId);
                data.node.fromCreate = true;
                tree.jstree("rename_node", data.node, `class${generateUUID().split("-")[0]}`);
                callback(e, data);
            });
        },
        onMove: (callback) => tree.on("move_node.jstree", callback),
        onRename: (callback) => tree.on("rename_node.jstree", callback),
        onDelete: (callback) => tree.on("delete_node.jstree", callback),
        onSelect: (callback) => tree.on("select_node.jstree", callback),
        onCopy: (callback) => tree.on("copy_node.jstree", callback),
        getJson: (callback) => callback(tree.jstree("get_json")),
    };
    // Return tree with methods to handle events
    return { tree, ...eventHandlers };
};

/**
 * Parses a CSS string and converts it into a JavaScript object.
 *
 * @param {string} css - The CSS string to parse.
 * @returns {Object} A JavaScript object representation of the CSS.
 *
 * @example
 * const cssString = `
 *   .class1 {
 *     color: red;
 *     font-size: 14px;
 *   }
 *   #id1 {
 *     margin: 10px;
 *   }
 * `;
 * const parsedCSS = parseCSS(cssString);
 * console.log(parsedCSS);
 * // Output:
 * // {
 * //   ".class1": {
 * //     "color": "red",
 * //     "font-size": "14px"
 * //   },
 * //   "#id1": {
 * //     "margin": "10px"
 * //   }
 * // }
 */
export const parseCSS = (css) => {
    const obj = {};

    const regex = /([^{]+)\s*{\s*([^}]+)\s*}/g;
    let match;

    while ((match = regex.exec(css)) !== null) {
        const selector = match[1].trim();
        const properties = match[2]
            .trim()
            .split(";")
            .reduce((acc, rule) => {
                if (rule) {
                    const [property, value] = rule.split(":").map((str) => str.trim());
                    acc[property] = value;
                }
                return acc;
            }, {});

        obj[selector] = properties;
    }

    return obj;
};

/**
 * Parses a string of JavaScript code and converts it into an object.
 *
 * @param {string} jsCode - The JavaScript code as a string.
 * @returns {Object} The parsed JavaScript object. If parsing fails, returns an empty object.
 * @throws Will log an error to the console if the JavaScript code cannot be parsed.
 */
export const parseJsCode = (jsCode) => {
    const fixedJs = jsCode.replace(/(\w+)\s*:/g, '"$1":'); // Make keys strings
    try {
        return eval(`(${fixedJs})`); // Safely evaluate the fixed JS code as an object
    } catch (e) {
        console.error("Error parsing JS:", e);
        return {};
    }
};

/**
 * Retrieves the value of a query parameter from the URL.
 *
 * This function first attempts to get the query parameter from the parent window's URL
 * if the current window is an iframe. If the parameter is not found, it then tries to get
 * the query parameter from the current window's URL.
 *
 * @param {string} param - The name of the query parameter to retrieve.
 * @returns {string|null} The value of the query parameter, or null if the parameter is not found.
 */
export const getQueryParam = (param) => {
    let value = null;
    if (window.parent && window.parent !== window) {
        value = new URLSearchParams(window.parent.location.search).get(param);
    }
    if (!value) {
        value = new URLSearchParams(window.location.search).get(param);
    }
    return value;
};

/**
 * Retrieves all query parameters from the current URL as an object.
 *
 * @returns {Object} An object containing all query parameters as key-value pairs.
 */
export const getAllQueryParams = () => {
    const urlParams = new URLSearchParams(window.parent?.location.search || window.location.search);
    return Object.fromEntries(urlParams.entries());
};

/**
 * Sets query parameters in the URL.
 *
 * @param {Object} params - An object containing key-value pairs to be set as query parameters.
 * @param {boolean} [keepPrevious=false] - A boolean indicating whether to keep existing query parameters.
 */
export const setQueryParam = (params, keepPrevious = false) => {
    const url = new URL(window?.parent?.location || window.location);
    if (!keepPrevious) {
        url.search = ""; // Clear existing query params if not keeping previous
    }
    Object.entries(params).forEach(([key, value]) => {
        if (value != null) {
            url.searchParams.set(key, value);
        }
    });
    (window.parent && window.parent !== window ? window.parent : window).history.pushState({}, "", url);
};

/**
 * Removes a query parameter from the current URL.
 *
 * @param {string} key - The key of the query parameter to remove.
 */
export const removeQueryParam = (key) => {
    const url = new URL(window?.parent?.location || window.location);
    url.searchParams.delete(key);
    (window.parent && window.parent !== window ? window.parent : window).history.pushState({}, "", url);
};

/**
 * Initializes a Lottie animation on the specified HTML element.
 *
 * @param {string} [element="#loadingAnimation"] - The CSS selector of the HTML element where the Lottie animation will be rendered.
 *
 * @throws Will log an error to the console if the Lottie animation fails to initialize.
 */
export const initializeLottieAnimation = (element = "#loadingAnimation") => {
    //  const file = require("/assets/lottie/loading.json");
    try {
        new DotLottie({
            autoplay: true,
            loop: true,
            canvas: document.querySelector(element),
            src: "https://lottie.host/93a5b970-6966-4a0f-b482-f6dc887e0e62/YN4prQyMwR.json",
        });
    } catch (e) {
        console.error("Failed to initialize Lottie");
    }
};

/**
 * Converts a hex color code to an HSL color value.
 *
 * @param {string} color - The hex color code (e.g., "#RRGGBB").
 * @returns {string} The HSL color value in the format "H, S%, L%".
 */
export const convertHexToHsl = (color) => {
    var r = parseInt(color.slice(1, 3), 16) / 255;
    var g = parseInt(color.slice(3, 5), 16) / 255;
    var b = parseInt(color.slice(5, 7), 16) / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var s = 0;
    var h = 0;

    if (max != min) {
        s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
        switch (max) {
            case r:
                h = (g - b) / (max - min) + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / (max - min) + 2;
                break;
            case b:
                h = (r - g) / (max - min) + 4;
                break;
        }
        h *= 60;
        s *= 100;
        l *= 100;
    }

    return `${h.toFixed(2)}, ${s.toFixed(2)}%, ${l.toFixed(2)}%`;
};

// export function sanitizeData(data, returnPlainObject = true) {
//     try {
//         const serialized = flatted.stringify(data);
//         return returnPlainObject ? flatted.parse(serialized) : serialized;
//     } catch (err) {
//         console.error("Failed to sanitize data:", err);
//         return {};
//     }
// }

export function sanitizeData(obj) {
    const seen = new WeakSet();
    function deepCloneSafe(value) {
        if (value && typeof value === "object") {
            if (seen.has(value)) return undefined;
            seen.add(value);
            if (Array.isArray(value)) {
                return value.map(deepCloneSafe);
            }
            const clone = {};
            for (const [key, val] of Object.entries(value)) {
                if (key === "ctx") continue;
                clone[key] = deepCloneSafe(val);
            }
            return clone;
        }
        return value;
    }

    return deepCloneSafe(obj);
}
