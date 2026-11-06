/**
 * "Please read this before contacting Madalitso", in English and Chichewa.
 *
 * AUTHORITY. Tim Hunt's email of 5 November 2026 to Tom Arrington,
 * "Madalitso's Landing Page": "Madalitso is getting inquiries from lots of
 * timewasters. We have created a pop-up in English and Chichewa. I thought
 * we could have this pop in more than on place on the website, so they don't
 * miss it." The text is his document POPUP.docx, in 16_WEBSITE_AI/07 Landing
 * Pages/Madalitso Landing Page/To Tom, written with Madalitso (Tim's email to
 * him of 2 November 2026 gave him "a free hand to edit both the English and
 * the Chichewa").
 *
 * HOW IT IS SHOWN. Tom Arrington chose, on 6 November 2026, a button beside
 * each contact point rather than a pop-up that opens by itself, which Google
 * ranks lower on phones. The page offers it above the first WhatsApp button,
 * in the closing section and above the form; each button opens the notice
 * full screen on a phone. See client/src/components/ReadFirstNotice.tsx.
 *
 * THE WORDS are Tim's, unchanged, apart from two things a web page needs:
 * the Chichewa heading is in sentence case rather than capitals, and the
 * Chichewa paragraph that matches English point 9 is numbered 9 too.
 *
 * THE FIGURES. Every kwacha amount is the pound amount at Tim's stated rate,
 * £1 ≈ MK2,325, rounded to one decimal place in millions, and
 * server/campaign/madalitsoReadFirst.test.ts holds them to it.
 */
import type { ReadFirstNotice } from "./advisorLandingPage";

