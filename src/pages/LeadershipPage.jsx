import { HeroImage } from '../components/HeroImage.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { leadershipMembers } from '../data/leadership.js';

function MemberCard({ member }) {
  const altText = member.name ? `${member.role} ${member.name}` : member.role;

  return (
    <div className="relative aspect-[4/5] w-full rounded-[16px] overflow-hidden border-2 border-transparent hover:border-gold-500 transition-colors duration-150 bg-navy-950">
      <SmartImage
        image={{
          src: member.imageSrc,
          name: member.role,
          alt: altText,
        }}
        aspect="4 / 5"
        fill
        className="h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/40 to-transparent flex flex-col justify-end p-5 pointer-events-none">
        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-gold-400">
          {member.role}
        </p>
        {member.name ? (
          <p className="font-display text-lg font-medium text-white mt-1">
            {member.name}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LeadershipPage() {
  const president = leadershipMembers.find((m) => m.id === 'president') || leadershipMembers[0];
  const officers = leadershipMembers.filter((m) =>
    ['vice-president', 'secretary', 'joint-secretary', 'treasurer'].includes(m.id)
  );
  const executiveMembers = leadershipMembers.filter((m) =>
    m.id.startsWith('executive-member')
  );

  const presidentAlt = president?.name ? `${president.role} ${president.name}` : president?.role;

  return (
    <div className="min-h-screen bg-cream">
      {/* 1. Image-only hero */}
      <HeroImage slot="hero-leadership" />

      {/* 2. Page title & subtitle directly below the hero */}
      <div className="container-x section-top pb-20">
        <div className="mb-10">
          <h1 className="h-section">Leadership</h1>
          <p className="mt-2 text-slate-600">The team guiding FRCC.</p>
        </div>

        {/* Row 1: Featured President Card */}
        {president && (
          <div className="rounded-[16px] border-2 border-transparent hover:border-gold-500 transition-colors duration-150 bg-white overflow-hidden shadow-card grid grid-cols-1 md:grid-cols-[40%_1fr]">
            <div className="relative aspect-[4/5] md:aspect-auto w-full h-full min-h-[300px] overflow-hidden rounded-[16px]">
              <SmartImage
                image={{
                  src: president.imageSrc,
                  name: president.role,
                  alt: presidentAlt,
                }}
                fill
                className="h-full w-full"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
              {president.name || president.bio ? (
                <>
                  <p className="text-xs uppercase tracking-[0.12em] font-semibold text-gold-600">
                    {president.role}
                  </p>
                  {president.name && (
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-navy-900 mt-2">
                      {president.name}
                    </h2>
                  )}
                  {president.bio && (
                    <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {president.bio}
                    </p>
                  )}
                </>
              ) : (
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-navy-900">
                  {president.role}
                </h2>
              )}
            </div>
          </div>
        )}

        {/* Row 2: 4 equal cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {officers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>

        {/* Row 3: Executive Members */}
        <div className="mt-14">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-navy-900 text-center mb-6">
            Executive Members
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {executiveMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeadershipPage;
