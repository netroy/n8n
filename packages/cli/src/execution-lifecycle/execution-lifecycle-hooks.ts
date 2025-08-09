import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { LifecycleMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { stringify } from 'flatted';
import {
	ErrorReporter,
	InstanceSettings,
	ExecutionLifecycleHooks,
	HookExecutionContext,
} from 'n8n-core';

import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { isWorkflowIdValid } from '@/utils';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

// eslint-disable-next-line import-x/no-cycle
import { executeErrorWorkflow } from './execute-error-workflow';
import { restoreBinaryDataId } from './restore-binary-data-id';
import { saveExecutionProgress } from './save-execution-progress';
import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from './shared/shared-hook-functions';
import { toSaveSettings } from './to-save-settings';

@Service()
class ModulesHooksRegistry {
	addHooks(hooks: ExecutionLifecycleHooks) {
		const handlers = Container.get(LifecycleMetadata).getHandlers();

		for (const { handlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(handlerClass);

			switch (eventName) {
				case 'workflowExecuteAfter':
					hooks.addHandler(eventName, async function ({ workflowData }, runData, newStaticData) {
						const lifecycleEventContext = {
							type: 'workflowExecuteAfter',
							workflow: workflowData,
							runData,
							newStaticData,
						};
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return await instance[methodName].call(instance, lifecycleEventContext);
					});
					break;

				case 'nodeExecuteBefore':
					hooks.addHandler(eventName, async function ({ workflowData }, nodeName, taskData) {
						const lifecycleEventContext = {
							type: 'nodeExecuteBefore',
							workflow: workflowData,
							nodeName,
							taskData,
						};
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return await instance[methodName].call(instance, lifecycleEventContext);
					});
					break;

				case 'nodeExecuteAfter':
					hooks.addHandler(
						eventName,
						async function ({ workflowData }, nodeName, taskData, executionData) {
							const lifecycleEventContext = {
								type: 'nodeExecuteAfter',
								workflow: workflowData,
								nodeName,
								taskData,
								executionData,
							};
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return
							return await instance[methodName].call(instance, lifecycleEventContext);
						},
					);
					break;

				case 'workflowExecuteBefore':
					hooks.addHandler(eventName, async function ({ workflowData }) {
						const lifecycleEventContext = {
							type: 'workflowExecuteBefore',
							workflow: workflowData,
						};
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return await instance[methodName].call(instance, lifecycleEventContext);
					});
					break;
			}
		}
	}
}

function hookFunctionsWorkflowEvents(hooks: ExecutionLifecycleHooks) {
	const eventService = Container.get(EventService);
	hooks.addHandler('workflowExecuteBefore', function ({ executionId, workflowData }) {
		eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
	});
	hooks.addHandler(
		'workflowExecuteAfter',
		function ({ executionId, workflowData, userId }, runData) {
			if (runData.status === 'waiting') return;

			const { startData } = runData.data;
			if (startData) {
				const originalDestination = startData.originalDestinationNode;
				if (originalDestination) {
					startData.destinationNode = originalDestination;
					startData.originalDestinationNode = undefined;
				}
			}

			eventService.emit('workflow-post-execute', {
				executionId,
				runData,
				workflow: workflowData,
				userId,
			});
		},
	);
}

function hookFunctionsNodeEvents(hooks: ExecutionLifecycleHooks) {
	const eventService = Container.get(EventService);
	hooks.addHandler('nodeExecuteBefore', function ({ executionId, workflowData }, nodeName) {
		const node = workflowData.nodes.find((n) => n.name === nodeName);

		eventService.emit('node-pre-execute', {
			executionId,
			workflow: workflowData,
			nodeId: node?.id,
			nodeName,
			nodeType: node?.type,
		});
	});
	hooks.addHandler('nodeExecuteAfter', function ({ executionId, workflowData }, nodeName) {
		const node = workflowData.nodes.find((n) => n.name === nodeName);

		eventService.emit('node-post-execute', {
			executionId,
			workflow: workflowData,
			nodeId: node?.id,
			nodeName,
			nodeType: node?.type,
		});
	});
}

/**
 * Returns hook functions to push data to Editor-UI
 */
function hookFunctionsPush(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const pushInstance = Container.get(Push);
	hooks.addHandler(
		'nodeExecuteBefore',
		function ({ executionId, workflowData, pushRef }, nodeName, data) {
			if (!pushRef) return;
			// Push data to session which started workflow before each
			// node which starts rendering
			logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
				executionId,
				pushRef,
				workflowId: workflowData.id,
			});

			pushInstance.send(
				{ type: 'nodeExecuteBefore', data: { executionId, nodeName, data } },
				pushRef,
			);
		},
	);
	hooks.addHandler(
		'nodeExecuteAfter',
		function ({ executionId, workflowData, pushRef }, nodeName, data) {
			if (!pushRef) return;
			// Push data to session which started workflow after each rendered node
			logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
				executionId,
				pushRef,
				workflowId: workflowData.id,
			});

			pushInstance.send(
				{ type: 'nodeExecuteAfter', data: { executionId, nodeName, data } },
				pushRef,
			);
		},
	);
	hooks.addHandler(
		'workflowExecuteBefore',
		function ({ executionId, executionMode, workflowData, pushRef, retryOf }) {
			if (!pushRef) return;
			logger.debug('Executing hook (hookFunctionsPush)', {
				executionId,
				pushRef,
				workflowId: workflowData.id,
			});
			// Push data to session which started the workflow
			pushInstance.send(
				{
					type: 'executionStarted',
					data: {
						executionId,
						mode: executionMode,
						startedAt: new Date(),
						retryOf,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
						flattedRunData: stringify({}), // TODO: fix this
						// flattedRunData: data?.resultData.runData
						// 	? stringify(data.resultData.runData)
						// 	: stringify({}),
					},
				},
				pushRef,
			);
		},
	);
	hooks.addHandler(
		'workflowExecuteAfter',
		function ({ executionId, workflowData, pushRef }, fullRunData) {
			if (!pushRef) return;
			logger.debug('Executing hook (hookFunctionsPush)', {
				executionId,
				pushRef,
				workflowId: workflowData.id,
			});

			const { status } = fullRunData;
			if (status === 'waiting') {
				pushInstance.send({ type: 'executionWaiting', data: { executionId } }, pushRef);
			} else {
				const rawData = stringify(fullRunData.data);
				pushInstance.send(
					{
						type: 'executionFinished',
						data: { executionId, workflowId: workflowData.id, status, rawData },
					},
					pushRef,
				);
			}
		},
	);
}

