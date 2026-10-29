import zlib from 'zlib';
import { Content, GoogleGenAI, Part } from '@google/genai';
import { AiExecutedAction, ChatAttachment } from '../shared/types.js';
import {
  AiActorContext,
  buildRoleAwareSystemContext,
  executeAiToolCall,
  getAiFunctionDeclarationsForRole,
} from './aiTools.js';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

export interface GeminiChatOptions {
  messages: ChatMessage[];
  systemInstruction?: string;
  modelType?: 'pro' | 'flash' | 'fast';
  projectContext?: string;
  actor?: AiActorContext;
}

export interface GeminiChatResult {
  reply: string;
  modelUsed: string;
  executedActions: AiExecutedAction[];
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'js', 'jsx', 'mjs', 'cjs',
  'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'go', 'rs', 'rb',
  'php', 'swift', 'kt', 'kts', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'sql',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'sh', 'bash', 'zsh',
  'log', 'graphql', 'gql', 'prisma', 'vue', 'svelte', 'astro', 'r', 'lua', 'pl',
  'dockerfile', 'makefile', 'gitignore',
]);

const INLINE_IMAGE_MIMES: Record<string, string> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
};

const INLINE_MEDIA_MIMES: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/mp3': 'audio/mp3',
  'audio/mpeg': 'audio/mp3',
  'audio/aac': 'audio/aac',
  'audio/ogg': 'audio/ogg',
  'audio/flac': 'audio/flac',
  'audio/webm': 'audio/webm',
  'audio/mp4': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'video/mp4': 'video/mp4',
  'video/webm': 'video/webm',
  'video/quicktime': 'video/quicktime',
  'video/mpeg': 'video/mpeg',
};

const MAX_EXTRACTED_TEXT_CHARS = 180_000;

function getFileExtension(name: string): string {
  const clean = name.trim().toLowerCase();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1) return clean;
  return clean.slice(lastDot + 1);
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer; base64: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;

  const meta = dataUrl.slice(5, commaIdx);
  const rawPayload = dataUrl.slice(commaIdx + 1);
  const isBase64 = meta.includes(';base64');
  const detectedMime = (meta.split(';')[0] || 'application/octet-stream').trim().toLowerCase();

  try {
    const buffer = isBase64
      ? Buffer.from(rawPayload, 'base64')
      : Buffer.from(decodeURIComponent(rawPayload), 'utf-8');
    const base64 = isBase64 ? rawPayload.replace(/\s+/g, '') : buffer.toString('base64');
    return { mimeType: detectedMime, buffer, base64 };
  } catch {
    return null;
  }
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\/(w:p|p|div|tr|li|a:p|row)>/gi, '\n')
    .replace(/<(w:tab|br|w:br)\s*\/?>/gi, '\t')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function extractZipOrOfficeText(buffer: Buffer, ext: string): string | null {
  try {
    let offset = 0;
    const chunks: string[] = [];

    while (offset + 30 <= buffer.length) {
      const signature = buffer.readUInt32LE(offset);
      if (signature !== 0x04034b50) break;

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraFieldLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > buffer.length || compressedSize === 0xffffffff) break;

      const entryName = buffer.slice(nameStart, nameStart + fileNameLength).toString('utf-8');
      const entryExt = getFileExtension(entryName);

      const isRelevantOfficeXml =
        (ext === 'docx' && entryName === 'word/document.xml') ||
        (ext === 'xlsx' && (entryName === 'xl/sharedStrings.xml' || entryName.startsWith('xl/worksheets/sheet'))) ||
        (ext === 'pptx' && entryName.startsWith('ppt/slides/slide') && entryName.endsWith('.xml'));

      const isRelevantZipText =
        ext === 'zip' && !entryName.endsWith('/') && TEXT_EXTENSIONS.has(entryExt) && compressedSize < 512_000;

      if ((isRelevantOfficeXml || isRelevantZipText) && compressedSize > 0) {
        const slice = buffer.slice(dataStart, dataEnd);
        let rawContent: Buffer | null = null;
        if (compressionMethod === 0) {
          rawContent = slice;
        } else if (compressionMethod === 8) {
          rawContent = zlib.inflateRawSync(slice);
        }

        if (rawContent) {
          const utf8 = rawContent.toString('utf-8');
          if (isRelevantOfficeXml) {
            const cleaned = stripXmlTags(utf8);
            if (cleaned) chunks.push(cleaned);
          } else {
            chunks.push(`--- ${entryName} ---\n${utf8}`);
          }
        }
      }

      offset = dataEnd;
    }

    if (chunks.length === 0) return null;
    const joined = chunks.join('\n\n');
    return joined.length > MAX_EXTRACTED_TEXT_CHARS
      ? `${joined.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n...[Truncated]`
      : joined;
  } catch {
    return null;
  }
}

