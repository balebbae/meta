import type {SVGProps} from 'react';

type P = SVGProps<SVGSVGElement> & {size?: number};
const base = (size: number, p: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  ...p,
});

export const CameraIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M9 3h6l1.6 2.2H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.2a2 2 0 0 1 2-2h3.4L9 3zm3 5.3a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8zm0 2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" />
  </svg>
);
export const PlusIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
  </svg>
);
export const PencilIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7L3 17.3zm17.7-10.2a1 1 0 0 0 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7 1.9-1.7z" />
  </svg>
);
export const ChevronDownIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z" />
  </svg>
);
export const ChevronRightIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M8.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4L13.6 12 8.3 6.7a1 1 0 0 1 0-1.4z" />
  </svg>
);
export const EllipsisIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <circle cx="5" cy="12" r="2.2" />
    <circle cx="12" cy="12" r="2.2" />
    <circle cx="19" cy="12" r="2.2" />
  </svg>
);
export const CloseIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M6.2 4.8 12 10.6l5.8-5.8 1.4 1.4-5.8 5.8 5.8 5.8-1.4 1.4-5.8-5.8-5.8 5.8-1.4-1.4 5.8-5.8-5.8-5.8z" />
  </svg>
);
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
export const PinIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
  </svg>
);
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
export const GlobeIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-2.9a15.6 15.6 0 0 0-1.3-5.4A8 8 0 0 1 18.9 11zM12 4.1c.9 1.1 1.8 3.3 2 6.9h-4c.2-3.6 1.1-5.8 2-6.9zM5.1 13h2.9c.1 2 .6 3.9 1.3 5.4A8 8 0 0 1 5.1 13zm2.9-2H5.1a8 8 0 0 1 4.2-5.4A15.6 15.6 0 0 0 8 11zm4 8.9c-.9-1.1-1.8-3.3-2-6.9h4c-.2 3.6-1.1 5.8-2 6.9zm2.7-1.5c.7-1.5 1.2-3.4 1.3-5.4h2.9a8 8 0 0 1-4.2 5.4z" />
  </svg>
);
export const MailIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 3.2V17h16V8.2l-8 5-8-5zM5.4 7 12 11.1 18.6 7H5.4z" />
  </svg>
);
export const CakeIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2c.9 1.3 1.5 2.3 1.5 3.2a1.5 1.5 0 0 1-3 0C10.5 4.3 11.1 3.3 12 2zM6 10h12a2 2 0 0 1 2 2v2.5c-.9 0-1.4-.4-1.9-.8-.5-.4-.8-.7-1.4-.7s-.9.3-1.4.7c-.5.4-1 .8-1.9.8s-1.4-.4-1.9-.8c-.5-.4-.8-.7-1.4-.7s-.9.3-1.4.7c-.5.4-1 .8-1.9.8s-1.4-.4-1.9-.8c-.5-.4-.8-.7-1.4-.7s-.9.3-1.4.7c-.5.4-1 .8-1.9.8V12a2 2 0 0 1 2-2zM4 16.3c1 0 1.7-.5 2.2-.9.4-.3.6-.5 1.1-.5s.7.2 1.1.5c.5.4 1.2.9 2.3.9s1.8-.5 2.3-.9c.4-.3.6-.5 1.1-.5s.7.2 1.1.5c.5.4 1.2.9 2.3.9s1.8-.5 2.2-.9l.3-.2V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3.7zM11 7h2v2.5h-2z" />
  </svg>
);
export const PeopleIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 18.5C3 15.5 5.7 13 9 13s6 2.5 6 5.5V20H3v-1.5zm13-4.5c2.8 0 5 2 5 4.5V20h-4.5v-1.5c0-1.3-.4-2.5-1.2-3.5.3-.3.5-.5.7-.5z" />
  </svg>
);
export const PersonPlusIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6v1H3v-1zm16-9h2v2.5h2.5v2H21V17h-2v-2.5h-2.5v-2H19V10z" />
  </svg>
);
export const PersonCheckIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6v1H3v-1zm15.2-5.8 1.3-1.3 1.4 1.4-2.7 2.7-1.9-1.9 1.4-1.4.5.5z" />
  </svg>
);
export const PersonStarIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.3 3.1-6 7-6 1 0 2 .2 2.9.5-.6 1-.9 2.1-.9 3.3V20H3v-1zm15-6 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3L18 13z" />
  </svg>
);
export const ListIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 5h3v3H4V5zm5 .5h11v2H9v-2zM4 10.5h3v3H4v-3zm5 .5h11v2H9v-2zM4 16h3v3H4v-3zm5 .5h11v2H9v-2z" />
  </svg>
);
export const GearIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.4L9 5.1c-.6.3-1.2.6-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .3.2.5.5.5h4c.3 0 .5-.2.5-.4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
  </svg>
);
export const SlidersIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 7h9.2a3 3 0 0 1 5.6 0H20v2h-1.2a3 3 0 0 1-5.6 0H4V7zm12 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM4 15h1.2a3 3 0 0 1 5.6 0H20v2h-9.2a3 3 0 0 1-5.6 0H4v-2zm4 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
  </svg>
);
export const MessengerIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2C6.4 2 2 6.1 2 11.7c0 3.1 1.4 5.8 3.7 7.6V23l3.7-2a10.7 10.7 0 0 0 2.6.3c5.6 0 10-4.1 10-9.7S17.6 2 12 2zm1 13-2.6-2.7L5.5 15l5.4-5.8 2.6 2.7 4.8-2.7L13 15z" />
  </svg>
);
export const LiveIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)} fill="none">
    <rect x="2" y="6" width="14" height="12" rx="3" fill="var(--fb-red)" />
    <path d="M16 10.5 22 7v10l-6-3.5z" fill="var(--fb-red)" />
    <circle cx="9" cy="12" r="3" fill="#fff" />
    <circle cx="9" cy="12" r="1.5" fill="var(--fb-red)" />
  </svg>
);
export const PhotoIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)} fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="var(--fb-green)" />
    <circle cx="9" cy="9.5" r="2" fill="#fff" />
    <path d="M5 18.5 10 13l3 3 3-2.5 4 4.5H5z" fill="#fff" />
  </svg>
);
export const FlagIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M5 3h2v18H5V3zm3 1h11l-2.5 4.5L19 13H8V4z" fill="var(--fb-blue)" />
  </svg>
);
export const GridIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
  </svg>
);
export const SearchIcon = ({size = 20, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
  </svg>
);
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
