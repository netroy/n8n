import { createWriteStream } from 'fs';
import { basename, dirname } from 'path';
import type { Readable } from 'stream';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { BINARY_ENCODING, NodeApiError } from 'n8n-workflow';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { file as tmpFile } from 'tmp-promise';

import ftpClient from 'promise-ftp';
import sftpClient from 'ssh2-sftp-client';
import { formatPrivateKey } from '@utils/utilities';
import type { FtpCredential } from '@credentials/Ftp.credentials';
import type { SftpCredential } from '@credentials/Sftp.credentials';

interface ReturnFtpItem {
	type: string;
	name: string;
	size: number;
	accessTime: Date;
	modifyTime: Date;
	rights: {
		user: string;
		group: string;
		other: string;
	};
	owner: string | number;
	group: string | number;
	target: string;
	sticky?: boolean;
	path: string;
}

const streamPipeline = promisify(pipeline);

async function callRecursiveList(
	path: string,
	client: sftpClient | ftpClient,
	normalizeFunction: (
		input: ftpClient.ListingElement & sftpClient.FileInfo,
		path: string,
		recursive?: boolean,
	) => void,
) {
	const pathArray: string[] = [path];
	let currentPath = path;
	const directoryItems: sftpClient.FileInfo[] = [];
	let index = 0;

	const prepareAndNormalize = (item: sftpClient.FileInfo) => {
		if (pathArray[index].endsWith('/')) {
			currentPath = `${pathArray[index]}${item.name}`;
		} else {
			currentPath = `${pathArray[index]}/${item.name}`;
		}

		// Is directory
		if (item.type === 'd') {
			// ignore . and .. to prevent infinite loop
			if (item.name === '.' || item.name === '..') {
				return;
			}
			pathArray.push(currentPath);
		}

		normalizeFunction(item as ftpClient.ListingElement & sftpClient.FileInfo, currentPath, true);
		directoryItems.push(item);
	};

	do {
		const returnData: sftpClient.FileInfo[] | Array<string | ftpClient.ListingElement> =
			await client.list(pathArray[index]);

		// @ts-ignore
		returnData.map(prepareAndNormalize);
		index++;
	} while (index <= pathArray.length - 1);

	return directoryItems;
}

async function recursivelyCreateSftpDirs(sftp: sftpClient, path: string) {
	const dirPath = dirname(path);
	const dirExists = await sftp.exists(dirPath);

	if (!dirExists) {
		await sftp.mkdir(dirPath, true);
	}
}

function normalizeSFtpItem(input: sftpClient.FileInfo, path: string, recursive = false) {
	const item = input as unknown as ReturnFtpItem;
	item.accessTime = new Date(input.accessTime);
	item.modifyTime = new Date(input.modifyTime);
	item.path = !recursive ? `${path}${path.endsWith('/') ? '' : '/'}${item.name}` : path;
}

function normalizeFtpItem(input: ftpClient.ListingElement, path: string, recursive = false) {
	const item = input as unknown as ReturnFtpItem;
	item.modifyTime = input.date;
	item.path = !recursive ? `${path}${path.endsWith('/') ? '' : '/'}${item.name}` : path;
	//@ts-ignore
	item.date = undefined;
}

