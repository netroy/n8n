import { Container } from 'typedi';
import { Flags } from '@oclif/core';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import fs from 'fs';
import glob from 'fast-glob';

import { UM_FIX_INSTRUCTION } from '@/constants';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { disableAutoGeneratedIds } from '@db/utils/commandHelpers';
import { generateId } from '@db/utils/generators';
import { UserRepository } from '@db/repositories/user.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { IWorkflowToImport } from '@/Interfaces';
import { ImportService } from '@/services/import.service';
import { BaseCommand } from '../BaseCommand';

function assertHasWorkflowsToImport(workflows: unknown): asserts workflows is IWorkflowToImport[] {
	if (!Array.isArray(workflows)) {
		throw new ApplicationError(
			'File does not seem to contain workflows. Make sure the workflows are contained in an array.',
		);
	}

	for (const workflow of workflows) {
		if (
			typeof workflow !== 'object' ||
			!Object.prototype.hasOwnProperty.call(workflow, 'nodes') ||
			!Object.prototype.hasOwnProperty.call(workflow, 'connections')
		) {
			throw new ApplicationError('File does not seem to contain valid workflows.');
		}
	}
}

export class ImportWorkflowsCommand extends BaseCommand {
	static description = 'Import workflows';

	static examples = [
		'$ n8n import:workflow --input=file.json',
		'$ n8n import:workflow --separate --input=backups/latest/',
		'$ n8n import:workflow --input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n import:workflow --separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		input: Flags.string({
			char: 'i',
			description: 'Input file name or directory if --separate is used',
		}),
		separate: Flags.boolean({
			description: 'Imports *.json files from directory provided by --input',
		}),
		userId: Flags.string({
			description: 'The ID of the user to assign the imported workflows to',
		}),
	};

	async init() {
		disableAutoGeneratedIds(WorkflowEntity);
		await super.init();
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			this.logger.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					this.logger.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		const user = flags.userId ? await this.getAssignee(flags.userId) : await this.getOwner();

		let totalImported = 0;

		if (flags.separate) {
			let { input: inputPath } = flags;

			if (process.platform === 'win32') {
				inputPath = inputPath.replace(/\\/g, '/');
			}

			const files = await glob('*.json', {
				cwd: inputPath,
				absolute: true,
			});

			totalImported = files.length;
			this.logger.info(`Importing ${totalImported} workflows...`);

			for (const file of files) {
				const workflow = jsonParse<IWorkflowToImport>(fs.readFileSync(file, { encoding: 'utf8' }));
				if (!workflow.id) {
					workflow.id = generateId();
				}

				const _workflow = Container.get(WorkflowRepository).create(workflow);

				await Container.get(ImportService).importWorkflows([_workflow], user.id);
			}

			this.reportSuccess(totalImported);
			process.exit();
		}

		const workflows = jsonParse<IWorkflowToImport[]>(
			fs.readFileSync(flags.input, { encoding: 'utf8' }),
		);

		const _workflows = workflows.map((w) => Container.get(WorkflowRepository).create(w));

		assertHasWorkflowsToImport(workflows);

		totalImported = workflows.length;

		await Container.get(ImportService).importWorkflows(_workflows, user.id);

		this.reportSuccess(totalImported);
	}

	async catch(error: Error) {
		this.logger.error('An error occurred while importing workflows. See log messages for details.');
		this.logger.error(error.message);
	}

	private reportSuccess(total: number) {
		this.logger.info(`Successfully imported ${total} ${total === 1 ? 'workflow.' : 'workflows.'}`);
	}

	private async getOwner() {
		const owner = await Container.get(UserRepository).findOneBy({ role: 'global:owner' });
		if (!owner) {
			throw new ApplicationError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return owner;
	}

	private async getAssignee(userId: string) {
		const user = await Container.get(UserRepository).findOneBy({ id: userId });

		if (!user) {
			throw new ApplicationError('Failed to find user', { extra: { userId } });
		}

		return user;
	}
}
