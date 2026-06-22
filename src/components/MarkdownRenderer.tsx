import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  return (
    <div className={`markdown-content prose prose-slate prose-invert max-w-none dark:prose-invert prose-orange prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-orange-400 prose-strong:text-white prose-ol:list-decimal prose-ul:list-disc prose-table:border-collapse prose-th:border prose-th:border-slate-700 prose-th:p-2 prose-td:border prose-td:border-slate-700 prose-td:p-2 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
