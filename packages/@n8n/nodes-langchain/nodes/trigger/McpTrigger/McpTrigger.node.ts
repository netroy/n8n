//import type { Tool } from '@langchain/core/tools';
import type { INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeConnectionTypes, Node } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import type { CompressionResponse } from './FlushingSSEServerTransport';
import { McpServerSingleton } from './McpServer';
import type { McpServer } from './McpServer';

const MCP_SSE_SETUP_PATH = 'sse';
const MCP_SSE_MESSAGES_PATH = 'messages';

export class McpTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'MCP Server Trigger',
		name: 'mcpTrigger',
		icon: {
			light: 'file:mcp.svg',
			dark: 'file:mcp.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Expose n8n tools as an MCP Server endpoint',
		eventTriggerDescription: '',
		activationMessage: 'You can now connect your MCP Clients to the SSE URL.',
		defaults: {
			name: 'MCP Server Trigger',
		},
		triggerPanel: {
			header: 'Listen for MCP events',
			executionsHelp: {
				inactive:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'test step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. <a data-key='activate'>Activate</a> the workflow, then make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
				active:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'test step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. Since your workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
			},
			activationHint:
				'Once you’ve finished building your workflow, run it without having to click this button by using the production URL.',
		},
		inputs: [
			{
				type: NodeConnectionTypes.AiTool,
				displayName: 'Tools',
			},
		],
		outputs: [],
		properties: [],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: MCP_SSE_SETUP_PATH,
				ndvHideMethod: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: MCP_SSE_MESSAGES_PATH,
				ndvHideUrl: true,
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = context.getWebhookName();

		const req = context.getRequestObject();
		const resp = context.getResponseObject() as unknown as CompressionResponse;

		const mcpServer: McpServer = McpServerSingleton.instance(context.logger);

		if (webhookName === 'setup') {
			// Sets up the transport and opens the long-lived connection. This resp
			// will stay streaming, and is the channel that sends the events
			const postUrl = new URL(context.getNodeWebhookUrl('default') ?? '/mcp/messages').pathname;
			await mcpServer.connectTransport(postUrl, resp);

			return { noWebhookResponse: true };
		} else if (webhookName === 'default') {
			// This is the command-channel, and is actually executing the tools. This
			// sends the response back through the long-lived connection setup in the
			// 'setup' call
			const connectedTools = await getConnectedTools(context, true);

			const wasToolCall = await mcpServer.handlePostMessage(req, resp, connectedTools);

			if (wasToolCall) return { noWebhookResponse: true, workflowData: [[{ json: {} }]] };
			return { noWebhookResponse: true };
		}

		return { workflowData: [[{ json: {} }]] };
	}
}
