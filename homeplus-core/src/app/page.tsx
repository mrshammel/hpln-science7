"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./page.module.css";

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
            <a href="#apply" className={styles.navLink}>Apply</a>
            <div className={styles.navDivider} />
            <a
              href="/api/auth/signin/google?callbackUrl=/dashboard"
              className={styles.navSignIn}
            >
              Student Sign In
            </a>
            <a
              href="/api/auth/signin/google?callbackUrl=/teacher"
              className={styles.navSignInTeacher}
            >
              Teacher Sign In
            </a>
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
            <a href="#apply" className={styles.mobileNavLink} onClick={() => setMobileNavOpen(false)}>Apply</a>
            <div className={styles.mobileNavDivider} />
            <a
              href="/api/auth/signin/google?callbackUrl=/dashboard"
              className={`${styles.ctaBtn} ${styles.ctaStudent} ${styles.mobileNavBtn}`}
            >
              🎒 Student Sign In
            </a>
            <a
              href="/api/auth/signin/google?callbackUrl=/teacher"
              className={`${styles.ctaBtn} ${styles.ctaTeacher} ${styles.mobileNavBtn}`}
            >
              👩‍🏫 Teacher Sign In
            </a>
          </div>
        )}
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero} id="about">
        <div className={styles.heroContainer}>
          {/* Left: Headline + Description + CTAs */}
          <div className={styles.heroLeft}>
            <div className={`${styles.heroBadge} animate-in`}>
              Alberta Curriculum · Grades 1–9
            </div>

            <h1 className={`${styles.heroTagline} animate-in`}>
              Structured learning at home,{" "}
              <span className={styles.heroTaglineAccent}>
                supported every step of the way
              </span>
            </h1>

            <p className={`${styles.heroDesc} animate-in delay-1`}>
              Home Plus is a flexible, asynchronous learning program that
              supports students in building strong academic skills through
              guided independent learning at home. It is designed to offer
              families greater choice while ensuring students remain engaged
              in meaningful, high-quality learning with clear direction and
              support.
            </p>

            <div className={`${styles.heroCta} animate-in delay-2`}>
              <a
                href="/api/auth/signin/google?callbackUrl=/dashboard"
                className={`${styles.ctaBtn} ${styles.ctaStudent}`}
              >
                🎒 Student Sign In
              </a>
              <a
                href="/api/auth/signin/google?callbackUrl=/teacher"
                className={`${styles.ctaBtn} ${styles.ctaTeacher}`}
              >
                👩‍🏫 Teacher Sign In
              </a>
            </div>
          </div>

          {/* Right: Pillars artwork */}
          <div className={`${styles.heroRight} animate-in delay-1`}>
            <Image
              src="/images/pillars-lgs.png"
              alt="Learn. Grow. Succeed."
              width={420}
              height={180}
              className={styles.pillarsImage}
            />
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

      {/* ===== APPLICATION CTA ===== */}
      <section className={styles.ctaBanner} id="apply">
        <div className={styles.sectionContainer}>
          <h2 className={styles.ctaBannerTitle}>
            Ready to join Home Plus?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Sign in to access your courses, track your progress, and start your
            learning journey with Home Plus today.
          </p>
          <div className={styles.ctaBannerActions}>
            <a
              href="/api/auth/signin/google?callbackUrl=/dashboard"
              className={`${styles.ctaBtn} ${styles.ctaStudent}`}
            >
              🎒 Student Sign In
            </a>
            <a
              href="/api/auth/signin/google?callbackUrl=/teacher"
              className={`${styles.ctaBtn} ${styles.ctaTeacher}`}
            >
              👩‍🏫 Teacher Sign In
            </a>
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
              <a href="/api/auth/signin/google?callbackUrl=/dashboard">Student Sign In</a>
              <a href="/api/auth/signin/google?callbackUrl=/teacher">Teacher Sign In</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Support</h4>
              <a href="mailto:support@homeplus.ca">Contact Us</a>
              <a href="#">Help Center</a>
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
