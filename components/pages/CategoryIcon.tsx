const P: Record<string, string> = {
  Vehicles: 'M5 11l1.5-4.5h11L19 11M5 11h14v5H5zM7 16v2M17 16v2M7.5 13.5h.01M16.5 13.5h.01',
  'Property Rentals': 'M4 10l8-6 8 6v10H4zM10 20v-6h4v6',
  Apparel: 'M8 4l4 2 4-2 4 4-3 2v10H7V10L4 8z',
  Classifieds: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  Electronics: 'M4 5h16v11H4zM9 20h6M12 16v4',
  Entertainment: 'M4 6h16v12H4zM4 10h16M8 6v4M16 6v4',
  Family: 'M9 7a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM17 9a2 2 0 110-4 2 2 0 010 4zM4 20v-5a5 5 0 0110 0v5M14 20v-4a3 3 0 016 0v4',
  'Free Stuff': 'M4 8h16v4H4zM6 12v8h12v-8M12 8v12M12 8c-2-3-6-3-6-1s4 1 6 1zm0 0c2-3 6-3 6-1s-4 1-6 1z',
  'Garden & Outdoor': 'M12 21V11M12 11c-4 0-6-3-6-7 4 0 6 3 6 7zm0 0c4 0 6-3 6-7-4 0-6 3-6 7zM6 21h12',
  Hobbies: 'M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 16.5 6.4 20l1.6-6.3-5-4.2L9.5 9z',
  'Home Goods': 'M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3M4 10h16v6H4zM6 16v3M18 16v3',
  'Home Improvement Supplies': 'M14 4l6 6-9 9H5v-6zM12 6l6 6',
  'Home Sales': 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5',
  'Musical Instruments': 'M9 18a3 3 0 11-6 0 3 3 0 016 0zM9 18V5l11-2v12M20 15a3 3 0 11-6 0 3 3 0 016 0z',
  'Office Supplies': 'M5 4h10l4 4v12H5zM15 4v4h4M8 13h8M8 17h8',
  'Pet Supplies': 'M8 8a2 2 0 110-4 2 2 0 010 4zM16 8a2 2 0 110-4 2 2 0 010 4zM4 13a2 2 0 110-4 2 2 0 010 4zM20 13a2 2 0 110-4 2 2 0 010 4zM12 21c-3 0-5-1.5-5-3.5C7 15 9 12 12 12s5 3 5 5.5c0 2-2 3.5-5 3.5z',
  'Sporting Goods': 'M12 21a9 9 0 110-18 9 9 0 010 18zM3.5 9.5c3 1 5.5 1 8.5 0s5.5-1 8.5 0M3.5 14.5c3-1 5.5-1 8.5 0s5.5 1 8.5 0M12 3v18',
  'Toys & Games': 'M4 8h16v10H4zM8 12v3M6.5 13.5h3M15.5 12h.01M17.5 14h.01',
  'Buy and sell groups': 'M8 10a3 3 0 110-6 3 3 0 010 6zM16 10a3 3 0 110-6 3 3 0 010 6zM3 20v-3a4 4 0 014-4h2a4 4 0 014 4v3M13 20v-3a4 4 0 014-4h0a4 4 0 014 4v3',
};

export function CategoryIcon({name, size = 20}: {name: string; size?: number}) {
  const d = P[name] ?? 'M5 5h14v14H5z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
