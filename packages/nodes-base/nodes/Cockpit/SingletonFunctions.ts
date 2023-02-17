import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from '@8n8/core';
import { cockpitApiRequest } from './GenericFunctions';

export async function getSingleton(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	resourceName: string,
): Promise<any> {
	return cockpitApiRequest.call(this, 'get', `/singletons/get/${resourceName}`);
}

export async function getAllSingletonNames(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
): Promise<string[]> {
	return cockpitApiRequest.call(this, 'GET', '/singletons/listSingletons', {});
}
