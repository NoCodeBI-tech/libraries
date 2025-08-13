import actionFunctions from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/component.actions.js";
import { NAME } from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/constants.js";

export const appMethod = {
    // evalExpression: function (value, item = {}) {
    //     const evaluate = (str) => {
    //         try {
    //             const result = eval(str.trim());
    //             return result !== undefined ? result : `{{${str}}}`;
    //         } catch (e) {
    //             console.warn("Evaluation error:", e.message);
    //             return `{{${str}}}`;
    //         }
    //     };

    //     const recursiveEval = (input) => {
    //         if (typeof input === "string") {
    //             return input.replace(/\{\{(.*?)\}\}/g, (_, expr) => evaluate(expr));
    //         }
    //         if (Array.isArray(input)) {
    //             return input.map(recursiveEval);
    //         }
    //         if (input && typeof input === "object") {
    //             return Object.fromEntries(Object.entries(input).map(([key, val]) => [key, recursiveEval(val)]));
    //         }
    //         return input;
    //     };

    //     return recursiveEval(value);
    // },
    getType: function (value) {
        if (window._.isString(value)) return "string";
        if (window._.isNumber(value)) return "number";
        if (window._.isBoolean(value)) return "boolean";
        if (window._.isArray(value)) return "array";
        if (window._.isFunction(value)) return "function";
        if (window._.isNull(value)) return "null";
        if (window._.isUndefined(value)) return "undefined";
        if (window._.isDate(value)) return "date";
        if (window._.isRegExp(value)) return "regexp";
        if (window._.isPlainObject(value)) return "object";
        return typeof value;
    },

    evalExpression: function (value, item = {}) {
        const evaluate = (str, isStandalone = false) => {
            try {
                const fn = new Function("item", `return ${str.trim()};`);
                const result = fn(item);
                if (isStandalone) return result;
                // For interpolation inside strings, always return a string
                return !window._.isUndefined(result)
                    ? window._.isString(result)
                        ? result
                        : String(result) // convert to string without quotes
                    : `{{${str}}}`;
            } catch (e) {
                console.warn("Evaluation error:", e.message);
                return `{{${str}}}`;
            }
        };

        const recursiveEval = (input) => {
            if (window._.isString(input)) {
                const standaloneMatch = input.match(/^\{\{(.*?)\}\}$/);
                if (standaloneMatch) {
                    const evaluated = evaluate(standaloneMatch[1], true);
                    return evaluated;
                }

                // Process mixed template strings
                if (/\{\{.*?\}\}/.test(input)) {
                    return input.replace(/\{\{(.*?)\}\}/g, (_, expr) => {
                        const evaluated = evaluate(expr);
                        return window._.isString(evaluated) ? evaluated : JSON.stringify(evaluated);
                    });
                }
                return input;
            }
            if (window._.isArray(input)) {
                return window._.map(input, recursiveEval);
            }
            if (window._.isPlainObject(input)) {
                return window._.mapValues(input, recursiveEval);
            }
            return input;
        };

        return recursiveEval(value);
    },

    getEventListeners: function (eventHandlers) {
        const eventObj = {};
        if (!eventHandlers || typeof eventHandlers !== "object") return eventObj;

        Object.entries(eventHandlers).forEach(([key, listeners]) => {
            eventObj[key] = {};
            listeners?.forEach((listener) => {
                if (typeof actionFunctions[listener.action] === "function") {
                    if (!eventObj[key][listener.event]) {
                        eventObj[key][listener.event] = [];
                    }
                    eventObj[key][listener.event].push((event) => actionFunctions[listener.action](listener, event));
                }
            });
            Object.keys(eventObj[key]).forEach((eventType) => {
                const handlers = eventObj[key][eventType];
                eventObj[key][eventType] = (event) => handlers.forEach((handler) => handler(event));
            });
        });

        return eventObj;
    },

    fetchHierarchyData: function (data, inputPath, aggregationKey) {
        const pathParts = inputPath ? inputPath.toLowerCase().split(".") : []; // Convert path to lowercase and split into parts
        let currentLevel = data;

        // Traverse the hierarchy based on the input path
        for (const part of pathParts) {
            const found = currentLevel?.find((item) => item.label.toLowerCase() === part);
            if (found && found.children) {
                currentLevel = found.children; // Move to the next level
            } else {
                return { x: [], y: [], xName: "unknown", yName: aggregationKey, drilldownPath: pathParts }; // Return empty arrays if the path is invalid
            }
        }

        // Collect x and y values for the children of the current level
        const xArray = [];
        const yArray = [];
        const xName = currentLevel?.length > 0 ? currentLevel[0].dim : "unknown"; // Use the dimension of the children

        currentLevel?.forEach((item) => {
            xArray.push(item.label); // Collect x-axis values
            yArray.push(parseFloat(item.aggregations[aggregationKey]?.value || 0)); // Collect y-axis values
        });

        return {
            x: xArray,
            y: yArray,
            xName: xName, // Name of the x-axis (dimension of the children)
            yName: aggregationKey, // Name of the y-axis
            drilldownPath: pathParts, // Include the drilldown path as an array
        };
    },

    createSeriesData: function (series, data) {
        if (!Array.isArray(series) || !Array.isArray(data)) return [];
        const seriesData = [];
        series.forEach((item) => {
            const { x, y } = item;
            if (!x || !y) return; // Skip invalid series entry
            const seriesPoints = data.map((d) => ({
                x: d[x],
                y: d[y],
            }));
            seriesData.push({
                name: y,
                data: seriesPoints.map((p) => p.y),
                xValues: seriesPoints.map((p) => p.x),
            });
        });
        const defaultX = series[0]?.x;
        const result = {
            series: seriesData,
            x: defaultX ? data.map((item) => item[defaultX]) : [],
            xName: defaultX || "",
        };
        return result;
    },

    getElement: function (componentName, selector, multiple = false) {
        if (!selector) return null;
        const doc = window.editor ? editor.Canvas.getDocument() : document;
        const cleanSelector = selector.startsWith("#") ? `[id^="${selector.slice(1)}"]` : selector.startsWith(".") ? `[class^="${selector.slice(1)}"]` : selector;
        const query = (ctx, sel) => (multiple ? ctx.querySelectorAll(sel) : ctx.querySelector(sel));
        return (
            query(doc, `[${NAME}="${componentName}"] ${cleanSelector}`) ||
            (() => {
                const base = doc.querySelector(`[${NAME}="${componentName}"]`);
                return base && query(base, cleanSelector);
            })() ||
            query(doc, cleanSelector)
        );
    },

    query: function (queryName) {
        if (queryName) {
            return top.source[queryName];
        } else {
            return null;
        }
    },

    concatStrings: (str1, str2, separator = "") => `${str1}${separator}${str2}`,

    // executeFunction: function (expr, item) {
    //     if (!expr.includes("$")) {
    //         return item[expr] || expr;
    //     }
    //     expr = expr.replaceAll("$", "appMethod.");
    //     try {
    //         return new Function(
    //             "appMethod",
    //             "item",
    //             `
    //             with (item) {
    //             return ${expr};
    //             }
    //         `
    //         )(this, item);
    //     } catch (e) {
    //         console.error("Expression evaluation error:", e);
    //         return "";
    //     }
    // },

    executeFunction: function (value, data = {}) {
        if (typeof value === "string" && !value.includes("$") && !value.includes("{{")) {
            return data[value];
        }

        const evaluate = (str) => {
            try {
                if (str.includes("$")) {
                    // Replace $ with appMethod references
                    str = str.replaceAll("$", "appMethod.");
                    // Dynamically evaluate the expression
                    return new Function(
                        "appMethod",
                        "data",
                        `
                    with (data) {
                        return ${str};
                    }
                `
                    )(this, data);
                } else {
                    // Evaluate plain JavaScript expressions
                    const result = eval(str.trim());
                    return result !== undefined ? result : `{{${str}}}`;
                }
            } catch (e) {
                console.error("Expression evaluation error:", e);
                return `{{${str}}}`; // Return the original expression in case of an error
            }
        };

        const recursiveEval = (input) => {
            if (typeof input === "string") {
                // Match and replace expressions like {{$...}} or raw $... expressions
                if (input.startsWith("$")) {
                    // Directly evaluate raw $-prefixed expressions
                    return evaluate(input);
                }
                return input.replace(/\{\{(.*?)\}\}/g, (_, expr) => evaluate(expr));
            }
            if (Array.isArray(input)) {
                return input.map(recursiveEval);
            }
            if (input && typeof input === "object") {
                return Object.fromEntries(Object.entries(input).map(([key, val]) => [key, recursiveEval(val)]));
            }
            return input;
        };

        return recursiveEval(value);
    },

    transformCode: function (transformCode, data) {
        try {
            if (transformCode.trim() === "return") {
                return data;
            }
            const fn = new Function("data", transformCode);
            return fn(data);
        } catch (error) {
            console.error("Transform code execution error:", error);
            return error.message;
        }
    },

    showModal: function (modalName) {
        const doc = window?.editor ? editor.Canvas.getDocument() : document;
        const modal = doc.querySelector(`[${NAME}="${modalName}"]`);
        if (modal) {
            modal.classList.remove("hidden");
            modal.setAttribute("aria-hidden", "false");
        } else {
            console.warn(`Modal with name "${modalName}" not found.`);
        }
    },

    hideModal: function (modalName, document = null) {
        const doc = document ? document : window?.editor ? editor.Canvas.getDocument() : document;
        const modal = doc.querySelector(`[${NAME}="${modalName}"]`);
        if (modal) {
            modal.classList.add("hidden");
            modal.setAttribute("aria-hidden", "true");
        } else {
            console.warn(`Modal with name "${modalName}" not found.`);
        }
    },
    toggleModal: function (modalName) {
        const doc = window?.editor ? editor.Canvas.getDocument() : document;
        const modal = doc.querySelector(`[${NAME}="${modalName}"]`);
        if (modal) {
            modal.classList.toggle("hidden");
        } else {
            console.warn(`Modal with name "${modalName}" not found.`);
        }
    },
};
