import type {SVGProps} from 'react';

type IconProps = SVGProps<SVGSVGElement> & {size?: number};

function base({size = 24, ...rest}: IconProps) {
  return {width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true, ...rest} as const;
}

export const SearchIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})} viewBox="0 0 16 16">
    <path d="M6.5 1a5.5 5.5 0 0 1 4.383 8.823l3.896 3.9a.75.75 0 1 1-1.06 1.06l-3.9-3.9A5.5 5.5 0 1 1 6.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
  </svg>
);
export const GearIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20">
    <path d="M8.1 1.5a1 1 0 0 0-.98.8l-.3 1.5c-.5.2-.98.47-1.42.78l-1.45-.5a1 1 0 0 0-1.2.46l-1.9 3.3a1 1 0 0 0 .22 1.27l1.15 1a6.6 6.6 0 0 0 0 1.78l-1.15 1a1 1 0 0 0-.22 1.27l1.9 3.3a1 1 0 0 0 1.2.46l1.45-.5c.44.31.92.58 1.42.78l.3 1.5a1 1 0 0 0 .98.8h3.8a1 1 0 0 0 .98-.8l.3-1.5c.5-.2.98-.47 1.42-.78l1.45.5a1 1 0 0 0 1.2-.46l1.9-3.3a1 1 0 0 0-.22-1.27l-1.15-1a6.6 6.6 0 0 0 0-1.78l1.15-1a1 1 0 0 0 .22-1.27l-1.9-3.3a1 1 0 0 0-1.2-.46l-1.45.5a6.6 6.6 0 0 0-1.42-.78l-.3-1.5a1 1 0 0 0-.98-.8H8.1ZM10 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
  </svg>
);
export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.464 1.286C10.294.803 11.092.5 12 .5c.908 0 1.707.303 2.537.786.795.462 1.7 1.142 2.815 1.977l2.232 1.675c1.391 1.042 2.359 1.766 2.888 2.826.53 1.059.53 2.268.528 4.006v4.7c0 1.111 0 2.034-.1 2.766-.105.78-.337 1.479-.898 2.04s-1.26.793-2.04.898c-.732.1-1.655.1-2.766.1H6.804c-1.111 0-2.034 0-2.766-.1-.78-.105-1.479-.337-2.04-.898s-.793-1.26-.898-2.04C1 19.504 1 18.581 1 17.47v-4.7c-.002-1.738-.002-2.947.528-4.006.53-1.06 1.497-1.784 2.888-2.826L6.65 4.263c1.114-.835 2.02-1.515 2.815-1.977ZM10 15a1 1 0 0 0-1 1v5.5h6V16a1 1 0 0 0-1-1h-4Z" />
  </svg>
);
export const LiveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 3h15A3.5 3.5 0 0 1 23 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 17.5v-11A3.5 3.5 0 0 1 4.5 3ZM6 13.25h3.5V15H4.5V9H6v4.25Zm5.25-4.25H13v6h-1.75V9Zm4.6 0 .9 3.3.9-3.3h1.85l-1.85 6h-1.8l-1.85-6h1.85Z" />
  </svg>
);
export const ReelsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 2h11A4.5 4.5 0 0 1 22 6.5v11a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 17.5v-11A4.5 4.5 0 0 1 6.5 2Zm.75 2 2.1 3.5h3.5L10.75 4h-3.5ZM13 4l2.1 3.5h4.65A2.5 2.5 0 0 0 17.5 4H13ZM4 9.5v8A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-8H4Zm6.25 2.9c0-.6.65-.97 1.17-.67l3.6 2.1a.78.78 0 0 1 0 1.34l-3.6 2.1a.78.78 0 0 1-1.17-.67v-4.2Z" />
  </svg>
);
export const ShowsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 4h15A3.5 3.5 0 0 1 23 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 16.5v-9A3.5 3.5 0 0 1 4.5 4Zm5 5.1v5.8c0 .62.68 1 1.21.67l4.6-2.9a.8.8 0 0 0 0-1.34l-4.6-2.9a.8.8 0 0 0-1.21.67Z" />
  </svg>
);
export const ExploreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm4.95 6.05a.75.75 0 0 0-.84-.16l-5.6 2.49a1.5 1.5 0 0 0-.76.76l-2.5 5.6a.75.75 0 0 0 1 1l5.6-2.5a1.5 1.5 0 0 0 .76-.76l2.5-5.6a.75.75 0 0 0-.16-.83ZM12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
  </svg>
);
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
export const StoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 2h17a1 1 0 0 1 .96.72l1.5 5.25A3.26 3.26 0 0 1 20.9 12c-1.04 0-1.98-.45-2.6-1.17A3.49 3.49 0 0 1 15.7 12c-1.04 0-1.98-.45-2.6-1.17A3.49 3.49 0 0 1 10.5 12c-1.04 0-1.98-.45-2.6-1.17A3.49 3.49 0 0 1 5.3 12a3.26 3.26 0 0 1-2.26-4.03l1.5-5.25A1 1 0 0 1 3.5 2Zm.5 11.5c.49 0 .96-.08 1.4-.22a4.9 4.9 0 0 0 4.6.22 4.9 4.9 0 0 0 4-.19 4.9 4.9 0 0 0 4.6.19c.44.14.91.22 1.4.22v6A2.5 2.5 0 0 1 17.5 22H14v-5.5a1.5 1.5 0 0 0-1.5-1.5h-1A1.5 1.5 0 0 0 10 16.5V22H6.5A2.5 2.5 0 0 1 4 19.5v-6Z" />
  </svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1.5a7.5 7.5 0 0 1 7.5 7.5v3.74l1.46 2.92A2 2 0 0 1 19.17 18.5H4.83a2 2 0 0 1-1.79-2.84L4.5 12.74V9A7.5 7.5 0 0 1 12 1.5ZM9.25 20h5.5a2.75 2.75 0 0 1-5.5 0Z" />
  </svg>
);
export const InboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 3h15A3.5 3.5 0 0 1 23 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 17.5v-11A3.5 3.5 0 0 1 4.5 3ZM3 7.46V17.5c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5V7.46l-8.1 5.4a1.5 1.5 0 0 1-1.8 0L3 7.46Z" />
  </svg>
);
export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 3.5A1 1 0 0 1 3.5 2.5h7.26a3 3 0 0 1 2.12.88l8.24 8.24a3 3 0 0 1 0 4.24l-5.26 5.26a3 3 0 0 1-4.24 0L3.38 12.88a3 3 0 0 1-.88-2.12V3.5ZM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
  </svg>
);
export const DollarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm.75 4.5h-1.5v1.6c-1.8.3-3 1.5-3 3.1 0 1.9 1.4 2.6 3.3 3.1 1.7.45 2.2.8 2.2 1.5 0 .8-.8 1.2-1.75 1.2-1.05 0-1.85-.5-2.05-1.4H8.1c.2 1.7 1.4 2.7 3.15 2.95V19h1.5v-1.6c1.9-.3 3.05-1.5 3.05-3.2 0-2-1.5-2.7-3.35-3.2-1.65-.45-2.15-.75-2.15-1.4 0-.7.65-1.1 1.6-1.1.95 0 1.6.45 1.75 1.2h1.85c-.15-1.55-1.2-2.5-2.75-2.8V5.5Z" />
  </svg>
);
export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1.5a8 8 0 0 1 8 8c0 4.1-3.4 8.7-7.12 12.77a1.2 1.2 0 0 1-1.76 0C7.4 18.2 4 13.6 4 9.5a8 8 0 0 1 8-8Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </svg>
);
export const GroupsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7.5 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm9 0a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM1 17.5c0-3.3 2.9-6 6.5-6 1.45 0 2.8.44 3.9 1.19A6.8 6.8 0 0 0 9 17.5V19H2.5A1.5 1.5 0 0 1 1 17.5ZM11 18.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5v1a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5v-1Z" />
  </svg>
);
export const FeedIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 2.5h14A2.5 2.5 0 0 1 21.5 5v14a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 19V5A2.5 2.5 0 0 1 5 2.5Zm1.5 4v3h11v-3h-11Zm0 5v1.5h11V11.5h-11Zm0 3.5V16.5h7V15h-7Z" />
  </svg>
);
export const CompassIcon = ExploreIcon;
export const PlusIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})} viewBox="0 0 16 16">
    <path d="M8 1.5a1 1 0 0 1 1 1V7h4.5a1 1 0 1 1 0 2H9v4.5a1 1 0 1 1-2 0V9H2.5a1 1 0 0 1 0-2H7V2.5a1 1 0 0 1 1-1Z" />
  </svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})} viewBox="0 0 16 16">
    <path d="M5.47 2.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L9.94 8 5.47 3.53a.75.75 0 0 1 0-1.06Z" />
  </svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})} viewBox="0 0 16 16">
    <path d="M10.53 2.47a.75.75 0 0 1 0 1.06L6.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 0 1 1.06 0Z" />
  </svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20">
    <path d="M4.3 4.3a1 1 0 0 1 1.4 0L10 8.6l4.3-4.3a1 1 0 1 1 1.4 1.4L11.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L8.6 10 4.3 5.7a1 1 0 0 1 0-1.4Z" />
  </svg>
);
export const MoreIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20">
    <circle cx="4" cy="10" r="2" />
    <circle cx="10" cy="10" r="2" />
    <circle cx="16" cy="10" r="2" />
  </svg>
);
export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4.3c0-1.17 1.27-1.9 2.28-1.3l12.1 7.08a1.5 1.5 0 0 1 0 2.6L9.28 19.76A1.5 1.5 0 0 1 7 18.46V4.3Z" />
  </svg>
);
export const GamepadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7.25 5h9.5A6.25 6.25 0 0 1 23 11.25v.85A5.9 5.9 0 0 1 17.1 18a5.9 5.9 0 0 1-4.6-2.2 1.7 1.7 0 0 0-1 0A5.9 5.9 0 0 1 6.9 18 5.9 5.9 0 0 1 1 12.1v-.85A6.25 6.25 0 0 1 7.25 5ZM7 8.5a1 1 0 0 0-1 1V10.5H4.5a1 1 0 1 0 0 2H6V14a1 1 0 1 0 2 0v-1.5h1.5a1 1 0 1 0 0-2H8V9.5a1 1 0 0 0-1-1Zm9 1a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm2.5 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
  </svg>
);
export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 1.5a1 1 0 0 1 1 1V3h8v-.5a1 1 0 1 1 2 0V3h.5A3.5 3.5 0 0 1 22 6.5v12a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 18.5v-12A3.5 3.5 0 0 1 5.5 3H6v-.5a1 1 0 0 1 1-1ZM4 9v9.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V9H4Zm3 2.5h3v3H7v-3Z" />
  </svg>
);
export const CakeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1.5c.55 0 1 .45 1 1v.3c.9.4 1.5 1.3 1.5 2.3v.9h-5v-.9c0-1 .6-1.9 1.5-2.3v-.3c0-.55.45-1 1-1ZM5.5 8h13A2.5 2.5 0 0 1 21 10.5V13c-1.1 0-1.6-.5-2.2-1.1a1 1 0 0 0-1.5 0c-.7.7-1.3 1.1-2.3 1.1s-1.6-.4-2.3-1.1a1 1 0 0 0-1.4 0c-.7.7-1.3 1.1-2.3 1.1s-1.6-.4-2.3-1.1a1 1 0 0 0-1.5 0C4.6 12.5 4.1 13 3 13v-2.5A2.5 2.5 0 0 1 5.5 8ZM3 15c1.1 0 2-.3 2.95-1 .8.6 1.6 1 3.05 1s2.2-.4 3-1c.8.6 1.6 1 3 1s2.2-.4 3-1c.95.7 1.85 1 3 1v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-5Z" />
  </svg>
);
export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 1.75a1 1 0 0 1 .9.56l2.73 5.62 6.16.9a1 1 0 0 1 .55 1.7l-4.46 4.33 1.06 6.13a1 1 0 0 1-1.45 1.06L12 19.13l-5.5 2.92a1 1 0 0 1-1.45-1.06l1.06-6.13-4.46-4.34a1 1 0 0 1 .55-1.7l6.16-.9 2.74-5.6a1 1 0 0 1 .9-.57Z" />
  </svg>
);
export const StarOutlineIcon = (p: IconProps) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <path d="m12 3 2.9 5.95 6.55.95-4.74 4.6 1.12 6.5L12 17.95 6.17 21l1.12-6.5L2.55 9.9l6.55-.95L12 3Z" />
  </svg>
);
export const LikeIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20">
    <path d="M10.63 2.1a1.2 1.2 0 0 1 1.5.55c.6 1.2.87 2.63.57 4.2l-.1.5h3.4a2.5 2.5 0 0 1 2.47 2.9l-.98 6A2.5 2.5 0 0 1 15.02 18H7.5V8.3l2.4-5.5a1.2 1.2 0 0 1 .73-.7ZM2.5 8h3.5v10H2.5A1.5 1.5 0 0 1 1 16.5v-7A1.5 1.5 0 0 1 2.5 8Z" />
  </svg>
);
export const LikeOutlineIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
    <path d="M2.5 8.5h3.5v9H2.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm4.5 0 3-6.3c.8-.3 1.6 0 2 .7.5 1 .5 2.2.2 3.4l-.4 1.2h3.8a2 2 0 0 1 2 2.3l-.8 5.6a2 2 0 0 1-2 1.7H7v-8.6Z" />
  </svg>
);
export const CommentIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
    <path d="M10 2.5c4.7 0 8.5 3.2 8.5 7.2s-3.8 7.2-8.5 7.2c-.9 0-1.8-.1-2.6-.35L4 18.2a.6.6 0 0 1-.85-.6l.3-2.5C2.2 13.8 1.5 12.3 1.5 9.7c0-4 3.8-7.2 8.5-7.2Z" />
  </svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
    <path d="M11.5 3.5 18 9.5l-6.5 6v-3.6c-4 0-7 1.1-9 4.1 0-5.5 3.2-8.6 9-9.1V3.5Z" />
  </svg>
);
export const MessengerIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})} viewBox="0 0 20 20">
    <path d="M10 1.5c-4.8 0-8.5 3.5-8.5 8.2 0 2.5 1 4.6 2.7 6.1v3l2.7-1.5c.95.3 2 .45 3.1.45 4.8 0 8.5-3.5 8.5-8.2S14.8 1.5 10 1.5Zm.9 11-2.2-2.3-4.2 2.3 4.6-4.9 2.2 2.3 4.2-2.3-4.6 4.9Z" />
  </svg>
);
export const GlobeIcon = (p: IconProps) => (
  <svg {...base({size: 12, ...p})} viewBox="0 0 16 16">
    <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm2.35 9H5.65c.25 1.9.95 3.4 1.85 4.3a.7.7 0 0 0 1 0c.9-.9 1.6-2.4 1.85-4.3ZM4.15 10H2.4a5.6 5.6 0 0 0 3.1 3.6 9 9 0 0 1-1.35-3.6Zm9.45 0h-1.75a9 9 0 0 1-1.35 3.6 5.6 5.6 0 0 0 3.1-3.6ZM5.5 2.4A5.6 5.6 0 0 0 2.4 6h1.75c.2-1.4.7-2.6 1.35-3.6ZM8 2.2c-1.1.9-1.95 2.3-2.3 3.8h4.6C9.95 4.5 9.1 3.1 8 2.2Zm2.5.2c.65 1 1.15 2.2 1.35 3.6h1.75a5.6 5.6 0 0 0-3.1-3.6Z" />
  </svg>
);
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
export const CheckIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})} viewBox="0 0 16 16">
    <path d="M13.78 3.72a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L6.25 10.2l6.47-6.47a.75.75 0 0 1 1.06 0Z" />
  </svg>
);
export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 3h15A3.5 3.5 0 0 1 23 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 1 17.5v-11A3.5 3.5 0 0 1 4.5 3ZM7 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm13.5 10.5v-3.3l-4.1-4.1a1 1 0 0 0-1.4 0L8.4 16.7l-2-2a1 1 0 0 0-1.4 0L3 16.7v.8c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5Z" />
  </svg>
);
export const BriefcaseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4a2 2 0 0 0-2 2v1H5a3 3 0 0 0-3 3v2.5h20V10a3 3 0 0 0-3-3h-2V6a2 2 0 0 0-2-2H9Zm0 3V6h6v1H9ZM2 14v4a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-4h-8.5v1a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-1H2Z" />
  </svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3Zm-1 13.5-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z" />
  </svg>
);
export const SlidersIcon = (p: IconProps) => (
  <svg {...base({size: 20, ...p})}>
    <path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" />
  </svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})}>
    <path d="M4.5 8.5 12 16l7.5-7.5-1.4-1.4L12 13.2 5.9 7.1 4.5 8.5Z" />
  </svg>
);
export const ChevronUpIcon = (p: IconProps) => (
  <svg {...base({size: 16, ...p})}>
    <path d="M4.5 15.5 12 8l7.5 7.5-1.4 1.4L12 10.8l-6.1 6.1-1.4-1.4Z" />
  </svg>
);
export const PersonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
  </svg>
);
export const PeopleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 18.5C2 15.46 5.13 13 9 13s7 2.46 7 5.5V20H2v-1.5Zm15.5 1.5v-1.5c0-1.6-.6-3.05-1.6-4.2.7-.2 1.4-.3 2.1-.3 2.76 0 5 1.79 5 4v2h-5.5Z" />
  </svg>
);
export const VideoCamIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5l3.5-2.3A1 1 0 0 1 21 8v8a1 1 0 0 1-1.5.8L16 14.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);
export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 3a9 9 0 0 0-9 9H1l3.9 3.9L8.8 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3Zm-1 5v5l4.25 2.52.75-1.23-3.5-2.08V8H12Z" />
  </svg>
);
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
