import type {SVGProps} from 'react';
import {FbImg, FbSprite, FbSvg} from '@/components/pages/icons-fb';

type IconProps = SVGProps<SVGSVGElement> & {size?: number};

function base({size = 24, ...rest}: IconProps) {
  return {width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true, ...rest} as const;
}

export const SearchIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="search16" size={size} className={className} style={{...style}} />;
export const GearIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="gear20" size={size} className={className} style={{...style}} />;
export const HomeIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="home" size={size} className={className} style={{...style}} />;
export const LiveIcon = ({size = 24, className, style}: IconProps) => <FbImg name="liveVideo24" size={size} className={className} style={style} />;
export const ReelsIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="reels" size={size} className={className} style={{...style}} />;
export const ShowsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 4h15A3.5 3.5 0 0 1 23 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 16.5v-9A3.5 3.5 0 0 1 4.5 4Zm5 5.1v5.8c0 .62.68 1 1.21.67l4.6-2.9a.8.8 0 0 0 0-1.34l-4.6-2.9a.8.8 0 0 0-1.21.67Z" />
  </svg>
);
export const ExploreIcon = ({size = 20, className, style}: IconProps) => <FbSprite name="groupsDiscover20" size={size} className={className} style={style} />;
export const BookmarkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 1.5h11a3 3 0 0 1 3 3V21a1.5 1.5 0 0 1-2.39 1.2L12 17.63 5.89 22.2A1.5 1.5 0 0 1 3.5 21V4.5a3 3 0 0 1 3-3Z" />
  </svg>
);
export const BookmarkOutlineIcon = (p: IconProps) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6.5 2.5h11a2 2 0 0 1 2 2V21l-7.5-5.4L4.5 21V4.5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
  </svg>
);
export const StoreIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkBrowseAll" size={size} className={className} style={{...style}} />;
export const BellIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="bell" size={size} className={className} style={{...style}} />;
export const InboxIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkInbox" size={size} className={className} style={{...style}} />;
export const TagIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkBuying" size={size} className={className} style={{...style}} />;
export const DollarIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkSelling" size={size} className={className} style={{...style}} />;
export const PinIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="location16" size={size} className={className} style={{...style}} />;
export const GroupsIcon = ({size = 20, className, style}: IconProps) => <FbSprite name="groupsYours20" size={size} className={className} style={style} />;
export const FeedIcon = ({size = 20, className, style}: IconProps) => <FbSprite name="groupsFeed20" size={size} className={className} style={style} />;
export const CompassIcon = ExploreIcon;
export const PlusIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="plus16" size={size} className={className} style={{...style}} />;
export const ChevronRightIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="chevronLeft24" size={size} className={className} style={{transform: 'scaleX(-1)', ...style}} />;
export const ChevronLeftIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="chevronLeft24" size={size} className={className} style={{...style}} />;
export const CloseIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="close20" size={size} className={className} style={{...style}} />;
export const MoreIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="more20" size={size} className={className} style={{...style}} />;
export const PlayIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="play20" size={size} className={className} style={{...style}} />;
export const GamepadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7.25 5h9.5A6.25 6.25 0 0 1 23 11.25v.85A5.9 5.9 0 0 1 17.1 18a5.9 5.9 0 0 1-4.6-2.2 1.7 1.7 0 0 0-1 0A5.9 5.9 0 0 1 6.9 18 5.9 5.9 0 0 1 1 12.1v-.85A6.25 6.25 0 0 1 7.25 5ZM7 8.5a1 1 0 0 0-1 1V10.5H4.5a1 1 0 1 0 0 2H6V14a1 1 0 1 0 2 0v-1.5h1.5a1 1 0 1 0 0-2H8V9.5a1 1 0 0 0-1-1Zm9 1a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm2.5 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
  </svg>
);
export const CalendarIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="calendar16" size={size} className={className} style={{...style}} />;
export const CakeIcon = ({size = 20, className, style}: IconProps) => <FbSprite name="birthdays20" size={size} className={className} style={style} />;
export const StarIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="star20" size={size} className={className} style={{...style}} />;
export const StarOutlineIcon = (p: IconProps) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <path d="m12 3 2.9 5.95 6.55.95-4.74 4.6 1.12 6.5L12 17.95 6.17 21l1.12-6.5L2.55 9.9l6.55-.95L12 3Z" />
  </svg>
);
export const LikeIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="likeFilled24" size={size} className={className} style={{...style}} />;
export const LikeOutlineIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="like24" size={size} className={className} style={{...style}} />;
export const CommentIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="comment24" size={size} className={className} style={{...style}} />;
export const ShareIcon = ({size = 24, className, style}: IconProps) => <FbSvg name="share24" size={size} className={className} style={{...style}} />;
export const MessengerIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="messenger" size={size} className={className} style={{...style}} />;
export const GlobeIcon = ({size = 12, className, style}: IconProps) => <FbImg name="publicAudience12" size={size} className={className} style={style} />;
export const LockIcon = (p: IconProps) => (
  <svg {...base({size: 12, ...p})} viewBox="0 0 16 16">
    <path d="M8 1a4 4 0 0 1 4 4v1.5h.5A1.5 1.5 0 0 1 14 8v5.5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5V8a1.5 1.5 0 0 1 1.5-1.5H4V5a4 4 0 0 1 4-4Zm0 1.6A2.4 2.4 0 0 0 5.6 5v1.5h4.8V5A2.4 2.4 0 0 0 8 2.6Z" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm0 4.5a1 1 0 0 0-1 1V12a1 1 0 0 0 .4.8l3.5 2.6a1 1 0 1 0 1.2-1.6L13 11.5v-5a1 1 0 0 0-1-1Z" />
  </svg>
);
export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8.7 3h6.6a2 2 0 0 1 1.79 1.1l.7 1.4H20A3 3 0 0 1 23 8.5v9a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h2.2l.7-1.4A2 2 0 0 1 8.7 3ZM12 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
  </svg>
);
export const CheckIcon = ({size = 20, className, style}: IconProps) => <FbSprite name="check20" size={size} className={className} style={style} />;
export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 3h15A3.5 3.5 0 0 1 23 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 17.5v-11A3.5 3.5 0 0 1 4.5 3ZM7 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm13.5 10.5v-3.3l-4.1-4.1a1 1 0 0 0-1.4 0L8.4 16.7l-2-2a1 1 0 0 0-1.4 0L3 16.7v.8c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5Z" />
  </svg>
);
export const BriefcaseIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkJobs" size={size} className={className} style={{...style}} />;
export const ShieldIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="mkStatus" size={size} className={className} style={{...style}} />;
export const SlidersIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})}>
    <path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" />
  </svg>
);
export const ChevronDownIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="chevronDown" size={size} className={className} style={{...style}} />;
export const ChevronUpIcon = ({size = 16, className, style}: IconProps) => <FbSvg name="chevronUp" size={size} className={className} style={{...style}} />;
export const PersonIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="profile20" size={size} className={className} style={{...style}} />;
export const PeopleIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="people20" size={size} className={className} style={{...style}} />;
export const VideoCamIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="followingGaming20" size={size} className={className} style={{...style}} />;
export const HistoryIcon = ({size = 20, className, style}: IconProps) => <FbSvg name="history20" size={size} className={className} style={{...style}} />;
export const CalendarXIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 7h14v10H5V9Zm4.2 1.8L8 12l2.3 2.3L8 16.6l1.2 1.2 2.3-2.3 2.3 2.3 1.2-1.2-2.3-2.3 2.3-2.3-1.2-1.2-2.3 2.3-2.3-2.3Z" />
  </svg>
);
export const WifiIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4.95-5.05 1.41 1.41a5 5 0 0 1 7.08 0l1.41-1.41a7 7 0 0 0-9.9 0ZM4.22 12.22l1.42 1.42a9 9 0 0 1 12.72 0l1.42-1.42a11 11 0 0 0-15.56 0ZM1.39 9.39l1.42 1.42a13 13 0 0 1 18.38 0l1.42-1.42a15 15 0 0 0-21.22 0Z" />
  </svg>
);