function isLikelyReadableUtf8(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspiciousBytes = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0) return false; // Null byte indicates binary
    if (byte < 7 || (byte > 14 && byte < 32 && byte !== 27)) {
      suspiciousBytes++;
    }
  }
  return suspiciousBytes / sample.length < 0.05;
}

export function resolveModelName(modelType: 'pro' | 'flash' | 'fast' = 'flash'): string {
  if (modelType === 'pro') return 'gemini-3.1-pro-preview';
  if (modelType === 'fast') return 'gemini-3.1-flash-lite';
  return 'gemini-3.8-flash';
}

export function buildAttachmentParts(attachments?: ChatAttachment[]): Part[] {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const parts: Part[] = [];

  for (const att of attachments) {
    if (!att) continue;
    const fileName = att.name || 'attachment';
    const ext = getFileExtension(fileName);
    const parsed = att.dataUrl ? parseDataUrl(att.dataUrl) : null;

    if (!parsed) {
      parts.push({
        text: `[Attached File: ${fileName} (${att.mimeType || 'unknown type'}, ${Math.round((att.sizeBytes || 0) / 1024)} KB)]`,
      });
      continue;
    }

    const declaredMime = (att.mimeType || parsed.mimeType || 'application/octet-stream').toLowerCase().trim();

    // 1. SVG vector images -> pass readable XML text so Gemini inspects diagrams/markup reliably
    if (declaredMime === 'image/svg+xml' || ext === 'svg') {
      const svgText = parsed.buffer.toString('utf-8').slice(0, MAX_EXTRACTED_TEXT_CHARS);
      parts.push({
        text: `📎 Attached SVG Image: ${fileName}\n\`\`\`svg\n${svgText}\n\`\`\``,
      });
      continue;
    }

    // 2. Known text, source code, markdown, CSV, JSON, YAML, SQL, log files
    // Checked BEFORE media MIME types because browsers often label `.ts` TypeScript files as `video/mp2t`
    const isExplicitTextMime =
      declaredMime.startsWith('text/') ||
      declaredMime === 'application/json' ||
      declaredMime === 'application/ld+json' ||
      declaredMime === 'application/xml' ||
      declaredMime === 'application/javascript' ||
      declaredMime === 'application/x-javascript' ||
      declaredMime === 'application/typescript' ||
      declaredMime === 'application/x-yaml' ||
      declaredMime === 'application/sql';

    if (TEXT_EXTENSIONS.has(ext) || isExplicitTextMime) {
      const rawText = parsed.buffer.toString('utf-8');
      const boundedText =
        rawText.length > MAX_EXTRACTED_TEXT_CHARS
          ? `${rawText.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n...[Content truncated at ${MAX_EXTRACTED_TEXT_CHARS} characters]`
          : rawText;
      parts.push({
        text: `📎 Attached File: ${fileName} (${declaredMime})\n--- BEGIN FILE CONTENT ---\n${boundedText}\n--- END FILE CONTENT ---`,
      });
      continue;
    }

    // 3. Supported raster images (PNG, JPEG, WEBP, GIF, HEIC, HEIF)
    const normalizedImageMime = INLINE_IMAGE_MIMES[declaredMime] || INLINE_IMAGE_MIMES[parsed.mimeType];
    if (normalizedImageMime) {
      parts.push({ text: `[Attached Picture: ${fileName}]` });
      parts.push({
        inlineData: {
          mimeType: normalizedImageMime,
          data: parsed.base64,
        },
      });
      continue;
    }

    // 4. Supported PDFs, audio, and video files
    const effectiveMime =
      ext === 'pdf'
        ? 'application/pdf'
        : INLINE_MEDIA_MIMES[declaredMime] || INLINE_MEDIA_MIMES[parsed.mimeType];

    if (effectiveMime) {
      parts.push({ text: `[Attached Document/Media: ${fileName} (${effectiveMime})]` });
      parts.push({
        inlineData: {
          mimeType: effectiveMime,
          data: parsed.base64,
        },
      });
      continue;
    }

    // 5. Office documents (.docx, .xlsx, .pptx) or .zip archives containing text/code
    if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx' || ext === 'zip') {
      const extracted = extractZipOrOfficeText(parsed.buffer, ext);
      if (extracted) {
        parts.push({
          text: `📎 Attached Document: ${fileName}\n--- BEGIN EXTRACTED CONTENT ---\n${extracted}\n--- END EXTRACTED CONTENT ---`,
        });
        continue;
      }
    }

    // 6. Fallback: if UTF-8 readable text with unknown extension, include decoded text; otherwise include metadata
    if (isLikelyReadableUtf8(parsed.buffer)) {
      const fallbackText = parsed.buffer.toString('utf-8').slice(0, MAX_EXTRACTED_TEXT_CHARS);
      parts.push({
        text: `📎 Attached File: ${fileName}\n--- BEGIN FILE CONTENT ---\n${fallbackText}\n--- END FILE CONTENT ---`,
      });
    } else {
      parts.push({
        text: `[Attached Binary File: ${fileName} (MIME: ${declaredMime}, Size: ${Math.max(1, Math.round(parsed.buffer.length / 1024))} KB)]`,
      });
    }
  }

  return parts;
}

