import type { IExecuteContextData, IExecuteData, IRunExecutionData, ITaskData } from 'n8n-workflow';

/**
 * Manages the execution state for workflow runs.
 * Provides a centralized interface for accessing and modifying execution data, node execution stack, and run results.
 */
export class ExecutionStateManager {
	constructor(private readonly runExecutionData: IRunExecutionData) {}

	/** Adds task data for a specific node to the execution results. */
	addTaskData(nodeName: string, taskData: ITaskData): void {
		const { runData } = this.runExecutionData.resultData;
		(runData[nodeName] ??= []).push(taskData);
	}

	/** Retrieves and removes the next node from the execution stack. */
	getNodeFromStack(): IExecuteData | undefined {
		const { executionData } = this.runExecutionData;
		return executionData?.nodeExecutionStack.shift();
	}

	/** Checks if there are nodes remaining in the execution stack. */
	get hasNodesToExecute(): boolean {
		const { executionData } = this.runExecutionData;
		return (executionData?.nodeExecutionStack.length ?? 0) > 0;
	}

	/**
	 * Returns the complete run execution data (readonly).
	 * This provides read-only access to external consumers while ensuring
	 * all mutations go through the ExecutionStateManager.
	 */
	getRunExecutionData(): Readonly<IRunExecutionData> {
		return this.runExecutionData;
	}

	/** Updates the last node executed in the result data. */
	setLastNodeExecuted(nodeName: string): void {
		this.runExecutionData.resultData.lastNodeExecuted = nodeName;
	}

	/** Gets the last node executed. */
	getLastNodeExecuted(): string | undefined {
		return this.runExecutionData.resultData.lastNodeExecuted;
	}

	/** Checks if the execution is in waiting state. */
	get isWaiting(): boolean {
		return this.runExecutionData.waitTill !== undefined;
	}

	/** Sets the execution to waiting state. */
	setWaiting(waitTill: Date): void {
		this.runExecutionData.waitTill = waitTill;
	}

	/** Clears the waiting state. */
	clearWaiting(): void {
		this.runExecutionData.waitTill = undefined;
	}

	/** Gets the run data for a specific node (readonly). */
	getNodeRunData(nodeName: string): readonly ITaskData[] | undefined {
		const { runData } = this.runExecutionData.resultData;
		return runData[nodeName];
	}

	/** Checks if a node has any run data. */
	hasNodeRunData(nodeName: string): boolean {
		const { runData } = this.runExecutionData.resultData;
		return !!runData[nodeName]?.length;
	}

	/**
	 * Gets the execution context data (readonly).
	 */
	getExecutionContextData(): Readonly<IExecuteContextData> | undefined {
		return this.runExecutionData.executionData?.contextData;
	}
}
