
const fs = require('fs');
const lines = fs.readFileSync('scratch_transcript.jsonl', 'utf8').split('\n');
let content = '';

function applyReplace(content, target, replacement) {
    if (content.includes(target)) {
        return content.replace(target, replacement);
    }
    // Try relaxing CRLF to LF
    let c2 = content.replace(/\r\n/g, '\n');
    let t2 = target.replace(/\r\n/g, '\n');
    if (c2.includes(t2)) {
        return c2.replace(t2, replacement.replace(/\r\n/g, '\n'));
    }
    console.error('Failed to apply a patch!');
    return content;
}

for (const line of lines) {
  if (!line) continue;
  try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          const args = call.args || call.arguments;
          if (!args) continue;
          const file = args.TargetFile || args.TargetFile;
          if (file && file.includes('page.tsx')) {
            if (call.name === 'write_to_file' || call.id?.includes('write_to_file')) {
              content = args.CodeContent;
            } else if (call.name === 'replace_file_content' || call.id?.includes('replace_file_content')) {
              content = applyReplace(content, args.TargetContent, args.ReplacementContent);
            } else if (call.name === 'multi_replace_file_content' || call.id?.includes('multi_replace_file_content')) {
              for (const chunk of args.ReplacementChunks || args.replacementChunks) {
                  content = applyReplace(content, chunk.TargetContent || chunk.targetContent, chunk.ReplacementContent || chunk.replacementContent);
              }
            }
          }
        }
      }
  } catch (e) {
  }
}
fs.writeFileSync('recovered_page.tsx', content);
console.log('Recovery finished. File size:', content.length);

