export type User = {
  id: number;
  supertokensId: string | null;
  name: string;
  email: string;
  avatarUrl: string;
  coverUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  createdAt: string;
};

export type Post = {
  id: number;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  content: string;
  imageUrl: string | null;
  audience: 'public' | 'friends' | 'only_me';
  createdAt: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  topReactions: ReactionType[];
  viewerReaction: ReactionType | null;
};

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export type Comment = {
  id: number;
  postId: number;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  content: string;
  createdAt: string;
};

export type Story = {
  id: number;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  imageUrl: string;
  createdAt: string;
};

export type FriendshipStatus = 'pending' | 'accepted';
