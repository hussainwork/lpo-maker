export type Message = { kind: 'error' | 'ok'; text: string };

export function Banner({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <p className={`banner ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  );
}
