import Image from "next/image";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero}>
        <div className={`hp-container ${styles.heroInner}`}>
          {/* Logo */}
          <div className={`${styles.logo} animate-in`}>
            <Image
              src="/images/hpln-logo.png"
              alt="Home Plus Online Learning"
              width={320}
              height={100}
              className={styles.logoImage}
              priority
            />
          </div>

          {/* Welcome */}
          <h1 className={`${styles.heroTitle} animate-in delay-1`}>
            Welcome to Home Plus
          </h1>

          {/* 3 Pillars */}
          <div className={`${styles.pillars} animate-in delay-2`}>
            <Image
              src="/images/pillars-lgs.png"
              alt="Learn. Grow. Succeed."
              width={480}
              height={180}
              className={styles.pillarsImage}
            />
          </div>

          {/* Intro paragraph */}
          <p className={`${styles.heroDesc} animate-in delay-2`}>
            Home Plus is a flexible, asynchronous learning program that supports
            students in building strong academic skills through guided
            independent learning at home. It is designed to offer families
            greater choice while ensuring students remain engaged in meaningful,
            high-quality learning with clear direction and support.
          </p>

          {/* CTA Buttons */}
          <div className={`${styles.heroCta} animate-in delay-3`}>
            <a
              href="/api/auth/signin/google?callbackUrl=/dashboard"
              className="hp-btn hp-btn-primary hp-btn-lg"
            >
              🎒 Student Sign In
            </a>
            <a
              href="/api/auth/signin/google?callbackUrl=/teacher"
              className="hp-btn hp-btn-accent hp-btn-lg"
            >
              👩‍🏫 Teacher Sign In
            </a>
          </div>
        </div>

        {/* Decorative wave */}
        <div className={styles.heroWave}>
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
            <path
              d="M0,40 C320,100 420,0 720,50 C1020,100 1200,20 1440,60 L1440,100 L0,100 Z"
              fill="var(--hp-bg)"
            />
          </svg>
        </div>
      </section>

      {/* ===== PROGRAM OVERVIEW ===== */}
      <section className={`hp-section ${styles.overview}`}>
        <div className="hp-container">
          <h2 className="hp-section-title">How Home Plus Works</h2>
          <p className="hp-section-subtitle">
            A structured, supportive approach to learning at home — designed for
            real families and real students.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📚</div>
              <h3 className={styles.featureTitle}>Flexible Learning</h3>
              <p className={styles.featureDesc}>
                Students learn at their own pace with structured lessons they can
                access anytime, anywhere — designed for home learning that fits
                family schedules.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>🧭</div>
              <h3 className={styles.featureTitle}>Clear Direction</h3>
              <p className={styles.featureDesc}>
                Every lesson has defined learning targets, step-by-step guidance,
                and built-in checkpoints so students always know where they are
                and what to do next.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>👩‍🏫</div>
              <h3 className={styles.featureTitle}>Teacher Support</h3>
              <p className={styles.featureDesc}>
                Teachers monitor progress, provide feedback, and offer
                intervention when needed — students are never learning alone.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>⭐</div>
              <h3 className={styles.featureTitle}>High-Quality Content</h3>
              <p className={styles.featureDesc}>
                Aligned to the Alberta curriculum with engaging activities,
                videos, quizzes, and meaningful assessments that build mastery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AUDIENCE CARDS ===== */}
      <section className={`hp-section ${styles.audience}`}>
        <div className="hp-container">
          <h2 className="hp-section-title">Built for Everyone</h2>
          <p className="hp-section-subtitle">
            Whether you&apos;re a student, teacher, or family — Home Plus is designed
            with you in mind.
          </p>

          <div className={styles.audienceGrid}>
            {/* Students */}
            <div className={`hp-card ${styles.audienceCard} ${styles.studentCard}`}>
              <div className={styles.audienceIcon}>🎒</div>
              <h3 className={styles.audienceTitle}>For Students</h3>
              <p className={styles.audienceDesc}>
                Learn at your own speed with engaging lessons, interactive
                activities, and clear progress tracking. You&apos;ll always know what
                to work on next and can see how far you&apos;ve come.
              </p>
              <ul className={styles.audienceList}>
                <li>Interactive lessons with videos and activities</li>
                <li>Progress bars and mastery tracking</li>
                <li>Self-paced learning that fits your schedule</li>
              </ul>
            </div>

            {/* Teachers */}
            <div className={`hp-card ${styles.audienceCard} ${styles.teacherCard}`}>
              <div className={styles.audienceIcon}>👩‍🏫</div>
              <h3 className={styles.audienceTitle}>For Teachers</h3>
              <p className={styles.audienceDesc}>
                Monitor student progress in real time, access grade reports, and
                identify students who need support — all from one dashboard.
              </p>
              <ul className={styles.audienceList}>
                <li>Real-time student progress dashboard</li>
                <li>Grade reports and CSV export</li>
                <li>Intervention alerts and analytics</li>
              </ul>
            </div>

            {/* Families */}
            <div className={`hp-card ${styles.audienceCard} ${styles.familyCard}`}>
              <div className={styles.audienceIcon}>🏡</div>
              <h3 className={styles.audienceTitle}>For Families</h3>
              <p className={styles.audienceDesc}>
                Home Plus gives families the flexibility to support their
                child&apos;s learning at home while knowing they&apos;re following a
                proven, structured curriculum.
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

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={`hp-container ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <Image
                src="/images/hpln-logo.png"
                alt="Home Plus"
                width={140}
                height={44}
                className={styles.footerLogoImg}
              />
            </div>
            <p className={styles.footerTagline}>Learn. Grow. Succeed.</p>
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
