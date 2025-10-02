import { Config, Env } from '@n8n/config';

@Config
export class ExecutionSavingConfig {
	// If a workflow executes all the data gets saved by default. This
	// could be a problem when a workflow gets executed a lot and processes
	// a lot of data. To not exceed the database's capacity it is possible to
	// prune the database regularly or to not save the execution at all.
	// Depending on if the execution did succeed or error a different
	// save behaviour can be set.

	/** What workflow execution data to save on error */
	@Env('EXECUTIONS_DATA_SAVE_ON_ERROR')
	saveDataOnError: 'all' | 'none' = 'all';

	/** What workflow execution data to save on success */
	@Env('EXECUTIONS_DATA_SAVE_ON_SUCCESS')
	saveDataOnSuccess: 'all' | 'none' = 'all';

	/** Whether or not to save progress for each node executed */
	@Env('EXECUTIONS_DATA_SAVE_ON_PROGRESS')
	saveExecutionProgress: boolean = false;

	// If the executions of workflows which got started via the editor
	// should be saved. By default they will not be saved as this runs
	// are normally only for testing and debugging. This setting can
	// also be overwritten on a per workflow basis in the workflow settings
	// in the editor.

	/** Save data of executions when started manually via editor */
	@Env('EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS')
	saveDataManualExecutions: boolean = true;
}
