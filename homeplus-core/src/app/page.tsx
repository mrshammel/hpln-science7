"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "./page.module.css";

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: session, status } = useSession();

  // Auth state helpers
  const isLoading = status === "loading";
  const isSignedIn = status === "authenticated" && !!session?.user;
  const userName = session?.user?.name || "";
  const userImage = session?.user?.image || null;
  const userRole = (session?.user as any)?.role as string | undefined;
  const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

  // Personalized hero copy for signed-in users
  const heroGreeting = isTeacher
    ? "Welcome back — review progress and activity"
    : "Welcome back — continue your learning";

  return (
    <div className={styles.page}>
      {/* ===== HEADER / NAVIGATION ===== */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.headerBrand}>
            <Image
              src="/images/hpln-logo.png"
              alt="Home Plus Online Learning"
              width={180}
              height={56}
              className={styles.headerLogo}
              priority
            />
          </a>

          {/* Desktop nav */}
          <nav className={styles.headerNav}>
            <a href="#about" className={styles.navLink}>About</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="https://www.myprps.com/home-plus-forms-and-registration" className={styles.navLink} target="_blank" rel="noopener noreferrer">Register</a>
            <div className={styles.navDivider} />

            {/* Auth-aware CTAs */}
            {!isLoading && isSignedIn ? (
              <>
                <a href="/dashboard" className={styles.navSignIn}>
                  Go to Dashboard →
                </a>
                {userImage ? (
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={styles.avatarBtn}
                    aria-label={`Sign out ${userName}`}
                    title={`Signed in as ${userName}\nClick to sign out`}
                  >
                    <Image
                      src={userImage}
                      alt={userName}
                      width={32}
                      height={32}
                      className={styles.avatarImg}
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={styles.navSignOutSmall}
                    title="Sign out"
                  >
                    Sign Out
                  </button>
                )}
              </>
            ) : !isLoading ? (
              <>
                <button
                  onClick={() => signIn('demo', { role: 'STUDENT', callbackUrl: '/dashboard' })}
                  className={styles.navSignIn}
                >
                  Student Sign In
                </button>
                <button
                  onClick={() => signIn('demo', { role: 'TEACHER', callbackUrl: '/dashboard' })}
                  className={styles.navSignInTeacher}
                >
                  Teacher Sign In
                </button>
              </>
            ) : null}
          </nav>

          {/* Mobile hamburger */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.open : ""}`} />
            <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.open : ""}`} />
            <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.open : ""}`} />
          </button>
        </div>

        {/* Mobile nav panel */}
        {mobileNavOpen && (
          <div className={styles.mobileNav}>
            <a href="#about" className={styles.mobileNavLink} onClick={() => setMobileNavOpen(false)}>About</a>
            <a href="#how-it-works" className={styles.mobileNavLink} onClick={() => setMobileNavOpen(false)}>How It Works</a>
            <a href="https://www.myprps.com/home-plus-forms-and-registration" className={styles.mobileNavLink} target="_blank" rel="noopener noreferrer" onClick={() => setMobileNavOpen(false)}>Register ↗</a>
            <div className={styles.mobileNavDivider} />

            {/* Mobile auth-aware CTAs */}
            {isLoading ? null : isSignedIn ? (
              <>
                <a
                  href="/dashboard"
                  className={`${styles.ctaBtn} ${styles.ctaStudent} ${styles.mobileNavBtn}`}
                >
                  📊 Go to Dashboard
                </a>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className={`${styles.ctaBtn} ${styles.ctaTeacher} ${styles.mobileNavBtn}`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { signIn('google', { callbackUrl: '/dashboard' }); setMobileNavOpen(false); }}
                  className={`${styles.ctaBtn} ${styles.ctaStudent} ${styles.mobileNavBtn}`}
                >
                  🎒 Student Sign In
                </button>
                <button
                  onClick={() => { signIn('google', { callbackUrl: '/dashboard' }); setMobileNavOpen(false); }}
                  className={`${styles.ctaBtn} ${styles.ctaTeacher} ${styles.mobileNavBtn}`}
                >
                  👩‍🏫 Teacher Sign In
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero} id="about">
        <div className={styles.heroInner}>
          {/* Top branded row: Logo + Pillars side by side */}
          <div className={`${styles.heroBrandRow} animate-in`}>
            <Image
              src="/images/hpln-logo.png"
              alt="Home Plus Online Learning"
              width={400}
              height={125}
              className={styles.heroBrandLogo}
              priority
            />
            <Image
              src="/images/pillars-lgs.png"
              alt="Learn. Grow. Succeed."
              width={340}
              height={145}
              className={styles.heroPillars}
            />
          </div>

          {/* Full-width content below */}
          <div className={styles.heroContent}>
            <div className={`${styles.heroBadge} animate-in delay-1`}>
              Alberta Curriculum · Grades 1–9
            </div>

            {/* Auth-aware hero heading */}
            {isSignedIn ? (
              <>
                <h1 className={`${styles.heroTagline} animate-in delay-1`}>
                  {heroGreeting},{" "}
                  <span className={styles.heroTaglineAccent}>
                    {userName.split(" ")[0] || ""}
                  </span>
                </h1>
                <p className={`${styles.heroDesc} animate-in delay-2`}>
                  Pick up where you left off — your learning journey continues
                  with clear direction and teacher support.
                </p>
                <div className={`${styles.heroCta} animate-in delay-2`}>
                  <a
                    href="/dashboard"
                    className={`${styles.ctaBtn} ${styles.ctaStudent}`}
                  >
                    📊 Go to Dashboard
                  </a>
                </div>
              </>
            ) : (
              <>
                <h1 className={`${styles.heroTagline} animate-in delay-1`}>
                  Structured learning at home,{" "}
                  <span className={styles.heroTaglineAccent}>
                    supported every step of the way
                  </span>
                </h1>
                <p className={`${styles.heroDesc} animate-in delay-2`}>
                  Home Plus is a flexible, asynchronous learning program that
                  supports students in building strong academic skills through
                  guided independent learning at home — offering families greater
                  choice with clear direction and teacher support.
                </p>
                <div className={`${styles.heroCta} animate-in delay-2`}>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className={`${styles.ctaBtn} ${styles.ctaStudent}`}
                  >
                    🎒 Student Sign In
                  </button>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className={`${styles.ctaBtn} ${styles.ctaTeacher}`}
                  >
                    👩‍🏫 Teacher Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionContainer}>
          <div className={styles.sectionLabel}>Our Approach</div>
          <h2 className={styles.sectionTitle}>How Home Plus Works</h2>
          <p className={styles.sectionSubtitle}>
            A structured, supportive approach to learning at home — designed
            for real families and real students.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={`${styles.featureIcon} ${styles.featureIconBlue}`}>📚</div>
              <h3 className={styles.featureTitle}>Flexible Learning</h3>
              <p className={styles.featureDesc}>
                Students learn at their own pace with structured lessons they
                can access anytime, anywhere — designed for home learning that
                fits family schedules.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={`${styles.featureIcon} ${styles.featureIconGreen}`}>🧭</div>
              <h3 className={styles.featureTitle}>Clear Direction</h3>
              <p className={styles.featureDesc}>
                Every lesson has defined learning targets, step-by-step
                guidance, and built-in checkpoints so students always know
                where they are and what to do next.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={`${styles.featureIcon} ${styles.featureIconTeal}`}>👩‍🏫</div>
              <h3 className={styles.featureTitle}>Teacher Support</h3>
              <p className={styles.featureDesc}>
                Teachers monitor progress, provide feedback, and offer
                intervention when needed — students are never learning alone.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={`${styles.featureIcon} ${styles.featureIconAmber}`}>⭐</div>
              <h3 className={styles.featureTitle}>Quality Curriculum</h3>
              <p className={styles.featureDesc}>
                Aligned to the Alberta curriculum with engaging activities,
                videos, quizzes, and meaningful assessments that build mastery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AUDIENCE CARDS ===== */}
      <section className={styles.audience}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionLabel}>Who It&apos;s For</div>
          <h2 className={styles.sectionTitle}>Built for Everyone</h2>
          <p className={styles.sectionSubtitle}>
            Whether you&apos;re a student, teacher, or family — Home Plus is
            designed with you in mind.
          </p>

          <div className={styles.audienceGrid}>
            <div className={`${styles.audienceCard} ${styles.studentCard}`}>
              <div className={styles.audienceIcon}>🎒</div>
              <h3 className={styles.audienceTitle}>For Students</h3>
              <p className={styles.audienceDesc}>
                Learn at your own speed with engaging lessons, interactive
                activities, and clear progress tracking. You&apos;ll always
                know what to work on next.
              </p>
              <ul className={styles.audienceList}>
                <li>Interactive lessons with videos and activities</li>
                <li>Progress bars and mastery tracking</li>
                <li>Self-paced learning that fits your schedule</li>
              </ul>
            </div>

            <div className={`${styles.audienceCard} ${styles.teacherCard}`}>
              <div className={styles.audienceIcon}>👩‍🏫</div>
              <h3 className={styles.audienceTitle}>For Teachers</h3>
              <p className={styles.audienceDesc}>
                Monitor student progress in real time, access grade reports,
                and identify students who need support — all from one dashboard.
              </p>
              <ul className={styles.audienceList}>
                <li>Real-time student progress dashboard</li>
                <li>Grade reports and CSV export</li>
                <li>Intervention alerts and analytics</li>
              </ul>
            </div>

            <div className={`${styles.audienceCard} ${styles.familyCard}`}>
              <div className={styles.audienceIcon}>🏡</div>
              <h3 className={styles.audienceTitle}>For Families</h3>
              <p className={styles.audienceDesc}>
                Home Plus gives families the flexibility to support their
                child&apos;s learning at home while following a proven,
                structured curriculum.
              </p>
              <ul className={styles.audienceList}>
                <li>Aligned to Alberta curriculum standards</li>
                <li>Visible progress and completion tracking</li>
                <li>Meaningful, guided independent learning</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== REGISTER CTA ===== */}
      <section className={styles.ctaBanner} id="register">
        <div className={styles.sectionContainer}>
          <h2 className={styles.ctaBannerTitle}>
            Ready to join Home Plus?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Register through Prairie Rose Public Schools to get started, or
            sign in if you&apos;re already enrolled.
          </p>
          <div className={styles.ctaBannerActions}>
            <a
              href="https://www.myprps.com/home-plus-forms-and-registration"
              className={`${styles.ctaBtn} ${styles.ctaRegister}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📋 Register with PRPS
            </a>
            {isSignedIn ? (
              <a
                href="/dashboard"
                className={`${styles.ctaBtn} ${styles.ctaStudent}`}
              >
                📊 Go to Dashboard
              </a>
            ) : (
              <>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  className={`${styles.ctaBtn} ${styles.ctaStudent}`}
                >
                  🎒 Student Sign In
                </button>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  className={`${styles.ctaBtn} ${styles.ctaTeacher}`}
                >
                  👩‍🏫 Teacher Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== CONTACT SECTION ===== */}
      <section className={styles.contact} id="contact">
        <div className={styles.sectionContainer}>
          <div className={styles.contactInner}>
            <div className={styles.contactText}>
              <h2 className={styles.contactTitle}>Let&apos;s Talk...</h2>
              <p className={styles.contactDesc}>
                If you are interested in having a conversation about your home
                education, shared responsibility, or at-home learning
                opportunities, please contact:
              </p>
            </div>
            <div className={styles.contactCard}>
              <div className={styles.contactOrg}>Home Plus Learning Network</div>
              <div className={styles.contactName}>Jenn LaDouceur</div>
              <div className={styles.contactDetails}>
                <a href="tel:403-526-3186" className={styles.contactLink}>
                  📞 403-526-3186
                </a>
                <a href="mailto:jennladouceur@prrd8.ca" className={styles.contactLink}>
                  ✉️ jennladouceur@prrd8.ca
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image
              src="/images/hpln-logo.png"
              alt="Home Plus"
              width={150}
              height={47}
              className={styles.footerLogoImg}
            />
            <p className={styles.footerTagline}>
              Learn. Grow. Succeed.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Platform</h4>
              {isSignedIn ? (
                <a href="/dashboard">Go to Dashboard</a>
              ) : (
                <>
                  <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className={styles.footerSignInBtn}>Student Sign In</button>
                  <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className={styles.footerSignInBtn}>Teacher Sign In</button>
                </>
              )}
              <a href="https://www.myprps.com/home-plus-forms-and-registration" target="_blank" rel="noopener noreferrer">Register</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Contact</h4>
              <a href="tel:403-526-3186">403-526-3186</a>
              <a href="mailto:jennladouceur@prrd8.ca">jennladouceur@prrd8.ca</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Use</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} Home Plus Online Learning. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
