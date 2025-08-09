1. Overhaul and streamline execution-lifecycle hooks, so that we don't create so many functions for every execution. a bit more like middlewares
2. add newer execution-lifecycle hook types, like the ones for AI agents
3. Create a new backend module to post execution tracing to open-telemetry, that langfuse can use


1. create a global project to hold variables and credentials, that all projects can use
2. move variables to be inside projects. migrate all current global variables to the global project
3. update frontend to remove variables in the sidebar, and add them as a tab in projects
