import type {SVGProps} from 'react';
import {FbImg, FbSprite, FbSvg} from '@/components/pages/icons-fb';

type P = SVGProps<SVGSVGElement> & {size?: number};
const base = (size: number, p: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  ...p,
});

export const CameraIcon = ({size = 16, className, style}: P) => <FbSvg name="camera16" size={size} className={className} style={{...style}} />;
export const PlusIcon = ({size = 16, className, style}: P) => <FbImg name="addToStory16" size={size} className={className} style={style} />;
export const PencilIcon = ({size = 16, className, style}: P) => <FbImg name="editProfile16" size={size} className={className} style={style} />;
export const ChevronDownIcon = ({size = 20, className, style}: P) => <FbSvg name="chevronDown" size={size} className={className} style={{...style}} />;
export const ChevronRightIcon = ({size = 20, className, style}: P) => <FbSvg name="chevronLeft24" size={size} className={className} style={{transform: 'scaleX(-1)', ...style}} />;
export const EllipsisIcon = ({size = 20, className, style}: P) => <FbSvg name="more20" size={size} className={className} style={{...style}} />;
export const CloseIcon = ({size = 20, className, style}: P) => <FbSvg name="close20" size={size} className={className} style={{...style}} />;
export const CheckIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8.6-8.6 1.4 1.4z" />
  </svg>
);
export const BriefcaseIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M9 4a2 2 0 0 0-2 2v1H4a2 2 0 0 0-2 2v3h20V9a2 2 0 0 0-2-2h-3V6a2 2 0 0 0-2-2H9zm0 2h6v1H9V6zM2 13.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4.5h-8V15h-4v-1.5H2z" />
  </svg>
);
export const GraduationIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 3 1 8.5l11 5.5 9-4.5V16h2V8.5L12 3zm-6 10.1V17c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5v-3.9l-6 3-6-3z" />
  </svg>
);
export const HomeIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 3 2 11.5h2.5V20a1 1 0 0 0 1 1H10v-6h4v6h4.5a1 1 0 0 0 1-1v-8.5H22L12 3z" />
  </svg>
);
export const PinIcon = ({size = 20, className, style}: P) => <FbSvg name="location16" size={size} className={className} style={{...style}} />;
export const HeartIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 21s-8.5-5.4-8.5-11.3A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 3.1C20.5 15.6 12 21 12 21z" />
  </svg>
);
export const ClockIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.4l3.8 2.2-1 1.7L11 13.6V7h2z" />
  </svg>
);
export const LinkIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M10.6 13.4a1 1 0 0 1 0-1.4l2.8-2.8a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zM7.8 19.1a4 4 0 0 1-2.9-6.8l2.8-2.8 1.4 1.4-2.8 2.8a2 2 0 0 0 2.8 2.8l2.8-2.8 1.4 1.4-2.8 2.8a4 4 0 0 1-2.7 1.2zM16.2 4.9a4 4 0 0 1 2.9 6.8l-2.8 2.8-1.4-1.4 2.8-2.8a2 2 0 0 0-2.8-2.8l-2.8 2.8-1.4-1.4 2.8-2.8a4 4 0 0 1 2.7-1.2z" />
  </svg>
);
export const PhoneIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z" />
  </svg>
);
export const GlobeIcon = ({size = 12, className, style}: P) => <FbImg name="publicAudience12" size={size} className={className} style={style} />;
export const MailIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 3.2V17h16V8.2l-8 5-8-5zM5.4 7 12 11.1 18.6 7H5.4z" />
  </svg>
);
export const CakeIcon = ({size = 20, className, style}: P) => <FbSprite name="birthdays20" size={size} className={className} style={style} />;
export const PeopleIcon = ({size = 20, className, style}: P) => <FbSvg name="frHome" size={size} className={className} style={{...style}} />;
export const PersonPlusIcon = ({size = 16, className, style}: P) => <FbSvg name="addFriend16" size={size} className={className} style={{...style}} />;
export const PersonCheckIcon = ({size = 20, className, style}: P) => <FbSvg name="frRequests" size={size} className={className} style={{...style}} />;
export const PersonStarIcon = ({size = 20, className, style}: P) => <FbSvg name="frAllFriends" size={size} className={className} style={{...style}} />;
export const ListIcon = ({size = 20, className, style}: P) => <FbSvg name="frAllFriends" size={size} className={className} style={{...style}} />;
export const GearIcon = ({size = 20, className, style}: P) => <FbSvg name="gear20" size={size} className={className} style={{...style}} />;
export const SlidersIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 7h9.2a3 3 0 0 1 5.6 0H20v2h-1.2a3 3 0 0 1-5.6 0H4V7zm12 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM4 15h1.2a3 3 0 0 1 5.6 0H20v2h-9.2a3 3 0 0 1-5.6 0H4v-2zm4 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
  </svg>
);
export const MessengerIcon = ({size = 16, className, style}: P) => <FbSvg name="messenger" size={size} className={className} style={{...style}} />;
export const LiveIcon = ({size = 24, className, style}: P) => <FbImg name="liveVideo24" size={size} className={className} style={style} />;
export const PhotoIcon = ({size = 24, className, style}: P) => <FbImg name="photoVideo24" size={size} className={className} style={style} />;
export const FlagIcon = ({size = 24, className, style}: P) => <FbImg name="lifeEvent24" size={size} className={className} style={style} />;
export const GridIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
  </svg>
);
export const SearchIcon = ({size = 16, className, style}: P) => <FbSvg name="search16" size={size} className={className} style={{...style}} />;
export const RssIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 4a16 16 0 0 1 16 16h-3A13 13 0 0 0 4 7V4zm0 6a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7v-3zm2 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </svg>
);
export const UserIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-9 8.5C3 16.4 7 13 12 13s9 3.4 9 7.5V22H3v-1.5z" />
  </svg>
);
export const ImagePlusIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 5a2 2 0 0 1 2-2h8v2H6v14h12v-8h2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm15-3v2h2v2h-2v2h-2V6h-2V4h2V2h2zM7 17l3.5-4.5 2.5 3 1.5-2 3 3.5H7z" />
  </svg>
);

export const ChevronUpIcon = ({size = 16, className, style}: P) => <FbSvg name="chevronUp" size={size} className={className} style={{...style}} />;
