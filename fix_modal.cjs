const fs = require('fs');
let content = fs.readFileSync('src/components/projects/DocumentPreviewModal.tsx', 'utf-8');

// Replace `let textPreview = '';` and the if block with state
content = content.replace("  let textPreview = '';", "  const [textPreview, setTextPreview] = React.useState('');\n  React.useEffect(() => {\n    if (isCode) {\n      if (file.dataUrl.startsWith('data:')) {\n        try {\n          const base64Index = file.dataUrl.indexOf('base64,');\n          if (base64Index !== -1) {\n            let text = atob(file.dataUrl.substring(base64Index + 7));\n            if (file.name.endsWith('.json')) { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }\n            setTextPreview(text);\n          }\n        } catch { setTextPreview('Unable to decode raw file data for preview.'); }\n      } else if (file.dataUrl.startsWith('/api/files/')) {\n        fetch(file.dataUrl).then(res => res.text()).then(text => {\n          if (file.name.endsWith('.json')) { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }\n          setTextPreview(text);\n        }).catch(() => setTextPreview('Unable to load file content.'));\n      }\n    }\n  }, [file.dataUrl, isCode, file.name]);");

content = content.replace(/if \(isCode && file\.dataUrl\.startsWith\('data:'\)\) \{[\s\S]*?\}\n  \}\n\n  return \(/, "return (");

if (!content.includes("import React")) {
   content = content.replace("import { useState }", "import React, { useState }");
}

fs.writeFileSync('src/components/projects/DocumentPreviewModal.tsx', content, 'utf-8');
