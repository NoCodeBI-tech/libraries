import { appMethod } from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/common.methods.js";
import { generateUUID, initializeLottieAnimation, makeRequest } from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/helpers.js";
const { createApp, nextTick } = Vue;

import {
    ALPINE_COMPONENT,
    COMPONENT_ID,
    COMPONENT_NAME,
    COMPONENT_TYPE,
    COMPOSITE_CHILD,
    COMPOSITE_COMPONENT,
    FORM_ITEM,
    LIST_VIEW_ITEM,
    NAME,
} from "https://cdn.jsdelivr.net/gh/NoCodeBI-tech/libraries@main/js/view/constants.js";

const formInputComponents = ["input", "select", "textarea", "checkbox", "radio", "range", "date", "dateRange", "dateTime", "time", "tags", "switch", "keyValueTable"];

// Reactive state
window.component = Vue.reactive({});
window.pageResource = Vue.reactive({
    blocks: [],
    compositeComponents: [],
    assets: {},
});
window.source = Vue.reactive({});
window.qParams = Vue.reactive({});
let pageQueries = [];
const isLoading = {};

// Utils
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

// QueryManager;
const getAllQueries = async () => {
    try {
        const [data, error, status, message] = await makeRequest({
            method: "post",
            url: "/config/uiBuilder/data/queryObj/getAllFlowQuery",
            data: {},
            isLoading: isLoading,
            loading: "getAllFlowQuery",
        });
        if (status == "SUCCESS") pageQueries = data;
        else {
            pageApp.showAlert({
                type: "error",
                title: "OOPS! Something went wrong",
                description: message,
            });
        }
    } catch (error) {
        console.error("Error fetching queries:", error);
    }
};
const executeQuery = async (query) => {
    try {
        const [data, error, status, message, transaction] = await makeRequest({
            method: "post",
            url: "/query/runFlowQuery",
            data: { queryId: query.queryId, valueJson: query.valueJson, qParams: [] },
            isLoading: isLoading,
            loading: `runQuery-${query.queryName}`,
        });
        if (status === "SUCCESS") {
            window.source[query.queryName] = appMethod.transformCode(query.transform.code, data);
            console.log(`Query ${query.queryName} executed successfully.`);
        } else {
            pageApp.showAlert({
                type: "error",
                title: `Failed to run ${query.queryName}`,
                description: message || "Unknown error occurred.",
            });
        }
    } catch (err) {
        console.error(`Error executing query ${query.queryName}:`, err);
        pageApp.showAlert({
            type: "error",
            title: `Error running ${query.queryName}`,
            description: err.message || "An unexpected error occurred.",
        });
    }
};
const executeJsQuery = (query) => {
    const { queryType, queryName } = query;
    try {
        const evaluatedExpression = appMethod.evalExpression(query.valueJson.code);
        const result = new Function(evaluatedExpression)();
        window.source[queryName] = result;
    } catch (err) {
        pageApp.showAlert({
            type: "error",
            title: `Error running JS query ${queryName}`,
            description: err.message || "An unexpected error occurred.",
        });
    }
};
const runQueries = async () => {
    if (!pageQueries || !Array.isArray(pageQueries)) {
        console.error("No queries available to run.");
        return;
    }

    const queryPromises = pageQueries.map((query) => {
        const { runBehavior, runPeriodically, runPeriodicallyInterval } = query.common;
        const { queryType, queryName } = query;
        if (queryType === "variable") {
            window.source[queryName] = query.valueJson.value;
            return Promise.resolve(); // No async operation for variables
        } else if (runBehavior === "automatic") {
            if (queryType === "js") {
                return Promise.resolve(executeJsQuery(query));
            } else {
                return executeQuery(query, runPeriodically);
            }
        }
        return Promise.resolve(); // Skip queries that don't match the conditions
    });
    try {
        await Promise.all(queryPromises);
        const event = new CustomEvent("allQueriesExecuted");
        window.dispatchEvent(event);
    } catch (error) {}
};

