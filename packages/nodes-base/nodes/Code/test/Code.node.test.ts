import { anyNumber, mock } from 'jest-mock-extended';
import { NodeVM } from '@n8n/vm2';
import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
import { ApplicationError, NodeHelpers } from 'n8n-workflow';
import { normalizeItems } from 'n8n-core';
import { Code } from '../Code.node';
import { ValidationError } from '../ValidationError';
import { testWorkflows, getWorkflowFilenames, initBinaryDataService } from '@test/nodes/Helpers';

describe('Test Code Node', () => {
	const workflows = getWorkflowFilenames(__dirname);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	testWorkflows(workflows);
});

describe('Code Node unit test', () => {
	const node = new Code();
	const thisArg = mock<IExecuteFunctions>({
		getNode: () => mock(),
		helpers: { normalizeItems },
		dataProxy: mock<IWorkflowDataProxyData>({ $input: mock() }),
	});

	describe('runOnceForAllItems', () => {
		beforeEach(() => {
			thisArg.getNodeParameter.calledWith('mode', 0).mockReturnValueOnce('runOnceForAllItems');
		});

		describe('valid return data', () => {
			const tests: Record<string, [object | null, object]> = {
				'should handle null': [null, []],
				'should handle pre-normalized result': [
					[{ json: { count: 42 } }],
					[{ json: { count: 42 } }],
				],
				'should handle when returned data is not an array': [
					{ json: { count: 42 } },
					[{ json: { count: 42 } }],
				],
				'should handle when returned data is an array with items missing `json` key': [
					[{ count: 42 }],
					[{ json: { count: 42 } }],
				],
				'should handle when returned data missing `json` key': [
					{ count: 42 },
					[{ json: { count: 42 } }],
				],
			};

			Object.entries(tests).forEach(([title, [input, expected]]) =>
				test(title, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce(input);

					const output = await node.execute.call(thisArg);
					expect(output).toEqual([expected]);
				}),
			);
		});

		describe('invalid return data', () => {
			const tests = {
				undefined,
				null: null,
				date: new Date(),
				string: 'string',
				boolean: true,
				array: [],
			};

			Object.entries(tests).forEach(([title, returnData]) =>
				test(`return error if \`.json\` is ${title}`, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce([{ json: returnData }]);

					try {
						await node.execute.call(thisArg);
						throw new ApplicationError("Validation error wasn't thrown", { level: 'warning' });
					} catch (error) {
						expect(error).toBeInstanceOf(ValidationError);
						expect(error.message).toEqual("A 'json' property isn't an object [item 0]");
					}
				}),
			);
		});
	});

	describe('runOnceForEachItem', () => {
		beforeEach(() => {
			thisArg.getNodeParameter.calledWith('mode', 0).mockReturnValueOnce('runOnceForEachItem');
			thisArg.getNodeParameter.calledWith('jsCode', anyNumber()).mockReturnValueOnce('');
			thisArg.getInputData.mockReturnValueOnce([{ json: {} }]);
		});

		describe('valid return data', () => {
			const tests: Record<string, [object | null, { json: any } | null]> = {
				'should handle pre-normalized result': [{ json: { count: 42 } }, { json: { count: 42 } }],
				'should handle when returned data missing `json` key': [
					{ count: 42 },
					{ json: { count: 42 } },
				],
			};

			Object.entries(tests).forEach(([title, [input, expected]]) =>
				test(title, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce(input);

					const output = await node.execute.call(thisArg);
					expect(output).toEqual([[{ json: expected?.json, pairedItem: { item: 0 } }]]);
				}),
			);
		});

		describe('invalid return data', () => {
			const tests = {
				undefined,
				null: null,
				date: new Date(),
				string: 'string',
				boolean: true,
				array: [],
			};

			Object.entries(tests).forEach(([title, returnData]) =>
				test(`return error if \`.json\` is ${title}`, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce({ json: returnData });

					try {
						await node.execute.call(thisArg);
						throw new ApplicationError("Validation error wasn't thrown", { level: 'warning' });
					} catch (error) {
						expect(error).toBeInstanceOf(ValidationError);
						expect(error.message).toEqual("A 'json' property isn't an object [item 0]");
					}
				}),
			);
		});
	});
});
