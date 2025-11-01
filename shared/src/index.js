"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = buildSystemPrompt;
function buildSystemPrompt(style, language) {
    var base = 'You are an assistant for technical blog writing.';
    var styleText = style === 'tech-blog' ? 'Concise, clear, developer-friendly tone.' : style === 'formal' ? 'Formal, precise tone.' : 'Casual, friendly tone.';
    var langText = language === 'ja' ? 'Language: Japanese.' : 'Language: English.';
    return "".concat(base, " ").concat(styleText, " ").concat(langText, " Keep Markdown and code blocks untouched.");
}