// RenderManager
const renderFormComponent = async (formComponent) => {
    const formAttributes = getAttributes(formComponent);
    const parentFormName = formAttributes[NAME];
    const dataRef = window.component[parentFormName].components;
    const formData = window.component[parentFormName].data;
    const blocks = Array.from(formComponent.querySelectorAll(`[${FORM_ITEM}]`)).reduce((acc, component) => {
        const attributes = getAttributes(component);
        const name = attributes[COMPONENT_NAME];
        const id = attributes[COMPONENT_ID];
        if (!name || acc[name]) {
            return acc;
        }
        const block = window.pageResource.blocks.find((block) => block.id === id);
        if (!block) {
            return acc;
        }
        acc[name] = block;
        return acc;
    }, {});
    Array.from(formComponent.querySelectorAll(`[${FORM_ITEM}]`)).forEach(async (component) => {
        const attributes = getAttributes(component);
        const componentType = attributes[COMPONENT_TYPE];
        const componentName = attributes[COMPONENT_NAME];
        const name = attributes[NAME];
        if (componentType !== "form") {
            if (formInputComponents.includes(componentType)) {
                if (formData.hasOwnProperty(name)) delete formData[name];
                formData[name] = dataRef[name].value;
                Object.defineProperty(formData, name, {
                    get: () => dataRef[name].value,
                    set: (newValue) => {
                        dataRef[name].value = newValue;
                    },
                    enumerable: true,
                    configurable: true,
                });
            }
        }
        if (!name) return;

        if (componentType !== "form") {
            addAttributes(component, { [FORM_ITEM]: parentFormName });
            if (formInputComponents.includes(componentType)) {
                const formData = window.component[parentFormName].data;
                delete formData[name];
                Object.defineProperty(formData, name, {
                    get: () => dataRef[name].value,
                    set: (newValue) => {
                        dataRef[name].value = newValue;
                    },
                    enumerable: true,
                    configurable: true,
                });
            }
        }

        mountExistingVueApp(component, dataRef);
    });
};
const renderListView = async (listViewComponent) => {
    const attributes = getAttributes(listViewComponent);
    const listViewFirstChild = listViewComponent.querySelector(`[${LIST_VIEW_ITEM}]`);
    const listViewName = attributes[NAME];
    if (!listViewFirstChild) return;

    const innerChildren = listViewFirstChild.querySelectorAll(`[${NAME}]`);
    const componentDataCache = {};
    const blocksCache = {};
    const styleCache = {};
    window.component[listViewName].components = {};
    Array.from(innerChildren).forEach((component) => {
        const { [NAME]: dataName, [COMPONENT_ID]: compId, [COMPONENT_NAME]: compName } = getAttributes(component);
        if (!dataName || !compName) return;
        if (!componentDataCache[dataName] && window.component[dataName]) {
            componentDataCache[dataName] = _.cloneDeep(window.component[dataName]);
        }
        if (!blocksCache[compName]) {
            const block = window.pageResource.blocks.find((b) => b.id === compId);
            blocksCache[compName] = block;
        }
    });

    const htmlArray = appMethod.query(window.component[listViewName].valueConfig.dataSource).map((_, index) => {
        const clone = listViewFirstChild.cloneNode(true);
        addAttributes(clone, { id: generateUUID() });
        Array.from(clone.querySelectorAll(`[${NAME}]`)).forEach((child) => addAttributes(child, { id: generateUUID() }));
        return clone;
    });

    // Replace the listViewFirstChild with the array of cloned elements
    listViewComponent.innerHTML = ""; // Clear the existing content
    htmlArray.forEach((element) => listViewComponent.appendChild(element));

    const newlyAddedComponents = Array.from(listViewComponent.children);
    const dataRef = window.component[listViewName].components;

    await Promise.all(
        newlyAddedComponents.map(async (parentComp, parentIndex) => {
            const item = appMethod.query(window.component[listViewName].valueConfig.dataSource)[parentIndex];
            const allComps = [parentComp, ...parentComp.querySelectorAll(`[${NAME}]`)];

            await Promise.all(
                allComps.map(async (comp, index) => {
                    const { [COMPONENT_NAME]: compName, [NAME]: dataName } = getAttributes(comp);
                    if (!compName) return;
                    const name = `${compName}${parentIndex}${index}`;
                    const block = blocksCache[compName];
                    await mountNewVueApp(name, dataRef, comp, block);
                    if (!dataRef[name]) return;
                    const valueConfig = componentDataCache[dataName]?.valueConfig;
                    if (valueConfig) {
                        const evaluated = appMethod.evalExpression(valueConfig, item);
                        Object.assign(dataRef[name], evaluated);
                    }
                })
            );
        })
    );
};