export class Ftp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FTP',
		name: 'ftp',
		icon: 'fa:server',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["protocol"] + ": " + $parameter["operation"]}}',
		description: 'Transfer files via FTP or SFTP',
		defaults: {
			name: 'FTP',
			color: '#303050',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				// nodelinter-ignore-next-line
				name: 'ftp',
				required: true,
				displayOptions: {
					show: {
						protocol: ['ftp'],
					},
				},
				testedBy: 'ftpConnectionTest',
			},
			{
				// nodelinter-ignore-next-line
				name: 'sftp',
				required: true,
				displayOptions: {
					show: {
						protocol: ['sftp'],
					},
				},
				testedBy: 'sftpConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Protocol',
				name: 'protocol',
				type: 'options',
				options: [
					{
						name: 'FTP',
						value: 'ftp',
					},
					{
						name: 'SFTP',
						value: 'sftp',
					},
				],
				default: 'ftp',
				description: 'File transfer protocol',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file/folder',
						action: 'Delete a file or folder',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
						action: 'Download a file',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List folder content',
						action: 'List folder content',
					},
					{
						name: 'Rename',
						value: 'rename',
						description: 'Rename/move oldPath to newPath',
						action: 'Rename / move a file or folder',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
				],
				default: 'download',
				noDataExpression: true,
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to delete. Has to contain the full path.',
				placeholder: 'e.g. /public/documents/file-to-delete.txt',
				required: true,
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Folder',
						name: 'folder',
						type: 'boolean',
						default: false,
						description: 'Whether folders can be deleted',
					},
					{
						displayName: 'Recursive',
						displayOptions: {
							show: {
								folder: [true],
							},
						},
						name: 'recursive',
						type: 'boolean',
						default: false,
						description: 'Whether to remove all files and directories in target directory',
					},
				],
			},

			// ----------------------------------
			//         download
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['download'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to download. Has to contain the full path.',
				placeholder: 'e.g. /public/documents/file-to-download.txt',
				required: true,
			},
			{
				displayName: 'Put Output File in Field',
				displayOptions: {
					show: {
						operation: ['download'],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				hint: 'The name of the output binary field to put the file in',
				required: true,
			},

			// ----------------------------------
			//         rename
			// ----------------------------------
			{
				displayName: 'Old Path',
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				name: 'oldPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /public/documents/old-file.txt',
				required: true,
			},
			{
				displayName: 'New Path',
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				name: 'newPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /public/documents/new-file.txt',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				options: [
					{
						displayName: 'Create Directories',
						name: 'createDirectories',
						type: 'boolean',
						default: false,
						description:
							'Whether to recursively create destination directory when renaming an existing file or folder',
					},
				],
			},

			// ----------------------------------
			//         upload
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to upload. Has to contain the full path.',
				placeholder: 'e.g. /public/documents/file-to-upload.txt',
				required: true,
			},
			{
				displayName: 'Binary File',
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
				name: 'binaryData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Input Binary Field',
				displayOptions: {
					show: {
						operation: ['upload'],
						binaryData: [true],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				hint: 'The name of the input binary field containing the file to be written',
				required: true,
			},
			{
				displayName: 'File Content',
				displayOptions: {
					show: {
						operation: ['upload'],
						binaryData: [false],
					},
				},
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload',
			},

			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				name: 'path',
				type: 'string',
				default: '/',
				placeholder: 'e.g. /public/folder',
				description: 'Path of directory to list contents of',
				required: true,
			},
			{
				displayName: 'Recursive',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				name: 'recursive',
				type: 'boolean',
				default: false,
				description:
					'Whether to return object representing all directories / objects recursively found within SFTP server',
				required: true,
			},
		],
	};

	methods = {
		credentialTest: {
			async ftpConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as FtpCredential;
				try {
					const ftp = new ftpClient();
					await ftp.connect({
						host: credentials.host,
						port: credentials.port,
						user: credentials.username,
						password: credentials.password,
					});
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
			async sftpConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as SftpCredential;
				try {
					const sftp = new sftpClient();
					if (credentials.privateKey) {
						await sftp.connect({
							host: credentials.host,
							port: credentials.port,
							username: credentials.username,
							password: credentials.password || undefined,
							privateKey: formatPrivateKey(credentials.privateKey),
							passphrase: credentials.passphrase,
						});
					} else {
						await sftp.connect({
							host: credentials.host,
							port: credentials.port,
							username: credentials.username as string,
							password: credentials.password as string,
						});
					}
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];
		let responseData;
		const operation = this.getNodeParameter('operation', 0);
		const protocol = this.getNodeParameter('protocol', 0) as 'ftp' | 'sftp';

		try {
			let ftp: ftpClient;
			let sftp: sftpClient;

			if (protocol === 'sftp') {
				const credentials = await this.getCredentials<SftpCredential>(protocol);
				sftp = new sftpClient();
				if (credentials.privateKey) {
					await sftp.connect({
						host: credentials.host,
						port: credentials.port,
						username: credentials.username,
						password: credentials.password || undefined,
						privateKey: formatPrivateKey(credentials.privateKey),
						passphrase: credentials.passphrase,
					});
				} else {
					await sftp.connect({
						host: credentials.host,
						port: credentials.port,
						username: credentials.username,
						password: credentials.password,
					});
				}
			} else {
				const credentials = await this.getCredentials<FtpCredential>(protocol);
				ftp = new ftpClient();
				await ftp.connect({
					host: credentials.host,
					port: credentials.port,
					user: credentials.username,
					password: credentials.password,
				});
			}

			for (let i = 0; i < items.length; i++) {
				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
				};

				if (items[i].binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}

				items[i] = newItem;

				if (protocol === 'sftp') {
					if (operation === 'list') {
						const path = this.getNodeParameter('path', i) as string;

						const recursive = this.getNodeParameter('recursive', i) as boolean;

						if (recursive) {
							responseData = await callRecursiveList(path, sftp!, normalizeSFtpItem);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
								{ itemData: { item: i } },
							);
							returnItems.push.apply(returnItems, executionData);
						} else {
							responseData = await sftp!.list(path);
							responseData.forEach((item) => normalizeSFtpItem(item, path));
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
								{ itemData: { item: i } },
							);
							returnItems.push.apply(returnItems, executionData);
						}
					}

					if (operation === 'delete') {
						const path = this.getNodeParameter('path', i) as string;
						const options = this.getNodeParameter('options', i);

						if (options.folder === true) {
							responseData = await sftp!.rmdir(path, !!options.recursive);
						} else {
							responseData = await sftp!.delete(path);
						}
						const executionData = this.helpers.constructExecutionMetaData(
							[{ json: { success: true } }],
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}

					if (operation === 'rename') {
						const oldPath = this.getNodeParameter('oldPath', i) as string;
						const { createDirectories = false } = this.getNodeParameter('options', i) as {
							createDirectories: boolean;
						};
						const newPath = this.getNodeParameter('newPath', i) as string;

						if (createDirectories) {
							await recursivelyCreateSftpDirs(sftp!, newPath);
						}

						responseData = await sftp!.rename(oldPath, newPath);
						const executionData = this.helpers.constructExecutionMetaData(
							[{ json: { success: true } }],
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}

					if (operation === 'download') {
						const path = this.getNodeParameter('path', i) as string;
						const binaryFile = await tmpFile({ prefix: 'n8n-sftp-' });
						try {
							await sftp!.get(path, createWriteStream(binaryFile.path));

							const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
							const remoteFilePath = this.getNodeParameter('path', i) as string;

							items[i].binary![dataPropertyNameDownload] = await this.nodeHelpers.copyBinaryFile(
								binaryFile.path,
								basename(remoteFilePath),
							);

							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(items[i]),
								{ itemData: { item: i } },
							);
							returnItems.push(...executionData);
						} finally {
							await binaryFile.cleanup();
						}
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;
						await recursivelyCreateSftpDirs(sftp!, remotePath);

						if (this.getNodeParameter('binaryData', i)) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

							let uploadData: Buffer | Readable;
							if (binaryData.id) {
								uploadData = await this.helpers.getBinaryStream(binaryData.id);
							} else {
								uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
							}
							await sftp!.put(uploadData, remotePath);
						} else {
							// Is text file
							const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
							await sftp!.put(buffer, remotePath);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(items[i]),
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}
				}

				if (protocol === 'ftp') {
					if (operation === 'list') {
						const path = this.getNodeParameter('path', i) as string;

						const recursive = this.getNodeParameter('recursive', i) as boolean;

						if (recursive) {
							responseData = await callRecursiveList(path, ftp!, normalizeFtpItem);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
								{ itemData: { item: i } },
							);
							returnItems.push.apply(returnItems, executionData);
						} else {
							responseData = await ftp!.list(path);
							responseData.forEach((item) =>
								normalizeFtpItem(item as ftpClient.ListingElement, path),
							);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
								{ itemData: { item: i } },
							);
							returnItems.push.apply(returnItems, executionData);
						}
					}

					if (operation === 'delete') {
						const path = this.getNodeParameter('path', i) as string;
						const options = this.getNodeParameter('options', i);

						if (options.folder === true) {
							responseData = await ftp!.rmdir(path, !!options.recursive);
						} else {
							responseData = await ftp!.delete(path);
						}
						const executionData = this.helpers.constructExecutionMetaData(
							[{ json: { success: true } }],
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}

					if (operation === 'download') {
						const path = this.getNodeParameter('path', i) as string;
						const binaryFile = await tmpFile({ prefix: 'n8n-sftp-' });
						try {
							const stream = await ftp!.get(path);
							await streamPipeline(stream, createWriteStream(binaryFile.path));

							const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
							const remoteFilePath = this.getNodeParameter('path', i) as string;

							items[i].binary![dataPropertyNameDownload] = await this.nodeHelpers.copyBinaryFile(
								binaryFile.path,
								basename(remoteFilePath),
							);

							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(items[i]),
								{ itemData: { item: i } },
							);
							returnItems.push(...executionData);
						} finally {
							await binaryFile.cleanup();
						}
					}

					if (operation === 'rename') {
						const oldPath = this.getNodeParameter('oldPath', i) as string;

						const newPath = this.getNodeParameter('newPath', i) as string;

						responseData = await ftp!.rename(oldPath, newPath);
						const executionData = this.helpers.constructExecutionMetaData(
							[{ json: { success: true } }],
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;
						const fileName = basename(remotePath);
						const dirPath = remotePath.replace(fileName, '');

						if (this.getNodeParameter('binaryData', i)) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

							let uploadData: Buffer | Readable;
							if (binaryData.id) {
								uploadData = await this.helpers.getBinaryStream(binaryData.id);
							} else {
								uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
							}

							try {
								await ftp!.put(uploadData, remotePath);
							} catch (error) {
								if (error.code === 553) {
									// Create directory
									await ftp!.mkdir(dirPath, true);
									await ftp!.put(uploadData, remotePath);
								} else {
									throw new NodeApiError(this.getNode(), error as JsonObject);
								}
							}
						} else {
							// Is text file
							const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
							try {
								await ftp!.put(buffer, remotePath);
							} catch (error) {
								if (error.code === 553) {
									// Create directory
									await ftp!.mkdir(dirPath, true);
									await ftp!.put(buffer, remotePath);
								} else {
									throw new NodeApiError(this.getNode(), error as JsonObject);
								}
							}
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(items[i]),
							{ itemData: { item: i } },
						);
						returnItems.push(...executionData);
					}
				}
			}

			if (protocol === 'sftp') {
				await sftp!.end();
			} else {
				await ftp!.end();
			}
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: error.message } }]];
			}

			throw error;
		}
		return [returnItems];
	}
}
