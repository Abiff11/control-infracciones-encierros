interface LoadingMessageProps {
  message: string;
}

export function LoadingMessage({ message }: LoadingMessageProps) {
  return <div className="notice">{message}</div>;
}
