import ReactMarkdown from 'react-markdown';

interface MarkdownBodyProps {
  body: string;
}

export function MarkdownBody({ body }: MarkdownBodyProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown>{body}</ReactMarkdown>
    </div>
  );
}
