import { appMethod } from "https://github.com/NoCodeBI-tech/libraries/blob/main/js/view/common.methods.js";
import componentControlMethods from "https://github.com/NoCodeBI-tech/libraries/blob/main/js/view/componentControlMethods.js";

export default {
    // Action Function Declared Here
    controlQuery: async function (args) {
        const query = app.$data.pageQueries.find((q) => q.queryName === args.queryName);
        if (query) {
            app.executeQuery(query);
        }
    },

    runScript: function (args) {
        const { event, script } = args;
        try {
            eval(script);
        } catch (e) {
            const app = window.pageApp ?? window.app;
            app.showAlert({
                type: "error",
                title: "OOPS! Something went wrong",
                description: e.message,
            });
        }
    },

    navigate: function (args) {
        const { navigateUrl, queryParams, event } = args;
        let url = window.location.origin + navigateUrl + queryParams ? "?" : "";
        queryParams?.forEach((param) => {
            url += `${param.key}=${param.value}&`;
        });
        window.location.href = url;
    },

    showAlert: function (args) {
        const app = window.pageApp ?? window.app;
        app.showAlert(
            appMethod.evalExpression({
                ...args,
            })
        );
    },

    setLocalStorage: function (args) {
        const { key, value, event } = args;
        localStorage.setItem(key, value);
    },

    copyToClipboard: function (args) {
        const { event, value } = args;
        navigator.clipboard.writeText(value);
    },

    controlComponent: function (args) {
        const { event, targetComponent, method, options, ...rest } = args;
        if (componentControlMethods?.[method]) componentControlMethods?.[method](args);
    },

    setVariable: function (args) {
        const { key, value, event } = args;
        window.source[key] = appMethod.evalExpression(value);
    },
};
