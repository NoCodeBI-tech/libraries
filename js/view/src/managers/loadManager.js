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

export { handlePageLoad, onBodyLoad };
