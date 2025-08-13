import { makeRequest } from "../utils/helpers.js";
import { appMethod } from "../common.methods.js";

let pageQueries = [];
const isLoading = {};

// Fetch all queries from the server
const getAllQueries = async () => {
    try {
        const [data, error, status, message] = await makeRequest({
            method: "post",
            url: "/config/uiBuilder/data/queryObj/getAllFlowQuery",
            data: {},
            isLoading: isLoading,
            loading: "getAllFlowQuery",
        });
        if (status === "SUCCESS") {
            pageQueries = data;
        } else {
            appMethod.showAlert({
                type: "error",
                title: "OOPS! Something went wrong",
                description: message,
            });
        }
    } catch (error) {
        console.error("Error fetching queries:", error);
    }
};

// Execute a specific query
const executeQuery = async (query) => {
    try {
        const [data, error, status, message] = await makeRequest({
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
            appMethod.showAlert({
                type: "error",
                title: `Failed to run ${query.queryName}`,
                description: message || "Unknown error occurred.",
            });
        }
    } catch (err) {
        console.error(`Error executing query ${query.queryName}:`, err);
        appMethod.showAlert({
            type: "error",
            title: `Error running ${query.queryName}`,
            description: err.message || "An unexpected error occurred.",
        });
    }
};

// Execute a JavaScript query
const executeJsQuery = (query) => {
    const { queryType, queryName } = query;
    try {
        const evaluatedExpression = appMethod.evalExpression(query.valueJson.code);
        const result = new Function(evaluatedExpression)();
        window.source[queryName] = result;
    } catch (err) {
        appMethod.showAlert({
            type: "error",
            title: `Error running JS query ${queryName}`,
            description: err.message || "An unexpected error occurred.",
        });
    }
};

// Run all queries
const runQueries = async () => {
    if (!pageQueries || !Array.isArray(pageQueries)) {
        console.error("No queries available to run.");
        return;
    }

    const queryPromises = pageQueries.map((query) => {
        const { runBehavior, queryType, queryName } = query;
        if (queryType === "variable") {
            window.source[queryName] = query.valueJson.value;
            return Promise.resolve(); // No async operation for variables
        } else if (runBehavior === "automatic") {
            if (queryType === "js") {
                return Promise.resolve(executeJsQuery(query));
            } else {
                return executeQuery(query);
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

export { getAllQueries, executeQuery, executeJsQuery, runQueries };