// /llms.txt — machine-readable summary for LLMs / AI answer engines.
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
