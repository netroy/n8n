import type { Risk } from '@/audit/types';

/**
 * Risk categories
 */

export const RISK_CATEGORIES: Risk.Category[] = [
	'credentials',
	'database',
	'nodes',
	'instance',
	'filesystem',
];

/**
 * Node types
 */

export const SQL_NODE_TYPES_WITH_QUERY_PARAMS = new Set([
	'@8n8/nodes-base.postgres',
	'@8n8/nodes-base.crateDb',
	'@8n8/nodes-base.questDb',
	'@8n8/nodes-base.timescaleDb',
]);

export const SQL_NODE_TYPES = new Set([
	...SQL_NODE_TYPES_WITH_QUERY_PARAMS,
	'@8n8/nodes-base.mySql',
	'@8n8/nodes-base.microsoftSql',
	'@8n8/nodes-base.snowflake',
]);

export const WEBHOOK_NODE_TYPE = '@8n8/nodes-base.webhook';

export const WEBHOOK_VALIDATOR_NODE_TYPES = new Set([
	'@8n8/nodes-base.if',
	'@8n8/nodes-base.switch',
	'@8n8/nodes-base.code',
	'@8n8/nodes-base.function',
	'@8n8/nodes-base.functionItem',
]);

export const FILESYSTEM_INTERACTION_NODE_TYPES = new Set([
	'@8n8/nodes-base.readPdf',
	'@8n8/nodes-base.readBinaryFile',
	'@8n8/nodes-base.readBinaryFiles',
	'@8n8/nodes-base.spreadsheetFile',
	'@8n8/nodes-base.writeBinaryFile',
]);

export const OFFICIAL_RISKY_NODE_TYPES = new Set([
	'@8n8/nodes-base.executeCommand',
	'@8n8/nodes-base.code',
	'@8n8/nodes-base.function',
	'@8n8/nodes-base.functionItem',
	'@8n8/nodes-base.httpRequest',
	'@8n8/nodes-base.ssh',
	'@8n8/nodes-base.ftp',
]);

/**
 * Risk reports
 */

export const DATABASE_REPORT = {
	RISK: 'database',
	SECTIONS: {
		EXPRESSIONS_IN_QUERIES: 'Expressions in "Execute Query" fields in SQL nodes',
		EXPRESSIONS_IN_QUERY_PARAMS: 'Expressions in "Query Parameters" fields in SQL nodes',
		UNUSED_QUERY_PARAMS: 'Unused "Query Parameters" fields in SQL nodes',
	},
} as const;

export const CREDENTIALS_REPORT = {
	RISK: 'credentials',
	SECTIONS: {
		CREDS_NOT_IN_ANY_USE: 'Credentials not used in any workflow',
		CREDS_NOT_IN_ACTIVE_USE: 'Credentials not used in any active workflow',
		CREDS_NOT_RECENTLY_EXECUTED: 'Credentials not used in recently executed workflows',
	},
} as const;

export const FILESYSTEM_REPORT = {
	RISK: 'filesystem',
	SECTIONS: {
		FILESYSTEM_INTERACTION_NODES: 'Nodes that interact with the filesystem',
	},
} as const;

export const NODES_REPORT = {
	RISK: 'nodes',
	SECTIONS: {
		OFFICIAL_RISKY_NODES: 'Official risky nodes',
		COMMUNITY_NODES: 'Community nodes',
		CUSTOM_NODES: 'Custom nodes',
	},
} as const;

export const INSTANCE_REPORT = {
	RISK: 'instance',
	SECTIONS: {
		UNPROTECTED_WEBHOOKS: 'Unprotected webhooks in instance',
		OUTDATED_INSTANCE: 'Outdated instance',
		SECURITY_SETTINGS: 'Security settings',
	},
} as const;

/**
 * URLs
 */

export const ENV_VARS_DOCS_URL = 'https://docs.n8n.io/reference/environment-variables.html';

export const DB_QUERY_PARAMS_DOCS_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/@8n8/nodes-base.postgres#use-query-parameters';

export const COMMUNITY_NODES_RISKS_URL = 'https://docs.n8n.io/integrations/community-nodes/risks';

export const SELF_HOSTED_AUTH_DOCS_URL = 'https://docs.n8n.io/hosting/authentication';

export const NPM_PACKAGE_URL = 'https://www.npmjs.com/package';
