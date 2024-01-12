import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as mqtt from 'mqtt';
import { formatPrivateKey } from '@utils/utilities';
import type { MqttCredential } from '@credentials/Mqtt.credentials';

export class Mqtt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT',
		name: 'mqtt',
		icon: 'file:mqtt.svg',
		group: ['input'],
		version: 1,
		description: 'Push messages to MQTT',
		defaults: {
			name: 'MQTT',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mqtt',
				required: true,
				testedBy: 'mqttConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				required: true,
				default: '',
				description: 'The topic to publish to',
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to send the the data the node receives as JSON',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						sendInputData: [false],
					},
				},
				default: '',
				description: 'The message to publish',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'QoS',
						name: 'qos',
						type: 'options',
						options: [
							{
								name: 'Received at Most Once',
								value: 0,
							},
							{
								name: 'Received at Least Once',
								value: 1,
							},
							{
								name: 'Exactly Once',
								value: 2,
							},
						],
						default: 0,
						description: 'QoS subscription level',
					},
					{
						displayName: 'Retain',
						name: 'retain',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'Normally if a publisher publishes a message to a topic, and no one is subscribed to that topic the message is simply discarded by the broker. However the publisher can tell the broker to keep the last message on that topic by setting the retain flag to true.',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async mqttConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted<MqttCredential>,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				try {
					const protocol = credentials.protocol || 'mqtt';
					const host = credentials.host;
					const brokerUrl = `${protocol}://${host}`;
					const port = credentials.port || 1883;
					const clientId =
						credentials.clientId || `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
					const clean = credentials.clean as boolean;
					const ssl = credentials.ssl as boolean;
					const ca = formatPrivateKey(credentials.ca);
					const cert = formatPrivateKey(credentials.cert);
					const key = formatPrivateKey(credentials.key);
					const rejectUnauthorized = credentials.rejectUnauthorized as boolean;

					let client: mqtt.MqttClient;

					if (!ssl) {
						const clientOptions: mqtt.IClientOptions = {
							port,
							clean,
							clientId,
						};

						if (credentials.username && credentials.password) {
							clientOptions.username = credentials.username;
							clientOptions.password = credentials.password;
						}
						client = mqtt.connect(brokerUrl, clientOptions);
					} else {
						const clientOptions: mqtt.IClientOptions = {
							port,
							clean,
							clientId,
							ca,
							cert,
							key,
							rejectUnauthorized,
						};
						if (credentials.username && credentials.password) {
							clientOptions.username = credentials.username;
							clientOptions.password = credentials.password;
						}

						client = mqtt.connect(brokerUrl, clientOptions);
					}

					await new Promise((resolve, reject) => {
						client.on('connect', (test) => {
							resolve(test);
							client.end();
						});
						client.on('error', (error) => {
							client.end();
							reject(error);
						});
					});
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
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
		const length = items.length;
		const credentials = await this.getCredentials<MqttCredential>('mqtt');

		const protocol = credentials.protocol || 'mqtt';
		const host = credentials.host;
		const brokerUrl = `${protocol}://${host}`;
		const port = credentials.port || 1883;
		const clientId = credentials.clientId || `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
		const clean = credentials.clean;
		const ssl = credentials.ssl;
		const ca = credentials.ca;
		const cert = credentials.cert;
		const key = credentials.key;
		const rejectUnauthorized = credentials.rejectUnauthorized;

		let client: mqtt.MqttClient;

		if (!ssl) {
			const clientOptions: mqtt.IClientOptions = {
				port,
				clean,
				clientId,
			};

			if (credentials.username && credentials.password) {
				clientOptions.username = credentials.username;
				clientOptions.password = credentials.password;
			}

			client = mqtt.connect(brokerUrl, clientOptions);
		} else {
			const clientOptions: mqtt.IClientOptions = {
				port,
				clean,
				clientId,
				ca,
				cert,
				key,
				rejectUnauthorized,
			};
			if (credentials.username && credentials.password) {
				clientOptions.username = credentials.username;
				clientOptions.password = credentials.password;
			}

			client = mqtt.connect(brokerUrl, clientOptions);
		}

		const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

		const data = await new Promise((resolve, reject) => {
			client.on('connect', () => {
				for (let i = 0; i < length; i++) {
					let message;
					const topic = this.getNodeParameter('topic', i) as string;
					const options = this.getNodeParameter('options', i);

					try {
						if (sendInputData) {
							message = JSON.stringify(items[i].json);
						} else {
							message = this.getNodeParameter('message', i) as string;
						}
						client.publish(topic, message, options);
					} catch (e) {
						reject(e);
					}
				}
				//wait for the in-flight messages to be acked.
				//needed for messages with QoS 1 & 2
				client.end(false, {}, () => {
					resolve([items]);
				});

				client.on('error', (e) => {
					reject(e);
				});
			});
		});

		return data as INodeExecutionData[][];
	}
}
