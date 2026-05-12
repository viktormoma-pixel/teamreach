import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";

const LAST_UPDATED = "2026-05-12";

const Privacy = () => {
  const { lang } = useI18n();

  return (
    <div className="app-shell px-5 pt-12 pb-16 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        {lang === "de" ? "Zurück" : lang === "ru" ? "Назад" : "Back"}
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">
        {lang === "de" ? "Datenschutzerklärung" : lang === "ru" ? "Политика конфиденциальности" : "Privacy Policy"}
      </h1>
      <p className="text-xs text-muted-foreground mb-6">
        {lang === "de" ? "Stand" : lang === "ru" ? "Обновлено" : "Last updated"}: {LAST_UPDATED}
      </p>

      {lang === "de" && <DE />}
      {lang === "en" && <EN />}
      {lang === "ru" && <RU />}
    </div>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-base font-bold mb-2">{title}</h2>
    <div className="text-sm text-foreground/90 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Controller = () => (
  <div className="text-sm">
    <p>Moma Viktor (Einzelunternehmen)</p>
    <p>Sudetenstraße 17, 93095 Hagelstadt, Deutschland</p>
    <p>Email: <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a></p>
  </div>
);

const DE = () => (
  <>
    <Block title="1. Verantwortlicher">
      <Controller />
    </Block>

    <Block title="2. Allgemeines zur Datenverarbeitung">
      <p>
        Wir verarbeiten personenbezogene Daten ausschließlich im Einklang mit der DSGVO und dem BDSG.
        Personenbezogene Daten werden nur erhoben, wenn dies für die Bereitstellung der App und ihrer Funktionen
        erforderlich ist oder Sie eingewilligt haben.
      </p>
    </Block>

    <Block title="3. Welche Daten wir verarbeiten">
      <p><strong>Bei der Registrierung (Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>E-Mail-Adresse</li>
        <li>Passwort (nur als Hash gespeichert)</li>
        <li>Bestätigung der E-Mail über einen Verifizierungslink</li>
      </ul>
      <p><strong>Im Profil (freiwillig):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Spitzname / Nutzername</li>
        <li>Sprache der Oberfläche</li>
      </ul>
      <p><strong>Aktivitätsdaten:</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Erstellte und beigetretene Challenges</li>
        <li>Fortschrittseinträge (Wert, Tag, Zeitstempel)</li>
      </ul>
      <p><strong>Lokal im Browser (localStorage):</strong> Onboarding-Status, Sprachwahl, Session-Token.</p>
    </Block>

    <Block title="4. Auftragsverarbeiter und Drittanbieter">
      <p>Wir setzen folgende Dienstleister im Rahmen einer Auftragsverarbeitung (Art. 28 DSGVO) ein:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Supabase</strong> (Supabase Inc., USA) – Datenbank, Authentifizierung, Versand von Bestätigungs-E-Mails.
          Übermittlung in Drittländer erfolgt auf Basis der EU-Standardvertragsklauseln. Hosting-Region kann auf EU
          (Frankfurt) eingestellt werden.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (USA) – Hosting der Web-App. Verbindungsdaten (IP, User-Agent, Zeitstempel)
          werden zur Auslieferung der Seiten kurzfristig verarbeitet.
        </li>
      </ul>
    </Block>

    <Block title="5. Cookies und Tracking">
      <p>
        Wir verwenden ausschließlich technisch notwendige Cookies bzw. localStorage-Einträge zur Sitzungsverwaltung
        und Speicherung der Spracheinstellung. <strong>Es findet derzeit kein Analyse- oder Marketing-Tracking statt.</strong>
      </p>
      <p>
        Sollten künftig Analyse-Werkzeuge (z. B. Plausible, PostHog, Mixpanel, Amplitude oder Google Analytics)
        eingeführt werden, wird diese Erklärung aktualisiert und Ihre Einwilligung über einen Cookie-Banner eingeholt
        (Art. 6 Abs. 1 lit. a DSGVO).
      </p>
    </Block>

    <Block title="6. Speicherdauer">
      <p>
        Wir speichern Ihre Daten so lange, wie Ihr Konto besteht. Nach Löschung des Kontos werden alle
        personenbezogenen Daten unverzüglich entfernt; gesetzliche Aufbewahrungspflichten bleiben unberührt.
      </p>
    </Block>

    <Block title="7. Ihre Rechte">
      <ul className="list-disc pl-5 space-y-1">
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung – „Recht auf Vergessenwerden" (Art. 17 DSGVO) – direkt in der App unter Einstellungen verfügbar</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p>
        Zuständige Aufsichtsbehörde: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.
      </p>
    </Block>

    <Block title="8. Datensicherheit">
      <p>
        Die Übertragung erfolgt verschlüsselt über TLS. Passwörter werden ausschließlich als Hash gespeichert.
        Der Zugriff auf personenbezogene Daten ist auf das technisch notwendige Maß beschränkt.
      </p>
    </Block>

    <Block title="9. Kontakt in Datenschutzfragen">
      <p>
        Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte wenden Sie sich an:{" "}
        <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a>
      </p>
    </Block>
  </>
);

const EN = () => (
  <>
    <Block title="1. Controller">
      <Controller />
    </Block>

    <Block title="2. General information">
      <p>
        We process personal data exclusively in accordance with the GDPR and the German Federal Data Protection Act (BDSG).
        Personal data is collected only where it is necessary to provide the app and its features, or where you have given consent.
      </p>
    </Block>

    <Block title="3. What data we process">
      <p><strong>On registration (Art. 6 (1)(b) GDPR – contract performance):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Email address</li>
        <li>Password (stored only as a hash)</li>
        <li>Email confirmation via a verification link</li>
      </ul>
      <p><strong>In your profile (voluntary):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nickname / username</li>
        <li>Interface language</li>
      </ul>
      <p><strong>Activity data:</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Challenges you create or join</li>
        <li>Progress entries (value, day, timestamp)</li>
      </ul>
      <p><strong>Locally in your browser (localStorage):</strong> onboarding flag, language preference, session token.</p>
    </Block>

    <Block title="4. Processors and third parties">
      <p>We use the following service providers under data processing agreements (Art. 28 GDPR):</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Supabase</strong> (Supabase Inc., USA) – database, authentication, delivery of confirmation emails.
          Transfers to third countries are based on the EU Standard Contractual Clauses. Hosting region can be set to EU (Frankfurt).
        </li>
        <li>
          <strong>Vercel Inc.</strong> (USA) – web app hosting. Connection data (IP, user agent, timestamp) is processed briefly to deliver pages.
        </li>
      </ul>
    </Block>

    <Block title="5. Cookies and tracking">
      <p>
        We use strictly necessary cookies / localStorage entries for session handling and storing your language choice.
        <strong> No analytics or marketing tracking is currently in place.</strong>
      </p>
      <p>
        Should analytics tools (e.g. Plausible, PostHog, Mixpanel, Amplitude or Google Analytics) be introduced later,
        this notice will be updated and your consent obtained via a cookie banner (Art. 6 (1)(a) GDPR).
      </p>
    </Block>

    <Block title="6. Retention">
      <p>
        We keep your data for as long as your account exists. After account deletion, all personal data is removed
        immediately; statutory retention obligations remain unaffected.
      </p>
    </Block>

    <Block title="7. Your rights">
      <ul className="list-disc pl-5 space-y-1">
        <li>Access (Art. 15 GDPR)</li>
        <li>Rectification (Art. 16 GDPR)</li>
        <li>Erasure – "right to be forgotten" (Art. 17 GDPR) – available directly in Settings</li>
        <li>Restriction of processing (Art. 18 GDPR)</li>
        <li>Data portability (Art. 20 GDPR)</li>
        <li>Objection (Art. 21 GDPR)</li>
        <li>Withdrawal of consent with future effect (Art. 7 (3) GDPR)</li>
        <li>Complaint to a supervisory authority (Art. 77 GDPR)</li>
      </ul>
      <p>
        Competent supervisory authority: Bavarian State Office for Data Protection Supervision (BayLDA), Promenade 18, 91522 Ansbach, Germany.
      </p>
    </Block>

    <Block title="8. Data security">
      <p>
        Data is transmitted via TLS encryption. Passwords are stored only as hashes. Access to personal data is
        limited to what is technically necessary.
      </p>
    </Block>

    <Block title="9. Privacy contact">
      <p>
        For privacy questions or to exercise your rights, contact:{" "}
        <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a>
      </p>
    </Block>
  </>
);

const RU = () => (
  <>
    <Block title="1. Контролёр данных">
      <Controller />
    </Block>

    <Block title="2. Общие сведения">
      <p>
        Мы обрабатываем персональные данные исключительно в соответствии с GDPR и немецким законом BDSG.
        Данные собираются только в объёме, необходимом для работы приложения, либо на основании вашего согласия.
      </p>
    </Block>

    <Block title="3. Какие данные мы обрабатываем">
      <p><strong>При регистрации (ст. 6 (1)(b) GDPR — исполнение договора):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Email-адрес</li>
        <li>Пароль (хранится только в виде хэша)</li>
        <li>Подтверждение email через ссылку</li>
      </ul>
      <p><strong>В профиле (по желанию):</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Никнейм</li>
        <li>Язык интерфейса</li>
      </ul>
      <p><strong>Данные активности:</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Созданные и добавленные челленджи</li>
        <li>Записи прогресса (значение, день, метка времени)</li>
      </ul>
      <p><strong>Локально в браузере (localStorage):</strong> флаг онбординга, выбор языка, токен сессии.</p>
    </Block>

    <Block title="4. Обработчики данных и сторонние сервисы">
      <p>Мы используем следующих провайдеров на основании договоров об обработке (ст. 28 GDPR):</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Supabase</strong> (Supabase Inc., США) — база данных, аутентификация, отправка писем подтверждения.
          Передача в третьи страны осуществляется на основании стандартных договорных положений ЕС. Регион хостинга
          можно установить на EU (Франкфурт).
        </li>
        <li>
          <strong>Vercel Inc.</strong> (США) — хостинг веб-приложения. Технические данные подключения (IP, user-agent,
          метка времени) обрабатываются кратковременно для доставки страниц.
        </li>
      </ul>
    </Block>

    <Block title="5. Cookies и трекинг">
      <p>
        Мы используем только технически необходимые cookies / записи в localStorage для управления сессией и сохранения
        выбора языка. <strong>Аналитический и маркетинговый трекинг в настоящее время не используется.</strong>
      </p>
      <p>
        В случае подключения сервисов аналитики (например, Plausible, PostHog, Mixpanel, Amplitude или Google Analytics)
        эта политика будет обновлена, а согласие будет запрошено через cookie-баннер (ст. 6 (1)(a) GDPR).
      </p>
    </Block>

    <Block title="6. Срок хранения">
      <p>
        Мы храним ваши данные до тех пор, пока существует ваш аккаунт. После удаления аккаунта все персональные
        данные удаляются незамедлительно; законные обязанности по хранению сохраняются.
      </p>
    </Block>

    <Block title="7. Ваши права">
      <ul className="list-disc pl-5 space-y-1">
        <li>Доступ (ст. 15 GDPR)</li>
        <li>Исправление (ст. 16 GDPR)</li>
        <li>Удаление — «право быть забытым» (ст. 17 GDPR) — доступно прямо в настройках</li>
        <li>Ограничение обработки (ст. 18 GDPR)</li>
        <li>Перенос данных (ст. 20 GDPR)</li>
        <li>Возражение (ст. 21 GDPR)</li>
        <li>Отзыв согласия с эффектом на будущее (ст. 7 (3) GDPR)</li>
        <li>Жалоба в надзорный орган (ст. 77 GDPR)</li>
      </ul>
      <p>
        Компетентный надзорный орган: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach, Германия.
      </p>
    </Block>

    <Block title="8. Безопасность данных">
      <p>
        Передача данных осуществляется по TLS. Пароли хранятся только в виде хэша. Доступ к персональным данным
        ограничен технически необходимым минимумом.
      </p>
    </Block>

    <Block title="9. Контакт по вопросам конфиденциальности">
      <p>
        По вопросам обработки данных и реализации ваших прав:{" "}
        <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a>
      </p>
    </Block>
  </>
);

export default Privacy;
