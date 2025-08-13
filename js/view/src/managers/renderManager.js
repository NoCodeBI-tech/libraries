import { generateUUID } from "../utils/domUtils.js";
import { appMethod } from "../common.methods.js";
import { COMPONENT_NAME, FORM_ITEM, LIST_VIEW_ITEM, NAME, COMPONENT_ID, COMPONENT_TYPE, COMPOSITE_COMPONENT, COMPOSITE_CHILD } from "../constants.js";

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
            if (FORM_INPUT_COMPONENTS.includes(componentType)) {
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
            if (FORM_INPUT_COMPONENTS.includes(componentType)) {
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

    listViewComponent.innerHTML = ""; 
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

export { renderFormComponent, renderListView };