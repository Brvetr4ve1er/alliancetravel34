// site/admin/i18n.js — admin-local FR/AR dictionary. Deliberately independent
// of the public site's i18n.js (different lifecycle, ~70 keys vs 1300 lines).
export const STRINGS = {
  fr: {
    "home.intro": "Vue d'ensemble de votre activité : visites, clics et demandes des 7 derniers jours.",
    "demandes.intro": "Les personnes qui vous ont écrit depuis le site. Appelez, répondez sur WhatsApp, et suivez chaque demande.",
    "pages.intro": "Modifiez le contenu de vos pages voyage — titres, prix, dates. Vos changements partent en ligne après publication.",
    "reglages.intro": "Votre compte, la langue de l'interface, et l'état des connexions du site.",
    "onboard.title": "Bienvenue dans votre espace",
    "onboard.home": "Suivez visites et demandes en un coup d'œil.",
    "onboard.leads": "Retrouvez chaque client qui vous a contacté.",
    "onboard.pages": "Modifiez vos pages voyage vous-même.",
    "onboard.reglages": "Mot de passe, langue, et connexions.",
    "help.visits": "Le nombre de fois où vos pages ont été ouvertes. Une même personne peut compter plusieurs fois.",
    "help.clicks": "Le nombre de fois où un visiteur a cliqué sur un bouton WhatsApp pour vous écrire.",
    "help.leads": "Les demandes envoyées via le formulaire de réservation. Chacune apparaît dans l'onglet Demandes.",
    "help.status": "Indique si votre site peut recevoir des modifications depuis cet espace. « Connecté » = tout fonctionne.",
    "empty.visits.title": "Pas encore de données",
    "empty.leads.title": "Aucune demande pour l'instant",
    "funnel.legend.visits": "Visites", "funnel.legend.clicks": "Clics", "funnel.legend.leads": "Demandes",
    "app.title": "Espace Alliance",
    "nav.home": "Accueil", "nav.leads": "Demandes", "nav.pages": "Pages", "nav.settings": "Réglages",
    "login.title": "Espace administrateur",
    "login.sub": "Connectez-vous pour gérer vos pages et vos demandes.",
    "login.email": "Email", "login.password": "Mot de passe", "login.submit": "Se connecter",
    "login.nopw": "Je n'ai pas encore de mot de passe",
    "login.nopw.help": "Recevez un lien de connexion à usage unique par email. Une fois connecté, définissez un mot de passe.",
    "login.magic": "Recevoir un lien par email",
    "setpw.title": "Mot de passe", "setpw.sub": "Choisissez un mot de passe d'au moins 8 caractères.",
    "setpw.new": "Nouveau mot de passe", "setpw.confirm": "Confirmer", "setpw.save": "Enregistrer", "setpw.back": "Retour",
    "kpi.visits": "Visites", "kpi.clicks": "Clics WhatsApp", "kpi.leads": "Demandes",
    "kpi.window": "7 derniers jours", "kpi.delta": "vs 7 jours précédents",
    "funnel.caption": "Sur {v} visites, {c} ont cliqué WhatsApp, {l} ont laissé une demande.",
    "empty.visits": "Les visites apparaîtront dès demain — le compteur vient d'être activé.",
    "empty.leads": "Aucune demande pour le moment. Elles apparaîtront ici dès qu'un visiteur enverra le formulaire.",
    "home.latest": "Dernières demandes", "home.status": "État du site",
    "status.online": "Site en ligne ✓", "status.lastpub": "Dernière publication",
    "status.by": "par", "status.nogithub": "Publication non configurée — jeton GitHub manquant",
    "leads.search": "Rechercher (nom, téléphone, voyage…)", "leads.export": "Exporter CSV",
    "leads.count": "{n} demande(s)", "leads.all": "Toutes",
    "leads.status.nouveau": "Nouveau", "leads.status.contacté": "Contacté", "leads.status.conclu": "Conclu",
    "leads.call": "Appeler", "leads.wa": "WhatsApp",
    "leads.people": "{a} adulte(s), {k} enfant(s)", "leads.total": "Total estimé",
    "leads.notes": "Notes", "leads.close": "Fermer",
    "pages.title": "Vos pages", "pages.edit": "Modifier", "pages.soon": "Bientôt — édition en cours de construction",
    "pages.visa": "Rendez-vous visa", "pages.back": "← Toutes les pages",
    "pages.group.seo": "Référencement (Google)", "pages.group.hero": "En-tête de la page", "pages.group.prices": "Tarifs hôtels (DA)",
    "pages.advanced": "Avancé — réservé au développeur",
    "pages.advanced.warn": "Modifier ce bloc peut casser la page. La sauvegarde est refusée si le contenu est invalide.",
    "pages.publish": "Publier", "pages.publishing": "Publication…",
    "pages.published": "Publié ✓ — la page sera à jour dans ~1 minute.",
    "pages.nogithub": "Publication non configurée — jeton GitHub manquant. Les modifications ne peuvent pas être enregistrées.",
    "pages.viewcommit": "Voir le commit",
    "settings.title": "Réglages", "settings.lang": "Langue de l'interface",
    "settings.password": "Changer le mot de passe", "settings.logout": "Se déconnecter",
    "settings.config": "Configuration", "settings.supabase": "Base de données (Supabase)",
    "settings.github": "Publication (GitHub)", "settings.branch": "Branche de publication",
    "settings.ok": "Connecté", "settings.ko": "Non configuré",
    "skip.content": "Aller au contenu", "common.gotit": "J'ai compris", "common.loading": "Chargement…", "common.retry": "Réessayer",
    "common.error": "Une erreur est survenue — réessayez.",
    "common.ago.min": "il y a {n} min", "common.ago.h": "il y a {n} h", "common.ago.d": "il y a {n} j",
  },
  ar: {
    "home.intro": "نظرة عامة على نشاطك: الزيارات والنقرات والطلبات خلال آخر 7 أيام.",
    "demandes.intro": "الأشخاص الذين راسلوك عبر الموقع. اتصل، ردّ على واتساب، وتابع كل طلب.",
    "pages.intro": "عدّل محتوى صفحات رحلاتك — العناوين والأسعار والتواريخ. تظهر تغييراتك بعد النشر.",
    "reglages.intro": "حسابك، لغة الواجهة، وحالة اتصالات الموقع.",
    "onboard.title": "مرحباً بك في فضاءك",
    "onboard.home": "تابع الزيارات والطلبات بنظرة واحدة.",
    "onboard.leads": "اعثر على كل عميل تواصل معك.",
    "onboard.pages": "عدّل صفحات رحلاتك بنفسك.",
    "onboard.reglages": "كلمة المرور واللغة والاتصالات.",
    "help.visits": "عدد المرات التي فُتحت فيها صفحاتك. قد يُحتسب الشخص نفسه أكثر من مرة.",
    "help.clicks": "عدد المرات التي نقر فيها زائر على زر واتساب لمراسلتك.",
    "help.leads": "الطلبات المُرسلة عبر نموذج الحجز. يظهر كل طلب في تبويب الطلبات.",
    "help.status": "يوضّح ما إذا كان موقعك يستطيع تلقّي التعديلات من هذا الفضاء. « متصل » = كل شيء يعمل.",
    "empty.visits.title": "لا توجد بيانات بعد",
    "empty.leads.title": "لا توجد طلبات حالياً",
    "funnel.legend.visits": "زيارات", "funnel.legend.clicks": "نقرات", "funnel.legend.leads": "طلبات",
    "app.title": "فضاء أليانس",
    "nav.home": "الرئيسية", "nav.leads": "الطلبات", "nav.pages": "الصفحات", "nav.settings": "الإعدادات",
    "login.title": "فضاء الإدارة",
    "login.sub": "سجّل الدخول لإدارة صفحاتك وطلباتك.",
    "login.email": "البريد الإلكتروني", "login.password": "كلمة المرور", "login.submit": "تسجيل الدخول",
    "login.nopw": "ليست لدي كلمة مرور بعد",
    "login.nopw.help": "استلم رابط دخول لمرة واحدة عبر البريد. بعد الدخول، عيّن كلمة مرور.",
    "login.magic": "استلام رابط عبر البريد",
    "setpw.title": "كلمة المرور", "setpw.sub": "اختر كلمة مرور من 8 أحرف على الأقل.",
    "setpw.new": "كلمة المرور الجديدة", "setpw.confirm": "التأكيد", "setpw.save": "حفظ", "setpw.back": "رجوع",
    "kpi.visits": "الزيارات", "kpi.clicks": "نقرات واتساب", "kpi.leads": "الطلبات",
    "kpi.window": "آخر 7 أيام", "kpi.delta": "مقارنة بالأيام السبعة السابقة",
    "funnel.caption": "من بين {v} زيارة، نقر {c} على واتساب، وترك {l} طلباً.",
    "empty.visits": "ستظهر الزيارات ابتداءً من الغد — تم تفعيل العداد للتو.",
    "empty.leads": "لا توجد طلبات حالياً. ستظهر هنا فور إرسال زائر للنموذج.",
    "home.latest": "أحدث الطلبات", "home.status": "حالة الموقع",
    "status.online": "الموقع يعمل ✓", "status.lastpub": "آخر نشر",
    "status.by": "بواسطة", "status.nogithub": "النشر غير مُهيأ — رمز GitHub مفقود",
    "leads.search": "بحث (الاسم، الهاتف، الرحلة…)", "leads.export": "تصدير CSV",
    "leads.count": "{n} طلب(ات)", "leads.all": "الكل",
    "leads.status.nouveau": "جديد", "leads.status.contacté": "تم التواصل", "leads.status.conclu": "تم الاتفاق",
    "leads.call": "اتصال", "leads.wa": "واتساب",
    "leads.people": "{a} بالغ، {k} طفل", "leads.total": "المجموع التقديري",
    "leads.notes": "ملاحظات", "leads.close": "إغلاق",
    "pages.title": "صفحاتك", "pages.edit": "تعديل", "pages.soon": "قريباً — التعديل قيد الإنشاء",
    "pages.visa": "مواعيد التأشيرات", "pages.back": "← كل الصفحات",
    "pages.group.seo": "الظهور في غوغل", "pages.group.hero": "ترويسة الصفحة", "pages.group.prices": "أسعار الفنادق (دج)",
    "pages.advanced": "متقدم — مخصص للمطوّر",
    "pages.advanced.warn": "تعديل هذا الجزء قد يعطّل الصفحة. يُرفض الحفظ إذا كان المحتوى غير صالح.",
    "pages.publish": "نشر", "pages.publishing": "جارٍ النشر…",
    "pages.published": "تم النشر ✓ — ستُحدَّث الصفحة خلال دقيقة تقريباً.",
    "pages.nogithub": "النشر غير مُهيأ — رمز GitHub مفقود. لا يمكن حفظ التعديلات.",
    "pages.viewcommit": "عرض التغيير",
    "settings.title": "الإعدادات", "settings.lang": "لغة الواجهة",
    "settings.password": "تغيير كلمة المرور", "settings.logout": "تسجيل الخروج",
    "settings.config": "الإعداد", "settings.supabase": "قاعدة البيانات (Supabase)",
    "settings.github": "النشر (GitHub)", "settings.branch": "فرع النشر",
    "settings.ok": "متصل", "settings.ko": "غير مُهيأ",
    "skip.content": "انتقل إلى المحتوى", "common.gotit": "فهمت", "common.loading": "جارٍ التحميل…", "common.retry": "إعادة المحاولة",
    "common.error": "حدث خطأ — أعد المحاولة.",
    "common.ago.min": "منذ {n} د", "common.ago.h": "منذ {n} س", "common.ago.d": "منذ {n} يوم",
  },
};

const KEY = "at_admin_lang";
let lang = "fr";
try { lang = localStorage.getItem(KEY) === "ar" ? "ar" : "fr"; } catch { /* node / private mode */ }

export function getLang() { return lang; }
export function t(k) { return STRINGS[lang][k] ?? STRINGS.fr[k] ?? k; }
export function fmt(k, vars) {
  let s = t(k);
  for (const [name, v] of Object.entries(vars || {})) s = s.replaceAll(`{${name}}`, String(v));
  return s;
}
export function applyI18n(root) {
  (root || document).querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  (root || document).querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
}
export function setLang(l) {
  lang = l === "ar" ? "ar" : "fr";
  try { localStorage.setItem(KEY, lang); } catch { /* private mode */ }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  applyI18n();
  document.dispatchEvent(new CustomEvent("admin:lang", { detail: lang }));
}
