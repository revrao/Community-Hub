# CommunityHub stock photograph sources

License review and downloads: October 28, 2026. These are representative category photographs, not photographs of a particular CommunityHub event or endorsements by the people depicted. No subscriptions, stock APIs, or paid licenses are used. Production serves the optimized files locally.

## Volunteering — `public/reference/cleanup.webp`

- Photograph: Volunteer People Picking Up Trash and Plastics (photo 7656742).
- Photographer: Thirdman.
- Original page: https://www.pexels.com/photo/volunteer-people-picking-up-trash-and-plastics-7656742/
- Download: https://images.pexels.com/photos/7656742/pexels-photo-7656742.jpeg?cs=srgb&dl=pexels-thirdman-7656742.jpg&fm=jpg
- Individual page explicitly identifies the license as Free and links to the Pexels License: https://www.pexels.com/license/
- Free downloading, modification and website use, including commercial use. Attribution is not required; credit is retained here voluntarily.
- Restrictions: no implied endorsement; no offensive or negative portrayal of identifiable people; no sale of unaltered copies; no redistribution on stock/wallpaper services; no use as a trademark or service mark.
- Processing: EXIF orientation applied, resized to 1440px wide, encoded as WebP quality 80, metadata omitted. No AI generation or retouching.

## Community events — `public/reference/festival.webp`

- Photograph: Group of people gathering on field / Hanging Out in the Park, London Fields, London (photo 4hcpIbqQM8c).
- Photographer: Robert Bye.
- Original page: https://unsplash.com/photos/group-of-people-gathering-on-field-4hcpIbqQM8c
- Download: https://images.unsplash.com/photo-1474899351970-ee05f7dd1334?auto=format&fit=crop&fm=jpg&q=85&w=1800
- Individual page explicitly states Free to use under the Unsplash License: https://unsplash.com/license
- Free download, copying, modification, distribution and display for commercial and noncommercial purposes. No payment or attribution required; credit retained here voluntarily.
- Restrictions: no sale without significant modification; no compilation into a competing image service. The copyright license does not grant separate personality, trademark or property rights (https://unsplash.com/terms). Do not imply endorsement or use these people as CommunityHub testimonials.
- Processing: EXIF orientation applied, resized to 1440px wide, encoded as WebP quality 80, metadata omitted. No AI generation or retouching.

## Audit and integration

- Replaced the two category illustrations previously served as `/reference/cleanup.png` and `/reference/festival.png`. Shared event mapping selects these photos for current and future events; event cards (including profile activity) and event details use the same mapping.
- Removed unused public `foodbank.png` and `market.png` placeholders. No live application component referenced them.
- Preserved the original archived HTML prototypes in `design-reference/`, including their embedded historical demo images. They are design references, not application routes or public assets.
- Preserved `map-background.svg`: this is a functional schematic map fallback, not stock/event photography.
- Preserved all uploaded profile images, Google avatars, database records and storage files. The present event schema has no event-photo upload field; category photos remain its fallback.
- Inspected the selected images visually: no prominent logos or watermarks. Use only as neutral activity imagery. A different festival candidate was rejected for visible branding and is not included.

SHA-256 (public/reference/cleanup.webp): e852d533001736a2a231e4da228704d0dfc5334c38fb5836ba73ddc90afba666

SHA-256 (public/reference/festival.webp): eb1c8bc57c151ca027311f46067da157ab6c4b8521d034cbe0eb23c10107bfb1
