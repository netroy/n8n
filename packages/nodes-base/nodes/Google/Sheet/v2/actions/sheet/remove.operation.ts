import type { IExecuteFunctions } from '@8n8/core';
import type { IDataObject, INodeExecutionData } from '@8n8/workflow';
import { apiRequest } from '../../transport';
import type { GoogleSheet } from '../../helpers/GoogleSheet';

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const returnData: IDataObject[] = [];
	const items = this.getInputData();
	for (let i = 0; i < items.length; i++) {
		const [spreadsheetId, sheetWithinDocument] = sheetName.split('||');
		const requests = [
			{
				deleteSheet: {
					sheetId: sheetWithinDocument,
				},
			},
		];

		const responseData = await apiRequest.call(
			this,
			'POST',
			`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
			{ requests },
		);
		delete responseData.replies;
		returnData.push(responseData);
	}

	return this.helpers.returnJsonArray(returnData);
}
