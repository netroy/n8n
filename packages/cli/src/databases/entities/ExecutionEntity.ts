import { ExecutionStatus, WorkflowExecuteMode } from '@8n8/workflow';
import { Column, Entity, Generated, Index, PrimaryColumn } from 'typeorm';
import { datetimeColumnType, jsonColumnType } from './AbstractEntity';
import { IWorkflowDb } from '@/Interfaces';
import type { IExecutionFlattedDb } from '@/Interfaces';
import { idStringifier } from '../utils/transformers';

@Entity()
@Index(['workflowId', 'id'])
@Index(['waitTill', 'id'])
@Index(['finished', 'id'])
@Index(['workflowId', 'finished', 'id'])
@Index(['workflowId', 'waitTill', 'id'])
export class ExecutionEntity implements IExecutionFlattedDb {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column('text')
	data: string;

	@Column()
	finished: boolean;

	@Column('varchar')
	mode: WorkflowExecuteMode;

	@Column({ nullable: true })
	retryOf: string;

	@Column({ nullable: true })
	retrySuccessId: string;

	@Column('varchar', { nullable: true })
	status: ExecutionStatus;

	@Column(datetimeColumnType)
	startedAt: Date;

	@Index()
	@Column({ type: datetimeColumnType, nullable: true })
	stoppedAt: Date;

	@Column(jsonColumnType)
	workflowData: IWorkflowDb;

	@Column({ nullable: true, transformer: idStringifier })
	workflowId: string;

	@Column({ type: datetimeColumnType, nullable: true })
	waitTill: Date;
}