// MountManager
const mountNewVueApp = async (name, dataRef, component, block = null, parsedUiConfig = null) => {
    const parent = component.closest(`[${COMPOSITE_COMPONENT}]`);
    const { [COMPONENT_NAME]: componentName, [COMPONENT_ID]: id, [COMPONENT_TYPE]: componentType, [COMPOSITE_CHILD]: isCompositeChild } = getAttributes(component);
    const parentBlock = isCompositeChild && window.pageResource.compositeComponents.find((item) => item.id == getAttributes(parent)[COMPONENT_ID]);
    if (!componentName) return;
    block = block || window.pageResource.blocks.find((block) => block.id === id) || {};
    if (!block || !block?.js) return;
    const { data, watch = {}, ...rest } = await eval(`(${block.js})`);
    const dataObject = typeof data === "function" ? data() : data;

    dataRef[name] = isCompositeChild
        ? _.cloneDeep(parentBlock.components[getAttributes(component)[COMPOSITE_CHILD]])
        : {
              ...dataObject,
              componentName: name,
              valueConfig: dataRef[name]?.valueConfig || { dataSource: "", dataSourceType: "" },
              events: {},
              event: {},
              eventHandlers: {},

              ...(componentType === "chart" && {
                  series: dataRef[name]?.series || [],
                  seriesList: dataRef[name]?.seriesList || [],
              }),

              ...(componentType === "table" && {
                  column: dataRef[name]?.column || [],
                  columnList: dataRef[name]?.columnList || [],
              }),
          };
    const compApp = createApp({
        data: () => dataRef[name],
        watch: {
            ...watch,
            eventHandlers: {
                handler: function (newEventHandlers) {
                    this.event = appMethod.getEventListeners(newEventHandlers);
                },
                deep: true,
                immediate: true,
            },
        },
        ...rest,
    });

    Object.assign(compApp.config.globalProperties, {
        source: window.source,
        window: window,
        component: window.component,
        appMethod: appMethod,
        document: window.document,
    });

    compApp.mount(component);
};
const mountExistingVueApp = async (component, dataRef) => {
    const attributes = getAttributes(component);
    const name = attributes[NAME];
    const block = window.pageResource.blocks.find((b) => b.id === attributes[COMPONENT_ID]);
    if (!block || !block.js) return;
    // Inject resources
    for (const script of block?.resources?.scripts || []) await injectScript({ src: script, isInline: false, document });
    for (const style of block?.resources?.styles || []) await injectStyle({ href: style, isInline: false, document });

    const { data = {}, watch = {}, ...rest } = await eval(`(${block.js})`);
    const compApp = createApp({
        data: () => dataRef[name],
        watch: {
            ...watch,
            eventHandlers: {
                handler: function (newEventHandlers) {
                    this.event = appMethod.getEventListeners(newEventHandlers);
                },
                deep: true,
                immediate: true,
            },
        },
        ...rest,
    });
    Object.assign(compApp.config.globalProperties, {
        source: window.source,
        component: window.component,
        appMethod: appMethod,
        window: window,
        document: window.document,
    });
    compApp.mount(component);
};

// AlertManager
const onBodyLoad = async () => {
    const listViewComponentList = document.querySelectorAll(`[${COMPONENT_NAME}="listView"]`);
    const formComponentList = document.querySelectorAll(`[${COMPONENT_NAME}="form"]`);
    listViewComponentList.forEach((listViewComponent) => {
        renderListView(listViewComponent);
    });
    formComponentList.forEach((formComponent) => {
        renderFormComponent(formComponent);
    });
    const selector = `[${COMPONENT_NAME}]:not([${COMPOSITE_COMPONENT}]):not([${FORM_ITEM}]):not([${ALPINE_COMPONENT}])`;
    const domApps = document.querySelectorAll(selector);
    domApps.forEach(async (component) => {
        mountExistingVueApp(component, window.component);
    });
};
const handlePageLoad = async () => {
    try {
        const promises = [
            makeRequest({
                method: "post",
                url: "/config/uiBuilder/data/block/getComponents",
                data: { pageId: "5ff60516-a7ae-4a2c-9b60-678039d5b2c3" },
                isLoading: isLoading,
                loading: "getComponents",
            }),
            makeRequest({
                method: "post",
                url: "/config/uiBuilder/data/pageResource/getPageResource",
                data: {},
                isLoading: isLoading,
                loading: "getBlocks",
            }),
            getAllQueries(),
        ];
        const [[componentData, componentError, componentStatus, componentMessage], [pageResourceData, pageResourceError, pageResourceStatus, pageResourceMessage]] = await Promise.all(promises);
        if (componentStatus == "SUCCESS") {
            Object.assign(window.component, componentData);
        } else {
            pageApp.showAlert({
                type: "error",
                title: "OOPS! Something went wrong",
                description: componentMessage,
            });
        }
        if (pageResourceStatus == "SUCCESS") {
            Object.assign(window.pageResource, pageResourceData);
        } else {
            pageApp.showAlert({
                type: "error",
                title: "OOPS! Something went wrong",
                description: pageResourceMessage,
            });
        }
        await runQueries();
        await onBodyLoad();
    } catch (error) {
        console.error("Error during page load:", error);
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    initializeLottieAnimation("[data-loading-canvas]");
    await handlePageLoad();
    window.pageApp.setLoading(false);
});
