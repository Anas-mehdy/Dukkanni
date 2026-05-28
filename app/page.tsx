import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/landing/ThemeToggle";
import { PhoneSimulator } from "@/components/landing/PhoneSimulator";

// ---------------------------------------------------------------------------
// Main Page Component (Next.js Server Component)
// ---------------------------------------------------------------------------

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const ctaRoute = isAuthenticated ? "/dashboard" : "/register";
  const ctaText = isAuthenticated ? "دخول لوحة التحكم" : "أنشئ متجرك مجاناً";
  const navRoute = isAuthenticated ? "/dashboard" : "/login";
  const navText = isAuthenticated ? "لوحة التحكم" : "دخول التاجر";

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden font-cairo transition-colors duration-200">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[45vw] h-[45vw] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── 1. STICKY NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 w-full bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]/60 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 select-none">
            <img src="/logo.png" alt="دكاني" className="h-8 w-auto object-contain" />
            <span className="text-xl font-extrabold text-[var(--color-text)]">دكاني</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--color-text-muted)]">
            <a href="#features" className="hover:text-emerald-400 transition-colors">الميزات</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">كيف نعمل</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">الباقات</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">الأسئلة الشائعة</a>
          </nav>

          {/* Actions (Theme Toggle + Auth Button) */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href={navRoute}
              className="px-4 py-2 border-1.5 border-emerald-500/40 text-emerald-400 hover:text-white hover:bg-emerald-500 hover:border-emerald-500 rounded-full font-bold text-xs sm:text-sm transition-all duration-200"
            >
              {navText}
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ── */}
      <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 max-w-6xl mx-auto px-4 text-center">
        {/* Banner Announcement */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-extrabold text-emerald-400 select-none animate-pulse">
            <span>🚀 المنصة الأبسط لتجارة الواتساب لعام 2026</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-extrabold text-emerald-400 select-none">
            <span>🌐 دعم كامل لـ 3 لغات (AR / TR / EN)</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[var(--color-text)] leading-tight max-w-4xl mx-auto mb-6 tracking-tight">
          حوّل محادثات الواتساب إلى <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
            مبيعات منظمة بلمحة عين
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[var(--color-text-muted)] max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          المنصة الأبسط لصغار الكسبة والتجار المحليين. أنشئ كاتالوج منتجاتك خلال 60 ثانية، واستقبل طلبيات زبائنك بفواتير دقيقة مباشرة على الواتساب، مع دعم كامل وفوري لثلاث لغات (العربية، التركية، والإنجليزية) لتخدم جميع عملائك في تركيا وخارجها بضغطة زر.
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href={ctaRoute}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-full text-base shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 text-center"
          >
            {ctaText}
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded-full text-base transition-all duration-200 text-center"
          >
            شاهد ميزات المنصة 👇
          </a>
        </div>

        {/* ── Visual Mobile Mockup ── */}
        <PhoneSimulator />
      </section>

      {/* ── 3. CORE FEATURES SECTION ── */}
      <section id="features" className="py-20 md:py-28 bg-[var(--color-surface)]/40 border-t border-[var(--color-border)]/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text)] mb-4">
              كل ما تحتاجه لإدارة تجارتك باحترافية وبساطة 💎
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-2xl mx-auto">
              تخلّص من تعقيدات سلال التسوق الكلاسيكية وتكاليفها الباهظة. صممنا دكاني ليركز بالكامل على سرعة العمل وتوفير الجهد.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Feature 1 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">مصمم بالكامل للموبايل</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                إدارة متجرك، وتحديث مخزونك، وتلبية طلبات زبائنك مباشرة من هاتفك الذكي أثناء التنقل وبسهولة تامة.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-3xl mb-4">⚡ طلب سريع بـ 3 نقرات</div>
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">تسوق أسرع من البرق</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                يدخل زبونك، يضيف المنتجات لسلة التسوق، يدخل اسمه وهاتفه، ويصلك الطلب منسقاً وحاضراً على الواتساب.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-3xl mb-4">🖨️</div>
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">طباعة أوامر التحضير</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                كبسة واحدة كافية لطباعة قائمة تعبئة المنتجات الإجمالية اليومية أو فواتير الزبائن المستقلة لتسليمها لسيارات التوزيع.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-3xl mb-4">🔔</div>
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">إشعارات وتتبع ذكي</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                رنين صوتي حي فور وصول كل طلب جديد لمتجرك، مع إمكانية مشاركة روابط تتبع الشحنات لعملائك بنقرة زر.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">متجر بثلاث لغات</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                دعم كامل وفوري لـ 3 لغات (العربية، التركية، والإنجليزية) مع ترجمة تلقائية ذكية للمنتجات لخدمة كافة فئات عملائك في تركيا وخارجها.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS SECTION ── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text)] mb-4">
              ابدأ بـ 3 خطوات بسيطة 🏁
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-2xl mx-auto">
              خلال دقائق معدودة ستكون جاهزاً لنشر متجرك واستقبال المبيعات المنظمة بدقة دون الحاجة لخبرات برمجية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Steps Timeline Line (Desktop only) */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-[2px] bg-[var(--color-border)] z-0" />

            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center shadow-lg mb-6 text-lg border-4 border-[var(--color-bg)]">
                1
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">أنشئ حسابك وحدد رابطك</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">
                اختر اسماً مميزاً يعبّر عن علامتك التجارية واحجز رابط متجرك الفريد بثوانٍ (مثال: <code className="text-emerald-400 font-mono">jasmine.dukkanni.com</code>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center shadow-lg mb-6 text-lg border-4 border-[var(--color-bg)]">
                2
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">أضف منتجاتك وحدد أسعارك</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">
                ارفع صور منتجاتك من هاتفك المحمول، واكتب أسماءها ومواصفاتها، وحدد أسعار البيع بالعملة المحلية المفضلة لديك.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center shadow-lg mb-6 text-lg border-4 border-[var(--color-bg)]">
                3
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">استقبل الطلبيات على الواتساب</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">
                انشر الرابط في بايو إنستغرام أو واتساب واستقبل الفواتير منظمة ومحسوبة بدقة بضغطة زر واحدة من الزبون!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PRICING SECTION ── */}
      <section id="pricing" className="py-20 md:py-28 bg-[var(--color-surface)]/40 border-t border-b border-[var(--color-border)]/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text)] mb-4">
              خطط أسعار شفافة وبسيطة 💰
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-2xl mx-auto">
              باقات مرنة تناسب بائعي التجزئة وصغار التجار دون عقود طويلة الأمد أو عمولات خفية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Package 1: Free Trial */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-muted)] mb-2">الباقة التجريبية</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)]">مجاناً</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-6">تجربة كاملة ومثالية للمبتدئين لاستكشاف النظام.</p>
                <div className="border-t border-[var(--color-border)] pt-6">
                  <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
                    <li className="flex items-center gap-2">🟢 مدة تجريبية 7 أيام كاملة</li>
                    <li className="flex items-center gap-2">🟢 كافة الميزات مفعلة</li>
                    <li className="flex items-center gap-2">🟢 لا تحتاج لبطاقة ائتمان</li>
                    <li className="flex items-center gap-2">🟢 دعم فني متكامل</li>
                  </ul>
                </div>
              </div>
              <Link
                href={ctaRoute}
                className="mt-8 block w-full py-3 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] font-bold rounded-xl text-center text-sm border border-[var(--color-border)] transition-colors"
              >
                ابدأ تجربتك المجانية
              </Link>
            </div>

            {/* Package 2: Monthly GROWTH (Popular) */}
            <div className="bg-[var(--color-surface)] border-2 border-emerald-500 p-8 rounded-2xl flex flex-col justify-between relative transform scale-102 shadow-xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-extrabold rounded-full select-none">
                الأكثر اختياراً 🔥
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">النمو السريع (الشهرية)</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)]">5$</span>
                  <span className="text-xs text-[var(--color-text-muted)]">/ شهرياً</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-6">الخيار المثالي للمحلات وموزعي التجزئة النشطين.</p>
                <div className="border-t border-[var(--color-border)] pt-6">
                  <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
                    <li className="flex items-center gap-2">🟢 عدد منتجات غير محدود 📦</li>
                    <li className="flex items-center gap-2">🟢 تنبيهات رنين الطلب الحية 🔔</li>
                    <li className="flex items-center gap-2">🟢 إحصائيات وتصدير إكسل 📊</li>
                    <li className="flex items-center gap-2">🟢 طباعة الفواتير وقوائم التحضير 🖨️</li>
                    <li className="flex items-center gap-2">🟢 رابط ساب دومين مخصص</li>
                  </ul>
                </div>
              </div>
              <Link
                href={ctaRoute}
                className="mt-8 block w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-center text-sm shadow-md transition-colors"
              >
                اشترك الآن
              </Link>
            </div>

            {/* Package 3: Annual */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-muted)] mb-2">التاجر الجاد (السنوية)</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)]">50$</span>
                  <span className="text-xs text-[var(--color-text-muted)]">/ سنوياً</span>
                </div>
                <p className="text-xs text-emerald-455 font-bold mb-6">وفر 17% عند الاشتراك السنوي 💰</p>
                <div className="border-t border-[var(--color-border)] pt-6">
                  <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
                    <li className="flex items-center gap-2">🟢 جميع ميزات باقة النمو السريع</li>
                    <li className="flex items-center gap-2">🟢 توفير سنوي قدره 17%</li>
                    <li className="flex items-center gap-2">🟢 أولوية في الميزات الجديدة</li>
                    <li className="flex items-center gap-2">🟢 دعم فني مخصص VIP</li>
                  </ul>
                </div>
              </div>
              <Link
                href={ctaRoute}
                className="mt-8 block w-full py-3 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] font-bold rounded-xl text-center text-sm border border-[var(--color-border)] transition-colors"
              >
                اختر الباقة السنوية
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ SECTION ── */}
      <section id="faq" className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mb-4">
              الأسئلة الشائعة 💡
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              إجابات سريعة للأسئلة الأكثر تداولاً من التجار الكرام.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* FAQ 1 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>هل يحتاج زبائني لتنزيل تطبيق أو إنشاء حساب للطلب؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                أبداً! يفتح متجرك فوراً من أي متصفح بلمسة واحدة ومن أي جهاز. يستطيع زبائنك تصفح كاتالوج المنتجات وتحديد الكميات، وتقديم طلباتهم من متصفح الهاتف فوراً وبكل يسر.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>هل تأخذ منصة دكاني عمولات على مبيعاتي؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                أيجوز ذلك؟ أبداً، نتقاضى عمولة 0% على مبيعاتك. كل الأرباح وعائدات المبيعات تعود لك بالكامل. نتقاضى اشتراكاً شهرياً أو سنوياً ثابتاً وشفافاً للمنصة فقط، دون أي خصومات خفية.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>كيف تصلني أموال المبيعات من الزبائن؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                أنت تتعامل مع زبائنك بطرق الدفع التقليدية التي تفضلها (مثل الدفع عند الاستلام COD أو التحويل البنكي المباشر). دور منصة دكاني هو تنظيم الطلب، وإعداد الفاتورة بدقة، وتسليمك تفاصيلها كاملة عبر الواتساب لتأكيد الشحن والتنفيذ بسهولة.
              </p>
            </details>

            {/* FAQ 4 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>هل أحتاج خبرة تقنية لاستخدام دكاني؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                لا إطلاقاً. إذا كنت تستخدم واتساب فستستخدم دكاني. الإعداد الأولي أقل من 10 دقائق بدون أي خبرة تقنية.
              </p>
            </details>

            {/* FAQ 5 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>هل أستطيع تجربته قبل الدفع؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                نعم، عند التسجيل تحصل تلقائياً على 7 أيام مجانية كاملة بدون أي دفع مسبق أو بطاقة ائتمانية.
              </p>
            </details>

            {/* FAQ 6 */}
            <details className="group bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl transition-all duration-200 select-none">
              <summary className="flex justify-between items-center font-bold text-[var(--color-text)] text-base cursor-pointer list-none">
                <span>هل يعمل على الجوال؟</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-emerald-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                نعم بشكل ممتاز. واجهة المتجر ولوحة التحكم مصممتان أولاً للجوال ومتوافقتان مع جميع الأجهزة والمتصفحات.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER SECTION ── */}
      <footer className="border-t border-[var(--color-border)]/60 py-10 bg-[var(--color-bg)] text-center select-none text-xs sm:text-sm text-[var(--color-text-muted)]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--color-text)] font-extrabold">
            <img src="/logo.png" alt="دكاني" className="h-6 w-auto object-contain" />
            <span>دكاني</span>
          </div>
          <p>حقوق الطبع محفوظة © 2026 دكاني. صُنع بحب لدعم التجارة المحلية.</p>
        </div>
      </footer>
    </div>
  );
}
