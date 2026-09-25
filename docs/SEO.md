# SEO

Which searches each page is written for, and why. The goal is leads from people who don't know Abhishek
yet: founders and CTOs looking to hire, or deciding between approaches. Searches for his name already
work; this map is for everything else. Measured in the monthly review ([GROWTH.md](./GROWTH.md)).

## Method

- **Free sources only.** Google autocomplete, "People also ask", and (once pages exist) the Search Console
  queries report. No keyword-tool volumes, and no invented numbers.
- **Autocomplete is the demand signal.** A phrase Google suggests is searched often enough to matter. A
  seed with no suggestions (for example "hire kotlin multiplatform developer") has too little demand for a
  page of its own; it can still appear in a page's copy.
- **Every page targets one primary query**, plus the variants it naturally answers. Two pages never target
  the same primary query.
- **Claims follow the resume.** A query is only targeted if the page can answer it truthfully from
  `src/data/career.ts` and the case studies. Queries that would need experience he doesn't have are listed
  under [Not targeting](#not-targeting).

- **Every post names its target query.** The Post issue template asks for it, and the post links to one
  service page and sets `offer`. A post with no query in this map gets a row here first.
- **Measured monthly.** The monthly review issue lists each service page with its query, and asks for its
  Search Console clicks and impressions, plus impressions and position for each post's primary query.
  The numbers go in the Monthly tab's Notes (the repo is public). Service pages are listed from
  `src/data/services.ts`, so a new page appears in the next review without an edit.

Checked with Google autocomplete (English, India and global) on 2026-09-25. Re-check a query before
writing its page, and replace the evidence column with Search Console data once there is some.

## Intent

| Intent     | Who is searching                               | Best page type                    | Converts to                   |
| ---------- | ---------------------------------------------- | --------------------------------- | ----------------------------- |
| **Hire**   | Ready to hire someone for a mobile app         | Service page (`/services/<id>`)   | `/contact`, intro call        |
| **Decide** | Choosing an approach, stack or partner         | Post, linking to one service page | Service page, then `/contact` |
| **Learn**  | Engineers solving a specific technical problem | Technical post                    | Newsletter or `/checklist`    |

Hire and decide pages come first: they are fewer searches but much closer to a lead.

## The map

### Service pages (hire)

| Page                        | Primary query                    | Variants from autocomplete                                                                                                | Proof on the page                                      | Status |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| `/services/mvp`             | mvp app development for startups | mobile app development company for startups · custom mobile app development for startups · freelance mobile app developer | HelperBook, video-hiring app (100% of the client)      | live   |
| `/services/offline-first` ¹ | offline first mobile app         | offline first mobile app architecture · offline first android app · offline first architecture android                    | Pulse (0 data-loss incidents in 4.5 years), HelperBook | live   |
| `/services/kmp`             | is kotlin multiplatform worth it | kotlin multiplatform in production · kotlin multiplatform shared business logic · kotlin multiplatform shared module      | HelperBook's shared data layer (Android in production) | live   |
| `/services/rescue`          | migrate xml to jetpack compose ² | jetpack compose vs xml · migrate xml views to jetpack compose                                                             | Pulse release process, Compose builds                  | live   |
| `/services/fractional`      | none (no autocomplete demand)    | none                                                                                                                      | Pulse: led 4–6 engineers                               | no SEO |
| `/services/india` ³         | hire android app developer india | best android app developer in india · hire react native developer india · freelancer mobile app developer in india        | All of the above; IST, Delhi NCR                       | live   |

1. A new service page, confirmed by Abhishek on 2026-09-25. Offline-first is the strongest differentiator
   (Pulse, HelperBook, EzHealth) and until now sat inside the MVP service.
2. The XML-to-Compose migration Abhishek has done was in a private project, so the page doesn't claim
   one. It claims production Compose (video-hiring, HelperBook) and describes the screen-by-screen
   migration as the offer, with release and rescue proof from Pulse and Retail Quotient.
3. Indian clients are billed in INR (confirmed 2026-09-25). Still to confirm: meeting in person in Delhi NCR.

`/services/fractional` stays as it is: nobody searches for the term, so it sells through referrals and
the other pages, not search.

### Posts (decide and learn)

| Post (TOPICS.md #)                      | Primary query                              | Variants from autocomplete                                                             | Intent | Links to                  |
| --------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- | ------ | ------------------------- |
| #5 Native, KMP or React Native          | kotlin multiplatform vs react native       | … performance · … vs flutter · react native vs native app · react native vs native ios | Decide | `/services/kmp`           |
| #16 Share the logic, keep the UI native | kotlin multiplatform shared business logic | kotlin multiplatform shared module · shared viewmodel                                  | Decide | `/services/kmp`           |
| #1 Two native apps into one RN codebase | react native vs native app                 | react native vs native app development                                                 | Decide | `/services/rescue`        |
| #18 What an Android app costs in India  | mobile app development cost india 2026     | mobile app development charges in india · cost estimate in india                       | Decide | `/services/india`         |
| #10 Offline-first in three products     | offline first mobile app architecture      | offline first architecture android                                                     | Learn  | `/services/offline-first` |
| #15 Offline-first by default            | offline first android app                  | offline first approach android                                                         | Decide | `/services/offline-first` |
| #12 HelperBook's shared KMP module      | kmp sqldelight vs room                     | sqldelight kmp migration · sqldelight kmp ios                                          | Learn  | `/services/kmp`           |
| #7 CameraX to Media3                    | camerax record video                       | none                                                                                   | Learn  | `/services/mvp`           |

The two published offline-first posts should mention "offline-first architecture" and "Android" in
their meta descriptions, to match the autocomplete wording.

Post #18 needs real numbers from Abhishek: the discovery price is public (₹60,000 / US$900), but a
post about build costs also needs typical project ranges he actually quotes. No invented prices.

## Not targeting

| Query                                  | Why not                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| kotlin multiplatform vs flutter        | No Flutter experience. Post #5 can say so and still rank for the React Native comparison. |
| hire kotlin multiplatform developer    | No autocomplete demand. Covered in `/services/kmp` copy.                                  |
| fractional cto, fractional mobile lead | No autocomplete demand.                                                                   |
| offline inspection app, audit app      | People looking for a product to use, not someone to build one.                            |
| android developer gurgaon              | Mostly job seekers ("jobs in gurgaon for freshers"). Mention Gurugram on the India page.  |
| app development discovery phase        | No autocomplete demand. Post #9 is still worth writing for people already on the site.    |
| android app rescue                     | Autocomplete is about phone recovery tools, not app projects.                             |

## HelperBook's own searches

"house help attendance app" and "maid salary app" have demand. They bring households to HelperBook,
not clients to the consultancy, so they belong in HelperBook's Play Store listing and a future
HelperBook landing page, not in this site's service pages.

## Build order

1. `/services/offline-first` and `/services/kmp`: the most differentiated proof, the least competition.
2. `/services/mvp`, then `/services/india`.
3. Post #5 (KMP vs React Native), which links to `/services/kmp`.
4. `/services/rescue`, once the Compose-migration question is settled.
5. The remaining posts, one every two weeks, in the order above.

Each page is its own Issue and PR, and gets a row in the monthly review once Search Console shows
impressions for it.
