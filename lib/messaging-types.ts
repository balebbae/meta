export type ChatUser = {
  id: number;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
};

export type ConversationMember = ChatUser & {
  role: 'admin' | 'member';
  lastReadMessageId: number | null;
};

export type Message = {
  id: number;
  conversationId: number;
  sender: Pick<ChatUser, 'id' | 'name' | 'avatarUrl'> | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  /** Client only: temp id while an optimistic send is in flight. */
  pending?: boolean;
  failed?: boolean;
};

export type Conversation = {
  id: number;
  isGroup: boolean;
  /** Display title: group name, or the other member's name in a DM. */
  title: string;
  /** Group image or the other member's avatar. */
  imageUrl: string;
  isOnline: boolean;
  members: ConversationMember[];
  lastMessage: Message | null;
  unreadCount: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};
