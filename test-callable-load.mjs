import fs from 'fs';
import { jsonLdToV2 } from './src/utils/checkpoint-converter.ts';

// This won't actually run because TypeScript, but let's test the logic
const checkpointPath = '../checkpoints/latest_rubric_advanced_with_callables.jsonld';
const jsonld = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));

console.log('Testing jsonLdToV2 conversion...');
try {
  const unified = jsonLdToV2(jsonld);
  
  console.log('\nGlobal Rubric:');
  console.log('  LLM Traits:', unified.global_rubric?.traits?.length || 0);
  console.log('  Regex Traits:', unified.global_rubric?.regex_traits?.length || 0);
  console.log('  Callable Traits:', unified.global_rubric?.callable_traits?.length || 0);
  
  if (unified.global_rubric?.callable_traits) {
    console.log('\nCallable Traits Loaded:');
    unified.global_rubric.callable_traits.forEach(t => {
      console.log(`  - ${t.name} (${t.kind})`);
    });
  }
  
  console.log('\n✅ Successfully loaded checkpoint with callable traits!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
