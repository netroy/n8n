import z from 'zod/v4';
import type { ICredentialType, INodeProperties, NodePropertyTypes } from './interfaces';

type PropertyMetadata = Pick<
	INodeProperties,
	'description' | 'displayName' | 'hint' | 'placeholder' | 'typeOptions' | 'default'
>;

function getMeta(schema: z.ZodType): PropertyMetadata | undefined {
	return (schema as z.ZodType & { _meta?: PropertyMetadata })._meta;
}

function mapZodTypeToNodeType(schema: z.ZodType): NodePropertyTypes {
	if (schema instanceof z.ZodNumber) return 'number';
	if (schema instanceof z.ZodBoolean) return 'boolean';
	if (schema instanceof z.ZodEnum) return 'options';
	if (schema instanceof z.ZodRecord) return 'json';
	return 'string';
}

function zodToNodeProperty(name: string, schema: z.ZodType): INodeProperties {
	const meta = getMeta(schema);
	const zodSchema = schema instanceof z.ZodOptional ? (schema.unwrap() as z.ZodType) : schema;

	const property: INodeProperties = {
		name,
		description: meta?.description,
		displayName: meta?.displayName ?? name,
		type: mapZodTypeToNodeType(zodSchema),
		default: meta?.default,
	};

	if (meta?.hint) {
		property.hint = meta.hint;
	}
	if (meta?.placeholder) {
		property.placeholder = meta.placeholder as string;
	}
	if (meta?.typeOptions) {
		property.typeOptions = meta.typeOptions;
	}
	if (zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodNullable) {
		property.required = false;
	}

	return property;
}

function extractPropertiesFromSchema(schema: z.ZodType): INodeProperties[] {
	const properties: INodeProperties[] = [];

	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		for (const [key, value] of Object.entries(shape)) {
			properties.push(zodToNodeProperty(key, value as z.ZodType));
		}
	}

	return properties;
}

type BaseCredentialWithProperties = Pick<ICredentialType, 'properties'>;

export class CredentialClass {
	static fromSchema<T extends z.ZodType>(schema: T): new () => BaseCredentialWithProperties {
		return class GeneratedCredential
			extends CredentialClass
			implements BaseCredentialWithProperties
		{
			readonly properties = extractPropertiesFromSchema(schema);
		};
	}
}
