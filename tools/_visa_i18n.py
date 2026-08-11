# -*- coding: utf-8 -*-
# STALE / UNUSED — one-shot script from the pre-generator era. Rewrites site/assets/js/i18n.js in place; referenced by nothing, never run in CI or the build. Do not run; candidate for deletion.
import re
IP = 'site/assets/js/i18n.js'
s = open(IP, encoding='utf-8').read()

# fr, en, ar in document order
DATA = [
 (('Qatar', "e-visa Hayya — plateforme officielle hayya.qa · catégorie A1 tourisme",
   "E-visa A1 tourisme via la plateforme Hayya · pas de visa à l'arrivée pour les passeports algériens ordinaires · demande 100 % en ligne, sans biométrie ni centre en Algérie. Validité 30 jours, entrée unique, extensible une fois. Délai d'instruction selon l'autorité compétente."),
  ('Émirats arabes unis', "Visa parrainé en amont — compagnie aérienne (Emirates / flydubai / Etihad), hôtel agréé ou agence aux Émirats · portails GDRFA (Dubaï) / ICP",
   "Pas de visa à l'arrivée pour les passeports algériens ordinaires : visa de visite parrainé en amont par un sponsor aux Émirats (compagnie aérienne, hôtel agréé, agence, ou proche résident engageant sa responsabilité). Traitement via GDRFA (Dubaï) ou ICP. Approbation sécuritaire ; délai selon l'autorité compétente. Amende de dépassement de séjour appliquée, sans période de grâce.")),
 (('Qatar', "Hayya e-visa — official platform hayya.qa · A1 tourist category",
   "A1 tourist e-visa via the Hayya platform · no visa on arrival for ordinary Algerian passports · 100% online, no biometrics or centre in Algeria. Valid 30 days, single entry, extendable once. Processing time subject to the competent authority."),
  ('United Arab Emirates', "Sponsor-arranged visa in advance — airline (Emirates / flydubai / Etihad), approved hotel or UAE tourism agency · GDRFA (Dubai) / ICP portals",
   "No visa on arrival for ordinary Algerian passports: the visit visa must be sponsor-arranged in advance by a UAE sponsor (airline, approved hotel, agency, or a resident relative who assumes legal responsibility). Processed via GDRFA (Dubai) or ICP. Security approval applies; processing time subject to the competent authority. Overstay fines apply, with no grace period.")),
 (('قطر', "تأشيرة هيّا الإلكترونية — منصة hayya.qa الرسمية · فئة A1 سياحة",
   "تأشيرة إلكترونية A1 سياحة عبر منصة هيّا · لا توجد تأشيرة عند الوصول للجوازات الجزائرية العادية · الطلب إلكتروني بالكامل، دون بصمات أو مركز في الجزائر. صالحة 30 يوماً، دخول واحد، قابلة للتمديد مرة. مدة المعالجة حسب الجهة المختصة."),
  ('الإمارات العربية المتحدة', "تأشيرة بكفالة مُسبقة — شركة طيران (Emirates / flydubai / Etihad)، فندق معتمد أو وكالة في الإمارات · بوابتا GDRFA (دبي) / ICP",
   "لا توجد تأشيرة عند الوصول للجوازات الجزائرية العادية: تأشيرة الزيارة تتطلب كفيلاً مُسبقاً في الإمارات (شركة طيران، فندق معتمد، وكالة، أو قريب مقيم يتحمّل المسؤولية القانونية). تُعالَج عبر GDRFA (دبي) أو ICP. تخضع لموافقة أمنية؛ المدة حسب الجهة المختصة. تُطبَّق غرامة تجاوز مدة الإقامة دون فترة سماح.")),
]

matches = list(re.finditer(r"\n( +)canada:\s*\{[^\n]*\}", s))
assert len(matches) == 3, "expected 3 canada entries, got %d" % len(matches)

def esc(x): return x.replace('"', '\\"')

# insert back-to-front so earlier match positions stay valid
for i in (2, 1, 0):
    m = matches[i]
    ind = m.group(1)
    (qn, qp, qnt), (an, ap, ant) = DATA[i]
    add = (m.group(0) + ',\n'
           + ind + 'qatar:            { name: "' + esc(qn) + '", provider: "' + esc(qp) + '", notes: "' + esc(qnt) + '" },\n'
           + ind + 'emirats:          { name: "' + esc(an) + '", provider: "' + esc(ap) + '", notes: "' + esc(ant) + '" }')
    s = s[:m.start()] + add + s[m.end():]

s = s.replace('10 pays', '12 pays').replace('Dix pays', 'Douze pays').replace('Ten countries', 'Twelve countries').replace('عشر دول', 'اثنتا عشرة دولة')
open(IP, 'w', encoding='utf-8', newline='').write(s)
print('done: 3 langs')