function hookFunctionsExternalHooks(hooks: ExecutionLifecycleHooks) {
	const externalHooks = Container.get(ExternalHooks);
	hooks.addHandler('workflowExecuteBefore', async function ({ executionMode, workflowData }) {
		await externalHooks.run('workflow.preExecute', [workflowData, executionMode]);
	});
	hooks.addHandler(
		'workflowExecuteAfter',
		async function ({ executionId, workflowData }, fullRunData) {
			await externalHooks.run('workflow.postExecute', [fullRunData, workflowData, executionId]);
		},
	);
}

function hookFunctionsSaveProgress(hooks: ExecutionLifecycleHooks) {
	hooks.addHandler(
		'nodeExecuteAfter',
		async function ({ executionId, workflowData, saveSettings }, nodeName, data, executionData) {
			if (!saveSettings.progress) return;
			await saveExecutionProgress(workflowData.id, executionId, nodeName, data, executionData);
		},
	);
}

/** This should ideally be added before any other `workflowExecuteAfter` hook to ensure all hooks get the same execution status */
function hookFunctionsFinalizeExecutionStatus(hooks: ExecutionLifecycleHooks) {
	hooks.addHandler('workflowExecuteAfter', (_, fullRunData) => {
		fullRunData.status = determineFinalExecutionStatus(fullRunData);
	});
}

