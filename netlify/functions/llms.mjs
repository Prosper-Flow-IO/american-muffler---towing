// /llms.txt — machine-readable summary for LLMs / AI answer engines.
//
// KEEP THE SERVICE AREA PAGE LIST IN STEP WITH american-muffler-site-cdn/
// service-areas-*.html. It is hardcoded, like Services, and it went stale:
// eight town pages existed and this file listed none of them, naming the towns
// in prose only. The 1 Aug AI visibility audit scored Local/GEO -17.5, its
// largest deduction, on the finding that the site is "machine-readable, not
// machine-known" — and the file whose whole job is telling AI engines what
// exists was pointing at a hub page instead of the eight pages themselves.
//
// Response times are deliberately absent from these descriptions. The site's
// published windows contradict each other between service-areas.html and
// services-towing.html, and this file is built to be ingested — a disputed
// figure does more damage here than on a page a human reads.
import { listPosts } from '../lib/store.mjs';
import { SITE } from '../lib/blog-render.mjs';
import { toPlain } from '../lib/markdown.mjs';

export default async () => {
  const posts = (await listPosts()).filter((p) => p.status === 'published');
  const postLines = posts.map((p) => `- [${p.title}](${SITE.base}/blog/${p.slug}/): ${p.excerpt || toPlain(p.content, 120)}`).join('\n');

  const body = `# American Muffler & Towing

> Family-owned 24/7 towing, roadside assistance, and full-service auto shop in Gallup, New Mexico, serving the I-40 corridor and the Navajo Nation since 2012.

American Muffler & Towing is located at 827 N 9th Street, Gallup, NM 87301. The 24/7 tow line is (505) 863-5990. Office hours are Monday–Saturday, 9am–5pm; the tow line answers around the clock. Every job is quoted up front — no surprise fees.

## Services
- [Towing](${SITE.base}/services/towing/): Light, medium, and heavy-duty towing — flatbed, wheel-lift, and recovery.
- [Roadside Assistance](${SITE.base}/services/roadside-assistance/): Jump starts, lockouts, fuel delivery, flat-tire changes, and winch-outs.
- [Auto Repair](${SITE.base}/services/auto-repair/): Brakes, diagnostics, transmission, suspension, and AC.
- [Muffler & Exhaust](${SITE.base}/services/muffler-exhaust/): Custom exhaust, catalytic converter replacement, and welds.
- [Tires](${SITE.base}/services/tires/): New and used tires, install, rotation, and balancing.
- [Junk Car Removal](${SITE.base}/services/junk-car-removal/): Cash for unwanted vehicles with free pickup.

## Service area
Gallup, Church Rock, Thoreau, Grants, Milan, Yah-Ta-Hey, Zuni, and Crownpoint (NM); Window Rock, Fort Defiance, and Lupton (AZ); the I-40 corridor from Grants to the Arizona state line; and across the Navajo Nation.

## Service area pages
- [Gallup, NM](${SITE.base}/service-areas/gallup-nm/): Home base — the shop at 827 N 9th Street.
- [Thoreau, NM](${SITE.base}/service-areas/thoreau-nm/): East along I-40, near the frequent breakdown spot at MM 53.
- [Church Rock, NM](${SITE.base}/service-areas/church-rock-nm/): Just east of Gallup, covering the truck stop and Red Rock Park.
- [Yah-Ta-Hey, NM](${SITE.base}/service-areas/yah-ta-hey-nm/): North of Gallup on US 491.
- [Grants, NM](${SITE.base}/service-areas/grants-nm/): Further east on I-40; heavy truck and RV work common.
- [Window Rock, AZ](${SITE.base}/service-areas/window-rock-az/): Navajo Nation capital, west on Route 264.
- [Fort Defiance, AZ](${SITE.base}/service-areas/fort-defiance-az/): North of Window Rock.
- [Lupton, AZ](${SITE.base}/service-areas/lupton-az/): Across the Arizona state line on I-40.

## Key pages
- [Home](${SITE.base}/)
- [Shop / parts & tires](${SITE.base}/shop/)
- [Service areas](${SITE.base}/service-areas/)
- [Reviews](${SITE.base}/reviews/)
- [Contact & directions](${SITE.base}/contact/)

## Blog
${postLines}
`;

  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: '/llms.txt' };
