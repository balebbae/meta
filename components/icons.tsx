import type {SVGProps} from 'react';
import type {ReactionType} from '@/lib/types';
import {FbImg, FbSprite, FbSvg} from '@/components/pages/icons-fb';

type IconProps = SVGProps<SVGSVGElement> & {size?: number};

function Svg({size = 24, children, ...rest}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

/* ---------- Brand ---------- */
export function StravaIcon(props: IconProps) {
  return <Svg {...props}><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599 2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></Svg>;
}

export function FacebookLogo({size = 40}: {size?: number}) {
  return <FbSvg name="logo" size={size} style={{color: 'var(--fb-blue)'}} title="Facebook" />;
}

/* ---------- Header nav (outline / filled) ---------- */
export function HomeIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return <FbSvg name={active ? 'homeActive' : 'home'} size={size} className={className} style={style} />;
}

export function VideoIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return <FbSvg name={active ? 'reelsActive' : 'reels'} size={size} className={className} style={style} />;
}

/** Activities: a dumbbell in the same 2px rounded weight as the Facebook tab glyphs; solid when active. */
export function ActivitiesIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <rect x="4.5" y="3.5" width="4.5" height="17" rx="1.75" />
      <rect x="15" y="3.5" width="4.5" height="17" rx="1.75" />
      <path d="M4.5 8H3a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 3 16h1.5M19.5 8H21a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 21 16h-1.5M9 12h6" />
    </svg>
  );
}
export function MarketplaceIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return <FbSvg name={active ? 'marketplaceActive' : 'marketplace'} size={size} className={className} style={style} />;
}

export function GroupsIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return <FbSvg name={active ? 'groupsActive' : 'groups'} size={size} className={className} style={style} />;
}

export function GamingIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <path d="M7 5h10a6 6 0 016 6v4.2A3.8 3.8 0 0119.2 19c-1.2 0-2.3-.6-3-1.5L15 16H9l-1.2 1.5A3.8 3.8 0 014.8 19 3.8 3.8 0 011 15.2V11a6 6 0 016-6zm.5 3.5a.8.8 0 00-.8.8v1.2H5.5a.8.8 0 000 1.6h1.2v1.2a.8.8 0 001.6 0v-1.2h1.2a.8.8 0 000-1.6H8.3V9.3a.8.8 0 00-.8-.8zM15.5 9a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.8 2.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M7.5 6h9a5.5 5.5 0 015.5 5.5v3.4a3.1 3.1 0 01-5.5 2L15.2 15H8.8l-1.3 1.9A3.1 3.1 0 012 15V11.5A5.5 5.5 0 017.5 6z" />
      <path d="M7.5 9.5v3.6M5.7 11.3h3.6" strokeLinecap="round" />
      <circle cx="15.5" cy="10.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="18.2" cy="12.4" r=".9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function FriendsIcon({active, size = 24, className, style}: IconProps & {active?: boolean}) {
  return <FbSvg name={active ? 'friendsActive' : 'friends'} size={size} className={className} style={style} />;
}

/* ---------- Generic UI ---------- */
export function MenuGridIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="menuGrid" size={size} className={className} style={style} />;
}

export function MessengerIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="messenger" size={size} className={className} style={style} />;
}

export function BellIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="bell" size={size} className={className} style={style} />;
}

export function SearchIcon({size = 16, className, style}: IconProps) {
  return <FbSvg name="search" size={size} className={className} style={style} />;
}

export function CaretDownIcon({size = 12, className, style}: IconProps) {
  return <FbSvg name="caret" size={size} className={className} style={style} />;
}

export function CaretDownSmallIcon({size = 12, className, style}: IconProps) {
  return <FbSvg name="caret" size={size} className={className} style={style} />;
}

export function ChevronDownIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="chevronDown" size={size} className={className} style={style} />;
}

export function ChevronUpIcon({size = 16, className, style}: IconProps) {
  return <FbSvg name="chevronUp" size={size} className={className} style={style} />;
}

export function ChevronRightIcon({size = 24, className, style}: IconProps) {
  return <FbSvg name="chevronLeft24" size={size} className={className} style={{transform: 'scaleX(-1)', ...style}} />;
}

export function ChevronLeftIcon({size = 24, className, style}: IconProps) {
  return <FbSvg name="chevronLeft24" size={size} className={className} style={style} />;
}

export function ArrowLeftIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="arrowLeft20" size={size} className={className} style={style} />;
}

export function CloseIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="close20" size={size} className={className} style={style} />;
}

export function MoreHorizontalIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="more20" size={size} className={className} style={style} />;
}

export function PlusIcon({size = 24, className, style}: IconProps) {
  return <FbSvg name="plus24" size={size} className={className} style={style} />;
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z" />
    </Svg>
  );
}
export function GlobeIcon({size = 12, className, style}: IconProps) {
  return <FbImg name="publicAudience12" size={size} className={className} style={style} />;
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a5 5 0 015 5v3h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3zm0 10a1.5 1.5 0 00-.8 2.8V18a.8.8 0 001.6 0v-1.2A1.5 1.5 0 0012 14z" />
    </Svg>
  );
}

