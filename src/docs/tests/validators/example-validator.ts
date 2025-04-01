import { readFileSync } from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ProductSchema, OrderSchema, OrderItemSchema, UserSchema } from '../../schemas/schemas';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv); 

export async function testExamples() {
  const examplesDir = 'src/docs/tests/examples/';
  const exampleFiles = {
    'product.example.json': ProductSchema,
    'order.example.json': OrderSchema,
    'order-item.example.json': OrderItemSchema,
    'user.example.json': UserSchema,
  };

  for (const [file, schema] of Object.entries(exampleFiles)) {
    try {
      const example = JSON.parse(readFileSync(`${examplesDir}${file}`, 'utf8'));
      
      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        throw new Error(`Example validation failed for ${file}: ${JSON.stringify(validate.errors)}`);
      }

      console.log(`Example validation passed for ${file}`);
    } catch (error) {
      throw new Error(`Example validation error for ${file}: ${error.message}`);
    }
  }
}