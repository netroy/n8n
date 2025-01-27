import { readdirSync } from 'fs';
import path from 'path';

export const getWorkflowFilenames = (dirname: string) => {
	const workflows: string[] = [];

	const filenames = readdirSync(dirname);
	const testFolder = dirname.split(`${path.sep}nodes-langchain${path.sep}`)[1];
	filenames.forEach((file) => {
		if (file.endsWith('.json')) {
			workflows.push(path.join(testFolder, file));
		}
	});

	return workflows;
};