/** Marketplace category glyphs copied from facebook.com's left rail (inline SVGs + the fCuCYDERcgd sprite). */
const CATEGORY_SVG: Record<string, Parameters<typeof FbSvg>[0]['name']> = {
  Vehicles: 'catVehicles',
  'Property Rentals': 'catPropertyRentals',
  Classifieds: 'mkSelling',
  Electronics: 'catElectronics',
  Entertainment: 'catEntertainment',
  Family: 'catFamily',
  'Free Stuff': 'catFreeStuff',
  'Garden & Outdoor': 'catGarden',
  'Home Goods': 'catHomeGoods',
  'Home Improvement Supplies': 'catHomeImprovement',
  'Home Sales': 'catPropertyRentals',
  'Musical Instruments': 'catMusical',
  'Office Supplies': 'mkSelling',
  'Pet Supplies': 'catPetSupplies',
  'Sporting Goods': 'catSportingGoods',
};
const CATEGORY_SPRITE: Record<string, Parameters<typeof FbSprite>[0]['name']> = {
  Apparel: 'catApparel',
  Hobbies: 'catHobbies',
  'Toys & Games': 'catToys',
  'Buy and sell groups': 'catBuySell',
};
export function FbCategoryIcon({name, size = 20}: {name: string; size?: number}) {
  if (CATEGORY_SVG[name]) return <FbSvg name={CATEGORY_SVG[name]} size={size} />;
  if (CATEGORY_SPRITE[name]) return <FbSprite name={CATEGORY_SPRITE[name]} size={size} />;
  return null;
}
