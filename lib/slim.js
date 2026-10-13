// Trim raw scraper output to just what the analyst needs (drops images, ids, logos, "people also viewed").
const cut = (s, n) => (typeof s === "string" ? s.slice(0, n) : s ?? null);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));

export function slimLinkedIn(d) {
  if (!d) return null;
  const seen = new Set();
  const education = [];
  for (const e of d.education || []) {
    const k = `${e.schoolName}|${e.degree}|${e.fieldOfStudy}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    education.push(clean({ school: e.schoolName, degree: e.degree, field: e.fieldOfStudy, period: e.period }));
  }
  const names = (arr, key) => (arr || []).map((x) => (typeof x === "string" ? x : x?.[key] || x?.name || x?.title)).filter(Boolean);
  return clean({
    name: [d.firstName, d.lastName].filter(Boolean).join(" "),
    headline: d.headline,
    about: cut(d.about, 1500),
    location: d.location?.parsed?.text || d.location?.linkedinText,
    industry: d.industry?.name,
    followers: d.followerCount,
    connections: d.connectionsCount,
    openToWork: d.openToWork || undefined,
    experience: (d.experience || []).slice(0, 8).map((x) =>
      clean({ role: x.position, company: x.companyName, duration: x.duration, description: cut(x.description, 500) })
    ),
    education,
    skills: names(d.skills, "name").slice(0, 30),
    certifications: (d.certifications || []).slice(0, 8).map((c) => clean({ title: c.title, by: c.issuedBy })),
    projects: (d.projects || []).slice(0, 6).map((p) => clean({ title: p.title, description: cut(p.description, 300) })),
    volunteering: (d.volunteering || []).slice(0, 5).map((v) => clean({ role: v.role, org: v.organization, cause: v.cause })),
    honors: names(d.honorsAndAwards, "title").slice(0, 6),
    publications: names(d.publications, "title").slice(0, 5),
    languages: names(d.languages, "name"),
    interests: (d.interests || []).flatMap((i) => (i.elements || []).map((e) => `${i.interestName}: ${e.title}`)).slice(0, 15),
  });
}

export function slimInstagram(d) {
  if (!d) return null;
  const posts = (d.latestPosts || d.posts || []).slice(0, 12).map((p) =>
    clean({
      caption: cut(p.caption, 400),
      hashtags: (p.hashtags || []).slice(0, 8),
      type: p.type,
      location: p.locationName,
      likes: p.likesCount,
      comments: p.commentsCount,
      when: p.timestamp,
      alt: cut(p.alt, 200),
    })
  );
  return clean({
    username: d.username,
    name: d.fullName,
    bio: cut(d.biography, 400),
    private: d.private === true ? true : undefined,
    followers: d.followersCount,
    following: d.followsCount,
    postsCount: d.postsCount,
    category: d.businessCategoryName,
    externalUrl: d.externalUrl,
    posts,
  });
}