/* ---------- Post actions ---------- */
export function LikeIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="like20" size={size} className={className} style={style} />;
}

export function LikeFilledIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="likeFilled20" size={size} className={className} style={style} />;
}

export function CommentIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="comment20" size={size} className={className} style={style} />;
}

export function ShareIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="share20" size={size} className={className} style={style} />;
}

export function PhotoIcon({size = 24, className, style}: IconProps) {
  return <FbImg name="photoVideo24" size={size} className={className} style={style} />;
}

export function LiveVideoIcon({size = 24, className, style}: IconProps) {
  return <FbImg name="liveVideo24" size={size} className={className} style={style} />;
}

export function FeelingIcon({size = 24, className, style}: IconProps) {
  return <FbImg name="feeling24" size={size} className={className} style={style} />;
}

export function EmojiIcon({size = 16, className, style}: IconProps) {
  return <FbSvg name="emoji16" size={size} className={className} style={style} />;
}

export function GifIcon({size = 16, className, style}: IconProps) {
  return <FbSprite name="gif16" size={size} className={className} style={style} />;
}

export function StickerIcon({size = 16, className, style}: IconProps) {
  return <FbSprite name="sticker16" size={size} className={className} style={style} />;
}

export function CameraIcon({size = 16, className, style}: IconProps) {
  return <FbSprite name="photo16" size={size} className={className} style={style} />;
}

export function TagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" fill="#1877F2" />
      <path d="M12 13c4.4 0 8 2.5 8 5.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-1.5c0-3 3.6-5.5 8-5.5z" fill="#1877F2" />
    </Svg>
  );
}
export function LocationIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="#F5533D" />
    </Svg>
  );
}
export function VideoCameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h10a2 2 0 012 2v1.6l3.4-2.3a1 1 0 011.6.8v7.8a1 1 0 01-1.6.8L16 14.4V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </Svg>
  );
}
export function TextBgIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 38} height={p.size ?? 38} viewBox="0 0 38 38" aria-hidden="true">
      <defs>
        <linearGradient id="aa" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff4d7c" />
          <stop offset=".5" stopColor="#a85cff" />
          <stop offset="1" stopColor="#4a7cff" />
        </linearGradient>
      </defs>
      <rect width="38" height="38" rx="8" fill="url(#aa)" />
      <text x="19" y="25" textAnchor="middle" fontFamily="var(--fb-font)" fontWeight="700" fontSize="17" fill="#fff">
        Aa
      </text>
    </svg>
  );
}

/* ---------- Menus ---------- */
export function BookmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h10a2 2 0 012 2v15.4a.6.6 0 01-.95.5L12 17l-6.05 3.9A.6.6 0 015 20.4V5a2 2 0 012-2z" />
    </Svg>
  );
}
export function PencilIcon({size = 16, className, style}: IconProps) {
  return <FbImg name="editProfile16" size={size} className={className} style={style} />;
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6a1 1 0 011 1v1h4a1 1 0 010 2h-1v12a3 3 0 01-3 3H8a3 3 0 01-3-3V7H4a1 1 0 010-2h4V4a1 1 0 011-1zm1 2v0h4V5h-4zM7 7v12a1 1 0 001 1h8a1 1 0 001-1V7H7zm3 2.5a.8.8 0 01.8.8v6.4a.8.8 0 01-1.6 0v-6.4a.8.8 0 01.8-.8zm4 0a.8.8 0 01.8.8v6.4a.8.8 0 01-1.6 0v-6.4a.8.8 0 01.8-.8z" />
    </Svg>
  );
}
export function EyeOffIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="eyeOff20" size={size} className={className} style={style} />;
}

export function UnfollowIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 3a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 11c2.1 0 4 .5 5.4 1.3-.9 1-1.4 2.3-1.4 3.7 0 .7.1 1.4.4 2H3a1 1 0 01-1-1v-1c0-2.8 3.6-5 8-5zm9 1.5l1.4 1.4-1.6 1.6 1.6 1.6-1.4 1.4-1.6-1.6-1.6 1.6-1.4-1.4 1.6-1.6-1.6-1.6 1.4-1.4 1.6 1.6 1.6-1.6z" />
    </Svg>
  );
}
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm0 3a1 1 0 011 1v3.6l2.7 1.6a1 1 0 11-1 1.7l-3.2-1.9a1 1 0 01-.5-.9V8a1 1 0 011-1z" />
    </Svg>
  );
}
export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a3 3 0 013 3v11a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h1V3a1 1 0 011-1zm13 8H4v8a1 1 0 001 1h14a1 1 0 001-1v-8zm-12 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </Svg>
  );
}
export function SettingsIcon({size = 24, className, style}: IconProps) {
  return <FbSvg name="settings24" size={size} className={className} style={style} />;
}

export function HelpIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="help20" size={size} className={className} style={style} />;
}

