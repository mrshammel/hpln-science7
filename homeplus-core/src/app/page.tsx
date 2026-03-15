import Image from "next/image";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          {/* Left: Logo + Tagline + Description + CTAs */}
          <div className={`${styles.heroLeft} animate-in`}>
            <Image
              src="/images/hpln-logo.png"
              alt="Home Plus Online Learning"
              width={420}
              height={132}
              className={styles.logoImage}
              priority
            />

            <h1 className={styles.heroTagline}>
              Your child&apos;s learning,{" "}
              <span className={styles.heroTaglineAccent}>
                guided and supported every step of the way
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

          {/* Right: Learn. Grow. Succeed. pillars */}
          <div className={`${styles.heroRight} animate-in delay-2`}>
            <Image
              src="/images/pillars-lgs.png"
              alt="Learn. Grow. Succeed."
              width={500}
              height={350}
              className={styles.pillarsImage}
            />
          </div>
        </div>

        {/* Decorative wave transition */}
        <div className={styles.heroWave}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path
              d="M0,32 C360,80 540,0 720,40 C900,80 1080,16 1440,48 L1440,80 L0,80 Z"
              fill="var(--hp-bg)"
            />
          </svg>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>How Home Plus Works</h2>
          <p className={styles.sectionSubtitle}>
            A structured, supportive approach to learning at home — designed
            for real families and real students.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📚</div>
              <h3 className={styles.featureTitle}>Flexible Learning</h3>
              <p className={styles.featureDesc}>
                Students learn at their own pace with structured lessons they
                can access anytime, anywhere — designed for home learning that
                fits family schedules.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>🧭</div>
              <h3 className={styles.featureTitle}>Clear Direction</h3>
              <p className={styles.featureDesc}>
                Every lesson has defined learning targets, step-by-step
                guidance, and built-in checkpoints so students always know
                where they are and what to do next.
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

      {/* ===== CTA BANNER ===== */}
      <section className={styles.ctaBanner}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.ctaBannerTitle}>Ready to get started?</h2>
          <p className={styles.ctaBannerDesc}>
            Sign in to access your lessons, track your progress, and start
            learning today.
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
              width={160}
              height={50}
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
