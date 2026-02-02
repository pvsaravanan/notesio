const cache = new Map<string, string>()

export const parseMarkdown = (text: string): string => {
  if (cache.has(text)) {
    return cache.get(text)!
  }

  const result = text
    // Headers - fix multiline flag
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-slate-800 mb-2 mt-4 font-sans">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-slate-800 mb-3 mt-5 font-sans">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-slate-800 mb-4 mt-6 font-sans">$1</h1>')
    // Images
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-2xl border border-slate-200 my-4" />',
    )
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 font-sans">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 font-sans">$1</em>')
    // Code - fix backtick matching
    .replace(/`([^`\n]+)`/g, '<code class="bg-slate-100 px-2 py-1 rounded text-sm font-mono text-slate-800">$1</code>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-orange-400 pl-4 italic text-slate-700 my-2 font-sans">$1</blockquote>')
    // Task lists - fix checkbox symbols
    .replace(/^- \[x\] (.*$)/gm, '<li class="text-slate-700 mb-1 flex items-center font-sans"><span class="text-orange-500 mr-2">✓</span>$1</li>')
    .replace(/^- \[ \] (.*$)/gm, '<li class="text-slate-700 mb-1 flex items-center font-sans"><span class="text-slate-400 mr-2">☐</span>$1</li>')
    // Regular lists
    .replace(/^- (.*$)/gm, '<li class="text-slate-700 mb-1 font-sans">• $1</li>')
    // Numbered lists
    .replace(/^\d+\. (.*$)/gm, '<li class="text-slate-700 mb-1 font-sans list-decimal ml-4">$1</li>')
    // Handle drawing blocks
    .replace(/```drawing\n([\s\S]*?)\n```/g, '<div class="drawing-block" data-drawing="$1">[Drawing]</div>')
    // Convert double line breaks to paragraph breaks
    .replace(/\n\s*\n/g, '</p><p class="mb-4 leading-relaxed text-slate-700">')
    // Convert single line breaks to <br>
    .replace(/\n/g, '<br>')

  // Wrap content in paragraph if it doesn't start with a block element
  const wrappedResult = result.startsWith('<h') || result.startsWith('<ul') || result.startsWith('<ol') || result.startsWith('<blockquote') 
    ? result 
    : `<p class="mb-4 leading-relaxed text-slate-700">${result}</p>`

  // Fix list wrapping - more robust regex
  const finalResult = wrappedResult.replace(
    /((?:<li class="[^"]*">[\s\S]*?<\/li>\s*)+)/g,
    '<ul class="list-inside space-y-1 my-2 ml-4">$1</ul>',
  )

  cache.set(text, finalResult)
  return finalResult
}