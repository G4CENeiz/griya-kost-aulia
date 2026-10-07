import MarkdownIt from 'markdown-it'

/**
 * The Markdown subset of ADR-0024: headings, bold, italic, links, bullet and
 * numbered lists, blockquotes, horizontal rules, and paragraphs.
 *
 * `html: false` is the security boundary: a pasted `<script>` renders as text,
 * never as markup. Images are not part of the subset either, because the only
 * image path is the gallery upload (ADR-0025), so the image rule is disabled
 * and `![alt](url)` shows as its own text.
 */
const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  breaks: true,
})

markdown.disable(['image', 'html_block', 'html_inline'])

/**
 * With the image rule off, `![alt](url)` would still parse as a link and leave
 * a stray `!` in front of it. Reducing the syntax to its alt text keeps the
 * prose readable and keeps every image on the gallery path (ADR-0025).
 */
const IMAGE_SYNTAX = /!\[([^\]]*)\]\([^)]*\)/g

export function renderMarkdown(source: string): string {
  return markdown.render(source.replace(IMAGE_SYNTAX, '$1'))
}