export async function chatWithGemini({
  messages,
  systemInstruction,
  modelType = 'flash',
  projectContext,
  actor,
}: GeminiChatOptions): Promise<GeminiChatResult> {
  const ai = getAI();
  const modelName = resolveModelName(modelType);
  const roleContextBlock = actor ? `\n\n${buildRoleAwareSystemContext(actor)}` : '';

  const defaultInstruction = `You are Nexora AI Co-Pilot, an intelligent multimodal AI Assistant embedded within the Nexora Enterprise Project Platform.
Your mission is to help workspace users analyze project health, inspect attached screenshots/diagrams/pictures, review uploaded PDFs/documents/spreadsheets/code files, manage permissible workspace actions, debug technical issues, and optimize sprint velocity.
CRITICAL IDENTITY & PERMISSION PRINCIPLE: You operate strictly with the exact account permissions of the currently logged-in user. Never claim or attempt actions beyond the user's account role.
Keep responses well-structured, clear, actionable, and formatted nicely in Markdown with code blocks where appropriate.${projectContext ? `\n\nCURRENT PROJECT CONTEXT:\n${projectContext}` : ''}${roleContextBlock}`;

  const finalInstruction = systemInstruction
    ? `${systemInstruction}\n\nYou can directly inspect and analyze any pictures, screenshots, diagrams, PDFs, code files, spreadsheets, or documents attached by the user.\nCRITICAL IDENTITY & PERMISSION PRINCIPLE: You operate strictly with the exact account permissions of the currently logged-in user. Use your available function tools when the user asks you to perform workspace actions within their role, and clearly refuse actions outside their role.${projectContext ? `\n\nCURRENT PROJECT CONTEXT:\n${projectContext}` : ''}${roleContextBlock}`
    : defaultInstruction;

  const formattedContents: Content[] = messages
    .map((m) => {
      const attachmentParts = buildAttachmentParts(m.attachments);
      const trimmedText = (m.content || '').trim();
      const parts: Part[] = [...attachmentParts];

      if (trimmedText) {
        parts.push({ text: trimmedText });
      } else if (attachmentParts.length > 0) {
        parts.push({
          text: 'Please analyze the attached picture(s) and/or file(s), summarize the key information, and highlight any actionable findings.',
        });
      }

      if (parts.length === 0) return null;

      return {
        role: (m.role === 'assistant' ? 'model' : m.role) as 'user' | 'model',
        parts,
      };
    })
    .filter((entry): entry is { role: 'user' | 'model'; parts: Part[] } => entry !== null);

  if (formattedContents.length === 0) {
    throw new Error('At least one message or attachment is required.');
  }

  const functionDeclarations = actor ? getAiFunctionDeclarationsForRole(actor) : [];
  const executedActions: AiExecutedAction[] = [];
  const runningContents: Content[] = [...formattedContents];
  const MAX_TOOL_ROUNDS = 6;

  try {
    let response = await ai.models.generateContent({
      model: modelName,
      contents: runningContents,
      config: {
        systemInstruction: finalInstruction,
        ...(functionDeclarations.length > 0 ? { tools: [{ functionDeclarations }] } : {}),
      },
    });

    let round = 0;
    while (actor && response.functionCalls && response.functionCalls.length > 0 && round < MAX_TOOL_ROUNDS) {
      round += 1;
      const modelTurnContent = response.candidates?.[0]?.content;
      if (modelTurnContent) {
        runningContents.push(modelTurnContent);
      }

      const functionResponseParts: Part[] = [];
      for (const call of response.functionCalls) {
        const callName = call.name || 'unknown_tool';
        const outcome = await executeAiToolCall(
          callName,
          call.args as Record<string, any> | undefined,
          actor
        );
        executedActions.push(outcome.actionRecord);
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: callName,
            response: outcome.toolResponse,
          },
        });
      }

      runningContents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      response = await ai.models.generateContent({
        model: modelName,
        contents: runningContents,
        config: {
          systemInstruction: finalInstruction,
          ...(functionDeclarations.length > 0 ? { tools: [{ functionDeclarations }] } : {}),
        },
      });
    }

    const fallbackActionSummary =
      executedActions.length > 0
        ? executedActions
            .map((a) => (a.success ? `- Completed: ${a.summary}` : `- ${a.summary}`))
            .join('\n')
        : 'No response generated.';

    return {
      reply: response.text || fallbackActionSummary,
      modelUsed: modelName,
      executedActions,
    };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    if (error?.message?.includes('API_KEY')) {
      throw new Error('AI service configuration error on server.');
    }
    throw new Error(error?.message || 'Failed to generate response from Gemini AI.');
  }
}
