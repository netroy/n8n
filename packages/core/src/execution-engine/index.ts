import type { IDeferredPromise, IExecuteResponsePromiseData, IRun } from 'n8n-workflow';
import type { RunHook } from './execution-lifecycle-hooks';
import type { ExternalSecretsProxy } from './external-secrets-proxy';

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		runHook?: RunHook;
		externalSecretsProxy: ExternalSecretsProxy;
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>;
		donePromise?: IDeferredPromise<IRun>;
	}
}

export * from './active-workflows';
export * from './interfaces';
export * from './routing-node';
export * from './node-execution-context';
export * from './partial-execution-utils';
export * from './node-execution-context/utils/execution-metadata';
export * from './workflow-execute';
export {
	ExecutionLifecycleHooks,
	type HookExecutionContext,
	type RunHook,
} from './execution-lifecycle-hooks';
export { ExternalSecretsProxy, type IExternalSecretsManager } from './external-secrets-proxy';
