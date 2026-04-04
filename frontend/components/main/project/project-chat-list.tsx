export type ProjectChat = {
  id: string;
  title: string;
  time: string;
};

interface ProjectChatListProps {
  chats: ProjectChat[];
}

export function ProjectChatList({ chats }: ProjectChatListProps) {
  return (
    <div className="space-y-0 w-full pt-2 border-t border-border/40">
      {chats.map((chat) => (
        <div key={chat.id} className="py-4 border-b border-border/40 hover:bg-muted/10 transition-colors cursor-pointer group">
          <h3 className="text-[14.5px] font-medium text-foreground group-hover:underline decoration-muted-foreground underline-offset-4">
            {chat.title}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1.5 font-medium">
            {chat.time}
          </p>
        </div>
      ))}
    </div>
  );
}