function hookFunctionsStatistics(hooks: ExecutionLifecycleHooks) {
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler('nodeFetchedData', ({ workflowData }, node) => {
		workflowStatisticsService.emit('nodeFetchedData', { workflowId: workflowData.id, node });
	});
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 */
function hookFunctionsSave(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const errorReporter = Container.get(ErrorReporter);
	const executionRepository = Container.get(ExecutionRepository);
	const workflowStaticDataService = Container.get(WorkflowStaticDataService);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler(
		'workflowExecuteAfter',
		async function (
			{ executionId, executionMode, workflowData, saveSettings, pushRef, retryOf },
			fullRunData,
			newStaticData,
		) {
			logger.debug('Executing hook (hookFunctionsSave)', {
				executionId,
				workflowId: workflowData.id,
			});

			await restoreBinaryDataId(fullRunData, executionId, executionMode);

			const isManualMode = executionMode === 'manual';

			try {
				if (!isManualMode && isWorkflowIdValid(workflowData.id) && newStaticData) {
					// Workflow is saved so update in database
					try {
						await workflowStaticDataService.saveStaticDataById(workflowData.id, newStaticData);
					} catch (e) {
						errorReporter.error(e);
						logger.error(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							`There was a problem saving the workflow with id "${workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`,
							{ executionId, workflowId: workflowData.id },
						);
					}
				}

				if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
					/**
					 * When manual executions are not being saved, we only soft-delete
					 * the execution so that the user can access its binary data
					 * while building their workflow.
					 *
					 * The manual execution and its binary data will be hard-deleted
					 * on the next pruning cycle after the grace period set by
					 * `EXECUTIONS_DATA_HARD_DELETE_BUFFER`.
					 */
					await executionRepository.softDelete(executionId);

					return;
				}

				const shouldNotSave =
					(fullRunData.status === 'success' && !saveSettings.success) ||
					(fullRunData.status !== 'success' && !saveSettings.error);

				if (shouldNotSave && !fullRunData.waitTill && !isManualMode) {
					executeErrorWorkflow(workflowData, fullRunData, executionMode, executionId, retryOf);

					await executionRepository.hardDelete({
						workflowId: workflowData.id,
						executionId,
					});

					return;
				}

				// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
				// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
				const fullExecutionData = prepareExecutionDataForDbUpdate({
					runData: fullRunData,
					workflowData,
					workflowStatusFinal: fullRunData.status,
					retryOf,
				});

				// When going into the waiting state, store the pushRef in the execution-data
				if (fullRunData.waitTill && isManualMode) {
					fullExecutionData.data.pushRef = pushRef;
				}

				await updateExistingExecution({
					executionId,
					workflowId: workflowData.id,
					executionData: fullExecutionData,
				});

				if (!isManualMode) {
					executeErrorWorkflow(workflowData, fullRunData, executionMode, executionId, retryOf);
				}
			} finally {
				workflowStatisticsService.emit('workflowExecutionCompleted', {
					workflowData,
					fullRunData,
				});
			}
		},
	);
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 * for running with queues. Manual executions should never run on queues as
 * they are always executed in the main process.
 */
function hookFunctionsSaveWorker(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const errorReporter = Container.get(ErrorReporter);
	const workflowStaticDataService = Container.get(WorkflowStaticDataService);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler(
		'workflowExecuteAfter',
		async function (
			{ executionId, executionMode, workflowData, pushRef, retryOf },
			fullRunData,
			newStaticData,
		) {
			logger.debug('Executing hook (hookFunctionsSaveWorker)', {
				executionId,
				workflowId: workflowData.id,
			});

			const isManualMode = executionMode === 'manual';

			try {
				if (!isManualMode && isWorkflowIdValid(workflowData.id) && newStaticData) {
					// Workflow is saved so update in database
					try {
						await workflowStaticDataService.saveStaticDataById(workflowData.id, newStaticData);
					} catch (e) {
						errorReporter.error(e);
						logger.error(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							`There was a problem saving the workflow with id "${workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
							{ workflowId: workflowData.id },
						);
					}
				}

				if (!isManualMode && fullRunData.status !== 'success' && fullRunData.status !== 'waiting') {
					executeErrorWorkflow(workflowData, fullRunData, executionMode, executionId, retryOf);
				}

				// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
				// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
				const fullExecutionData = prepareExecutionDataForDbUpdate({
					runData: fullRunData,
					workflowData,
					workflowStatusFinal: fullRunData.status,
					retryOf,
				});

				// When going into the waiting state, store the pushRef in the execution-data
				if (fullRunData.waitTill && isManualMode) {
					fullExecutionData.data.pushRef = pushRef;
				}

				await updateExistingExecution({
					executionId,
					workflowId: workflowData.id,
					executionData: fullExecutionData,
				});
			} finally {
				workflowStatisticsService.emit('workflowExecutionCompleted', {
					workflowData,
					fullRunData,
				});
			}
		},
	);
}

/**
 * Returns ExecutionLifecycleHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getLifecycleHooksForSubExecutions(
	data: Omit<HookExecutionContext, 'saveSettings'>,
): ExecutionLifecycleHooks {
	const { executionId, executionMode, workflowData, userId } = data;
	const saveSettings = toSaveSettings(workflowData.settings);
	const context: HookExecutionContext = {
		executionId,
		executionMode,
		workflowData,
		saveSettings,
		userId,
	};
	const hooks = new ExecutionLifecycleHooks(context);
	hookFunctionsWorkflowEvents(hooks);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks);
	hookFunctionsSaveProgress(hooks);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for worker in scaling mode.
 */
export function getLifecycleHooksForScalingWorker(
	data: Omit<HookExecutionContext, 'saveSettings'>,
): ExecutionLifecycleHooks {
	const { executionId, executionMode, workflowData, pushRef, retryOf, userId } = data;
	const saveSettings = toSaveSettings(workflowData.settings);
	const context: HookExecutionContext = {
		executionId,
		executionMode,
		workflowData,
		saveSettings,
		pushRef,
		retryOf: retryOf ?? undefined,
		userId,
	};
	const hooks = new ExecutionLifecycleHooks(context);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSaveWorker(hooks);
	hookFunctionsSaveProgress(hooks);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);

	if (executionMode === 'manual' && Container.get(InstanceSettings).isWorker) {
		hookFunctionsPush(hooks);
	}

	Container.get(ModulesHooksRegistry).addHooks(hooks);

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for main process in scaling mode.
 */
export function getLifecycleHooksForScalingMain(
	data: Omit<HookExecutionContext, 'saveSettings'>,
): ExecutionLifecycleHooks {
	const { executionId, executionMode, workflowData, pushRef, retryOf, userId } = data;
	const saveSettings = toSaveSettings(workflowData.settings);
	const context: HookExecutionContext = {
		executionId,
		executionMode,
		workflowData,
		saveSettings,
		pushRef,
		retryOf: retryOf ?? undefined,
		userId,
	};
	const hooks = new ExecutionLifecycleHooks(context);
	const executionRepository = Container.get(ExecutionRepository);

	hookFunctionsWorkflowEvents(hooks);
	hookFunctionsSaveProgress(hooks);
	hookFunctionsExternalHooks(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);

	hooks.addHandler(
		'workflowExecuteAfter',
		async function ({ executionId, executionMode }, fullRunData) {
			// Don't delete executions before they are finished
			if (!fullRunData.finished) return;

			const isManualMode = executionMode === 'manual';

			if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
				/**
				 * When manual executions are not being saved, we only soft-delete
				 * the execution so that the user can access its binary data
				 * while building their workflow.
				 *
				 * The manual execution and its binary data will be hard-deleted
				 * on the next pruning cycle after the grace period set by
				 * `EXECUTIONS_DATA_HARD_DELETE_BUFFER`.
				 */
				await executionRepository.softDelete(executionId);

				return;
			}

			const shouldNotSave =
				(fullRunData.status === 'success' && !saveSettings.success) ||
				(fullRunData.status !== 'success' && !saveSettings.error);

			if (!isManualMode && shouldNotSave && !fullRunData.waitTill) {
				await executionRepository.hardDelete({
					workflowId: workflowData.id,
					executionId,
				});
			}
		},
	);

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hooks.handlers.nodeExecuteBefore = [];
	hooks.handlers.nodeExecuteAfter = [];

	Container.get(ModulesHooksRegistry).addHooks(hooks);

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for the main process in regular mode
 */
export function getLifecycleHooksForRegularMain(
	data: Omit<HookExecutionContext, 'saveSettings'>,
): ExecutionLifecycleHooks {
	const { executionId, pushRef, retryOf, executionMode, workflowData, userId } = data;
	const saveSettings = toSaveSettings(workflowData.settings);
	const context: HookExecutionContext = {
		executionId,
		executionMode,
		workflowData,
		saveSettings,
		pushRef,
		retryOf: retryOf ?? undefined,
		userId,
	};
	const hooks = new ExecutionLifecycleHooks(context);
	hookFunctionsWorkflowEvents(hooks);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks);
	hookFunctionsPush(hooks);
	hookFunctionsSaveProgress(hooks);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	Container.get(ModulesHooksRegistry).addHooks(hooks);
	return hooks;
}
