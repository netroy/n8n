import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from '@8n8/core';
import type { IDataObject } from '@8n8/workflow';
import type { IForm } from './FormInterface';
import { cockpitApiRequest } from './GenericFunctions';

export async function submitForm(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	resourceName: string,
	form: IDataObject,
) {
	const body: IForm = {
		form,
	};

	return cockpitApiRequest.call(this, 'post', `/forms/submit/${resourceName}`, body);
}
