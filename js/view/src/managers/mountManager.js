import { createApp } from 'vue';
import { generateUUID } from '../utils/domUtils.js';
import { appMethod } from '../common.methods.js';
import { COMPONENT_NAME, COMPONENT_ID, COMPONENT_TYPE, COMPOSITE_CHILD, COMPOSITE_COMPONENT } from '../constants.js';

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

export { mountNewVueApp, mountExistingVueApp };