export function MoonIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="display20" size={size} className={className} style={style} />;
}

export function FeedbackIcon({size = 20, className, style}: IconProps) {
  return <FbSvg name="report20" size={size} className={className} style={style} />;
}

export function LogoutIcon({size = 20, className, style}: IconProps) {
  return <FbSprite name="logout20" size={size} className={className} style={style} />;
}

export function CakeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2c.8 1 1.5 2 1.5 3a1.5 1.5 0 11-3 0c0-1 .7-2 1.5-3zm-1 6h2v2.5h3.5A2.5 2.5 0 0119 13v1.3c-.7.5-1.4.7-2 .7-.9 0-1.5-.4-2.5-1-1 .6-1.6 1-2.5 1s-1.5-.4-2.5-1c-1 .6-1.6 1-2.5 1-.6 0-1.3-.2-2-.7V13a2.5 2.5 0 012.5-2.5H11V8zM5 16.2c.7.4 1.4.6 2 .6.9 0 1.5-.4 2.5-1 1 .6 1.6 1 2.5 1s1.5-.4 2.5-1c1 .6 1.6 1 2.5 1 .6 0 1.3-.2 2-.6V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-3.8z" fill="#F7B928" />
    </Svg>
  );
}
export function UsersIcon(p: IconProps) {
  return <FriendsIcon active {...p} />;
}
export function ThumbTabIcon(p: IconProps) {
  return <LikeFilledIcon {...p} />;
}

/* ---------- Left rail 36px coloured icons ---------- */
function RailBase({children, size = 36}: {children: React.ReactNode; size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      {children}
    </svg>
  );
}
const blue = (id: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#19AFFF" />
      <stop offset="1" stopColor="#0062E0" />
    </linearGradient>
  </defs>
);
export function RailFriendsIcon() {
  return <FbSprite name="railFriends" />;
}

export function RailMemoriesIcon() {
  return <FbSprite name="railMemories" />;
}

export function RailSavedIcon() {
  return <FbSprite name="railSaved" />;
}

export function RailGroupsIcon() {
  return <FbSprite name="railGroups" />;
}

export function RailVideoIcon() {
  return <FbSprite name="railReels" />;
}

export function RailMarketplaceIcon() {
  return <FbSprite name="railMarketplace" />;
}

export function RailFeedsIcon() {
  return <FbImg name="feeds36" size={36} />;
}

export function RailEventsIcon() {
  return <FbSprite name="railEvents" />;
}

export function RailAdsIcon() {
  return <FbSprite name="railAds" />;
}

export function RailPagesIcon() {
  return <FbSprite name="railPages" />;
}

export function RailGamingIcon() {
  return <FbSprite name="railGaming" />;
}

export function RailActivitiesIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/activities-icon.png" width={36} height={36} alt="" draggable={false} />;
}

export function RailMessengerIcon() {
  return <FbSprite name="railMessenger" />;
}

export function RailFundraiserIcon() {
  return <FbSprite name="railFundraisers" />;
}

export function RailReelsIcon() {
  return <FbSprite name="railReels" />;
}

export function RailClimateIcon() {
  return <FbSprite name="railClimate" />;
}

export function RailOrdersIcon() {
  return <FbSprite name="railOrders" />;
}

/* ---------- Reactions ---------- */
export function ReactionIcon({type, size = 18}: {type: ReactionType; size?: number}) {
  const name = type === 'like' ? 'reactionLike' : type === 'love' ? 'reactionLove' : type === 'care' ? 'reactionCare' : type === 'haha' ? 'reactionHaha' : type === 'wow' ? 'reactionWow' : type === 'sad' ? 'reactionSad' : 'reactionAngry';
  return <FbImg name={name} size={size} alt={type} style={{borderRadius: '50%'}} />;
}

export const REACTIONS: {type: ReactionType; label: string; color: string}[] = [
  {type: 'like', label: 'Like', color: '#0866FF'},
  {type: 'love', label: 'Love', color: '#F33E58'},
  {type: 'care', label: 'Care', color: '#F7B125'},
  {type: 'haha', label: 'Haha', color: '#F7B125'},
  {type: 'wow', label: 'Wow', color: '#F7B125'},
  {type: 'sad', label: 'Sad', color: '#F7B125'},
  {type: 'angry', label: 'Angry', color: '#E9710F'},
];

export function RailMetaAIIcon() {
  return <FbSprite name="metaAi" />;
}

export function ComposeIcon({size = 16, className, style}: IconProps) {
  return <FbSvg name="compose16" size={size} className={className} style={style} />;
}

export function WarningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 13.3a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zM12 6a1.1 1.1 0 00-1.1 1.2l.4 5.6a.7.7 0 001.4 0l.4-5.6A1.1 1.1 0 0012 6z" />
    </Svg>
  );
}

export function ExpandIcon({size = 16, className, style}: IconProps) {
  return <FbSvg name="seeAll16" size={size} className={className} style={style} />;
}

