import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";

const Impressum = () => {
  const { lang } = useI18n();

  return (
    <div className="app-shell px-5 pt-12 pb-16 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        {lang === "de" ? "Zurück" : lang === "ru" ? "Назад" : "Back"}
      </Link>

      <h1 className="text-2xl font-extrabold mb-6">Impressum</h1>

      {lang === "de" && <DE />}
      {lang === "en" && <EN />}
      {lang === "ru" && <RU />}
    </div>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-base font-bold mb-2">{title}</h2>
    <div className="text-sm text-foreground/90 leading-relaxed space-y-1">{children}</div>
  </section>
);

const Common = () => (
  <>
    <p>Moma Viktor</p>
    <p>Einzelunternehmen</p>
    <p>Sudetenstraße 17</p>
    <p>93095 Hagelstadt</p>
    <p>Deutschland</p>
  </>
);

const DE = () => (
  <>
    <Block title="Angaben gemäß § 5 TMG">
      <Common />
    </Block>
    <Block title="Kontakt">
      <p>E-Mail: <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a></p>
    </Block>
    <Block title="Umsatzsteuer">
      <p>Gemäß § 19 UStG wird keine Umsatzsteuer erhoben (Kleinunternehmerregelung).</p>
    </Block>
    <Block title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
      <Common />
    </Block>
    <Block title="EU-Streitschlichtung">
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
        <a className="underline" href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </Block>
    <Block title="Haftung für Inhalte">
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
        Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
        Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>
    </Block>
    <Block title="Haftung für Links">
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
        Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
      </p>
    </Block>
    <Block title="Urheberrecht">
      <p>
        Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
        Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
        des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
      </p>
    </Block>
  </>
);

const EN = () => (
  <>
    <Block title="Information pursuant to § 5 TMG">
      <Common />
    </Block>
    <Block title="Contact">
      <p>Email: <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a></p>
    </Block>
    <Block title="VAT">
      <p>No VAT is charged in accordance with § 19 UStG (small business regulation).</p>
    </Block>
    <Block title="Responsible for content under § 18 (2) MStV">
      <Common />
    </Block>
    <Block title="EU dispute resolution">
      <p>
        The European Commission provides a platform for online dispute resolution (ODR):{" "}
        <a className="underline" href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.
      </p>
    </Block>
    <Block title="Liability for content">
      <p>
        As a service provider, we are responsible for our own content on these pages under general laws.
        However, we are not obliged to monitor transmitted or stored third-party information or to investigate
        circumstances that indicate illegal activity.
      </p>
    </Block>
    <Block title="Liability for links">
      <p>
        Our offering contains links to external third-party websites over whose content we have no influence.
        Therefore we cannot accept any liability for these external contents. The respective provider or operator
        of the linked pages is always responsible for their content.
      </p>
    </Block>
    <Block title="Copyright">
      <p>
        The content and works created by the site operator on these pages are subject to German copyright law.
        Duplication, processing, distribution and any form of commercialisation beyond the limits of copyright
        require the written consent of the respective author or creator.
      </p>
    </Block>
  </>
);

const RU = () => (
  <>
    <Block title="Сведения согласно § 5 TMG">
      <Common />
    </Block>
    <Block title="Контакт">
      <p>Email: <a className="underline" href="mailto:viktormoma@gmail.com">viktormoma@gmail.com</a></p>
    </Block>
    <Block title="НДС">
      <p>НДС не взимается в соответствии с § 19 UStG (режим малого предпринимателя).</p>
    </Block>
    <Block title="Ответственный за содержание по § 18 абз. 2 MStV">
      <Common />
    </Block>
    <Block title="Разрешение споров (ЕС)">
      <p>
        Европейская комиссия предоставляет платформу онлайн-урегулирования споров (ODR):{" "}
        <a className="underline" href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Мы не обязаны и не готовы участвовать в процедурах урегулирования споров в потребительском арбитраже.
      </p>
    </Block>
    <Block title="Ответственность за содержание">
      <p>
        Как поставщик услуг, мы несём ответственность за собственное содержание этих страниц согласно общим
        законам. Однако мы не обязаны контролировать переданную или сохранённую стороннюю информацию или
        расследовать обстоятельства, указывающие на противоправную деятельность.
      </p>
    </Block>
    <Block title="Ответственность за ссылки">
      <p>
        Наш сервис содержит ссылки на внешние сайты третьих лиц, на содержание которых мы не влияем.
        Поэтому мы не можем нести ответственность за их содержание. За содержание связанных страниц всегда
        несёт ответственность их провайдер или оператор.
      </p>
    </Block>
    <Block title="Авторские права">
      <p>
        Содержание и материалы, созданные оператором сайта, защищены немецким авторским правом.
        Копирование, обработка, распространение и любая форма коммерческого использования за пределами
        авторского права требуют письменного согласия соответствующего автора.
      </p>
    </Block>
  </>
);

export default Impressum;