export const MADALITSO_READ_FIRST: ReadFirstNotice = Object.freeze({
  versions: [
    {
      language: "English",
      lang: "en-GB",
      heading: "Please read this before contacting Madalitso",
      intro:
        "World Student Advisors is an honest and trustworthy organisation. We want you to understand what we can offer and what studying abroad costs, so that you do not waste your time or ours.",
      points: [
        {
          body: "We do not provide full scholarships or fund students’ education. Full scholarships are rare and highly competitive. If you need a full scholarship to study abroad, WSA cannot offer you that route.",
        },
        {
          body: "An undergraduate degree abroad is a major financial commitment. A UK undergraduate degree usually takes three or four years. Using an illustrative annual budget of £15,000 for tuition fees and £11,000 for living expenses, you would need £26,000 per year, approximately MK60.5 million. That is for one year, not the whole degree. Some courses and locations cost considerably more.",
        },
        {
          body: "A more affordable route is to complete your undergraduate degree in Malawi, then plan for a UK Master’s degree. Most full-time taught Master’s courses take 12 months. Using the same illustrative figures, the budget for that year would be £26,000, approximately MK60.5 million, plus travel, visa fees and other associated costs. This means funding one year abroad rather than three or four.",
        },
        {
          body: "Under current rules, eligible students who successfully complete their UK degree can apply for a Graduate visa to remain in the UK to work or look for work. For applications made from 1 January 2027, this lasts 18 months. It does not guarantee employment, and the rules may change before you graduate.",
        },
        {
          body: "We also work with universities in Hungary and Cyprus offering courses outside medicine. Depending on the university, course and location, estimated annual costs are:",
          costs: [
            "Tuition fees: £3,500 to £8,000, approximately MK8.1 million to MK18.6 million.",
            "Living expenses: £4,000 to £5,000, approximately MK9.3 million to MK11.6 million.",
            "Total annual budget: £7,500 to £13,000, approximately MK17.4 million to MK30.2 million.",
          ],
        },
        {
          body: "We do not offer overseas jobs or arrange travel abroad for employment. Our service is for people who want to study.",
        },
        {
          body: "Do not plan to fund your studies through work you hope to find after arriving. Any permitted student employment should be treated as supplementary income. You need funding in place for tuition fees and living expenses before proceeding.",
        },
        {
          body: "Please contact Madalitso only if you have sufficient funds to study abroad, or a confirmed family sponsor who can provide evidence of their ability to support you throughout your studies.",
        },
        {
          body: "If you have no funding and are looking solely for a full scholarship or an overseas job, please do not submit an enquiry. We cannot assist with either request.",
        },
      ],
      closing:
        "We appreciate that this may be disappointing, but we would rather give you an honest answer than raise hopes we cannot fulfil.",
      note: "All costs are indicative. Malawi kwacha equivalents use £1 ≈ MK2,325 and will vary with the exchange rate. Travel, visa fees and other associated costs must also be budgeted for. (2 November 2026)",
    },
    {
      language: "Chichewa",
      lang: "ny",
      heading: "Chonde werengani izi musanalakhulane ndi Madalitso",
      intro:
        "World Student Advisors ndi bungwe loona mtima, lokhulupilika, komanso lodalirika. Tikufuna kuti mumvetse bwino zimene tingakuthandizeni komanso ndalama zofunika pamaphunziro akunja, kuti musataye nthawi yanu kapena yathu.",
      points: [
        {
          body: "Sitipereka maphunziro aulere olipiriridwa zonse (Kapena sikolashipi), ndipo sitilipirira maphunziro a ophunzira. Mwayi wolipiriridwa zonse ndi wochepa kwambiri ndipo anthu ambiri amapikisana kuti apeze mwayi umenewu. Mungathe kuphunzira kunja pokhapokha mutapeza munthu kapena bungwe lokulipirirani zonse, WSA siingakupatseni mwayi umenewu.",
        },
        {
          body: "Kuchita digiri yoyamba (Undergraduate Degree) kunja kumafuna ndalama zambiri. Ku UK, digiri yoyamba nthawi zambiri imatenga zaka zitatu kapena zinayi. Mwachitsanzo, ngati ndalama za maphunziro ndi £15,000 pachaka ndipo zogulira zofunika pa moyo ndi £11,000 pachaka, mungafunike £26,000 pachaka, pafupifupi MK60.5 miliyoni. Izi ndi ndalama za chaka chimodzi chokha, osati za digiri yonse. Maphunziro ena komanso kukhala m'madera ena kungawononge ndalama zambiri kuposa izi.",
        },
        {
          body: "Njira yotsika mtengo ingakhale kuchita digiri yoyamba ku Malawi, kenako kukonzekera digiri ya Master’s ku UK. Maphunziro ambiri a Master’s amene mumaphunzira nthawi zonse amatenga miyezi 12. Pogwiritsa ntchito chitsanzo cha ndalama chomwechi, mungafunike £26,000, pafupifupi MK60.5 miliyoni, pa chaka chimenecho. Ndalama za ulendo, visa ndi zina zowonjezera sizikuphatikizidwa pamenepa. Izi zikutanthauza kukonzekera ndalama za chaka chimodzi kunja m'malo mwa zaka zitatu kapena zinayi.",
        },
        {
          body: "Malingana ndi malamulo omwe alipo panopa, ophunzira oyenerera amene wamaliza bwino digiri yake ku UK, angalembetse visa yotchedwa Graduate visa kuti akhalebe ku UK n’kumagwira ntchito kapena kufunafuna ntchito. Kwa amene adzalembetse kuyambira pa 1 Januwale 2027, visa imeneyi idzakhala ya miyezi 18. Visa imeneyi sikutanthauza kuti mudzapezadi ntchito, ndiposo malamulo anganthe kusitha inu musanamalize maphunziro anu.",
        },
        {
          body: "Timagwiranso ntchito ndi mayunivesite aku Hungary ndi Cyprus amene amapereka maphunziro osakhala a zachipatala. Kutengera yunivesite, maphunziro ndi malo, ndalama zoyerekeza pachaka ndi izi:",
          costs: [
            "Ndalama za maphunziro: £3,500 mpaka £8,000, pafupifupi MK8.1 miliyoni mpaka MK18.6 miliyoni.",
            "Ndalama zokhalira ndi zogulira zofunika pa moyo: £4,000 mpaka £5,000, pafupifupi MK9.3 miliyoni mpaka MK11.6 miliyoni.",
            "Ndalama zonse pachaka: £7,500 mpaka £13,000, pafupifupi MK17.4 miliyoni mpaka MK30.2 miliyoni.",
          ],
        },
        {
          body: "Sitipereka ntchito zakunja ndipo sitikonza maulendo opita kunja kukagwira ntchito. Ntchito yathu ndi kuthandiza anthu amene akufuna kukaphunzira.",
        },
        {
          body: "Musakonzekere kulipirira maphunziro anu ndi ndalama za ntchito imene mukuyembekeza kukapeza mukafika kunja. Ndalama za ntchito iliyonse imene mungaloledwe kugwira ngati wophunzira ziyenera kungokhala zowonjezera. Muyenera kukhala ndi ndalama za maphunziro ndi zokhalira musanapitirize ndi dongosolo lanu.",
        },
        {
          body: "Chonde lankhulani ndi Madalitso pokhapokha ngati muli ndi ndalama zokwanira zophunzirira kunja, kapena muli ndi wachibale amene wavomera kukulipirirani ndipo angapereke umboni woti angathe kukuthandizani pa nthawi yonse ya maphunziro anu.",
        },
        {
          body: "Ngati mulibe ndalama ndipo mukungofuna mwayi wolipiriridwa maphunziro ndi zonse zofunika, kapena ntchito yakunja, chonde musatumize pempho lofuna malo a sukulu. Sitingakuthandizeni pa zinthu ziwirizi.",
        },
      ],
      closing:
        "Tikumvetsa kuti izi zingakukhumudwitseni, koma ndi bwino kukuuzani zoona kusiyana ndi kukupatsani chiyembekezo chimene sitingakwaniritse.",
      note: "Ndalama zonsezi ndi zoyerekeza. Powerengera Malawi kwacha tagwiritsa ntchito £1 ≈ MK2,325 ndipo izi zitha kusintha malinga ndi mtengo wosinthira ndalama. Muyeneranso kukonzekera ndalama za ulendo, visa ndi zina zowonjezera.",
      signOff: "ZIKOMO",
    },
  ],
} satisfies ReadFirstNotice);
