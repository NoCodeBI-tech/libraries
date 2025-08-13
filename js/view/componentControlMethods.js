import { NAME } from "https://github.com/NoCodeBI-tech/libraries/blob/main/js/view/constants.js";
import { appMethod } from "https://github.com/NoCodeBI-tech/libraries/blob/main/js/view/common.methods.js";

const getElement = (component) => {
    const document = window.editor ? window.editor.Canvas?.getDocument() : window.document;
    return document.querySelector(`[${NAME}=${component}]`);
};

function safeMethod(fn) {
    return function (args) {
        try {
            return fn.call(this, args);
        } catch (e) {
            console.error(`Error in method: ${fn.name || "anonymous"}`, e, args);
        }
    };
}

export default {
    setValue: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        let result = appMethod.evalExpression(options[0].value);
        try {
            result = eval(result);
        } catch (e) {
        } finally {
            window.component[targetComponent].value = result;
        }
    }),

    scrollIntoView: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    scrollToIndex: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const index = Number(appMethod.evalExpression(options[0].value));
            const children = el.children;
            if (!isNaN(index) && children && children.length > index && index >= 0) {
                children[index].scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                console.warn(`Invalid index (${index}) or no child at that index for ${NAME}="${targetComponent}".`);
            }
        }
    }),

    setHidden: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            el.style.display = options[0].value ? "none" : "";
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    setDisabled: safeMethod(function (args) {
        const { targetComponent, options } = args;
        const el = getElement(targetComponent);
        if (el) {
            const disabled = options[0].value;
            el.disabled = disabled;
            el.style.pointerEvents = disabled ? "none" : "";
            const disableEl = el.querySelectorAll("input, textarea, select, button, fieldset");
            disableEl.forEach((item) => {
                item.disabled = disabled;
                item.style.pointerEvents = disabled ? "none" : "";
            });
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    blur: safeMethod(function (args) {
        const { targetComponent } = args;
        const el = getElement(targetComponent);
        if (el) {
            const focusable = el.querySelector('input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])');
            (focusable || el).blur?.();
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    focus: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const focusable = el.querySelector('input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])');
            (focusable || el).focus?.();
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    clearValue: safeMethod(function (args) {
        const { targetComponent } = args;
        const el = getElement(targetComponent);
        if (el) {
            const range = el.querySelector('input[type="range"]');
            window.component[targetComponent].value = appMethod.evalExpression(range ? range.min || 0 : "");
        }
    }),

    resetValue: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            window.component[targetComponent].value = appMethod.evalExpression(window.component[targetComponent].defaultValue || "");
        }
    }),

    select: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const input = el.querySelector("input, textarea");
            if (input && typeof input.select === "function") {
                input.select();
            } else {
                console.warn(`No input or textarea to select in ${NAME}="${targetComponent}".`);
            }
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    validate: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    clearValidation: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    click: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const clickable = el.querySelector('button, a, input[type="button"], input[type="submit"], [tabindex]:not([tabindex="-1"])');
            if (clickable && typeof clickable.click === "function") {
                clickable.click();
            } else {
                el.click();
            }
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    setData: safeMethod((args) => {
        const { targetComponent, options, event } = args;
        const formRef = window.component[targetComponent];
        if (!formRef) return;
        let value;
        try {
            value = JSON.parse(appMethod.evalExpression(options[0].value));
        } catch {
            try {
                value = eval(`(${appMethod.evalExpression(options[0].value)})`);
            } catch (err) {
                console.error("Error parsing value for setData:", err, options[0].value);
                return;
            }
        }

        Object.entries(value || {}).forEach(([name, val]) => {
            if (formRef.components[name]) formRef.components[name].value = val ?? "";
        });
        formRef.data = value;
    }),

    clearData: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const formRef = window.component[targetComponent];
        if (!formRef) return;
        Object.keys(formRef.components).forEach((name) => {
            formRef.components[name].value = "";
        });
        formRef.data = {};
    }),

    submit: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const query = window.component[targetComponent].valueConfig.dataSource || null;
        query && app.executeQuery(query);
    }),

    check: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            window.component[targetComponent].value = true;
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    uncheck: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            window.component[targetComponent].value = false;
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    toggle: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            window.component[targetComponent].value = !window.component[targetComponent].value;
        }
    }),

    play: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const video = el.querySelector("video");
            if (video && typeof video.play === "function") {
                video.play();
            } else {
                console.warn(`No video element to play in ${NAME}="${targetComponent}".`);
            }
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    pause: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        if (el) {
            const video = el.querySelector("video");
            if (video && typeof video.pause === "function") {
                video.pause();
            } else {
                console.warn(`No video element to pause in ${NAME}="${targetComponent}".`);
            }
        } else {
            console.warn(`Element with ${NAME}="${targetComponent}" not found.`);
        }
    }),

    seekTo: safeMethod(function (args) {
        const { targetComponent, options } = args;
        const el = getElement(targetComponent);
        const video = el?.querySelector("video");
        if (!video) return console.warn(`No video element to seek in ${NAME}="${targetComponent}".`);
        let time = Number(appMethod.evalExpression(options[0].value));
        if (isNaN(time)) return console.warn(`Invalid time value for seekTo:`, options[0].value);
        if (video.readyState >= 1) {
            video.currentTime = time;
        } else {
            video.addEventListener("loadedmetadata", function handler() {
                video.currentTime = time;
                video.removeEventListener("loadedmetadata", handler);
            });
        }
    }),

    open: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        appMethod.showModal(targetComponent);
    }),

    close: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        appMethod.hideModal(targetComponent);
    }),

    setFlipVertical: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        window.component[targetComponent].flipVertical = appMethod.evalExpression(options[0].flipVertical);
    }),

    setFlipHorizontal: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        window.component[targetComponent].flipHorizontal = appMethod.evalExpression(options[0].flipHorizontal);
    }),

    setImageUrl: safeMethod(function (args) {
        this.setValue(args);
    }),

    setPageUrl: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        this.setValue(args);
    }),

    reload: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        const el = getElement(targetComponent);
        const iframe = el?.querySelector("iframe");
        if (iframe) {
            iframe.src = iframe.src;
        }
    }),

    update: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    export: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    addRow: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    removeRow: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    updateCell: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),

    setContent: safeMethod(function (args) {
        const { targetComponent, options, event } = args;
        // TODO:
    }),
};
