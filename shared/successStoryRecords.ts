/**
 * Tim Hunt's twelve Student Success Stories, sent to Tom Arrington on
 * 11 November 2026 with his page design (16_WEBSITE_AI/14_Student Success
 * Stories), in ten countries.
 *
 * RELEASE. Tom Arrington, 12 November 2026: "They have approved", for all
 * twelve, then "live". That is the recorded consent and the human release
 * for each record below. Where a story is about a child (Sylvester Kututa's
 * and Joe Agi's sons, Arop Deng's youngest son), the parent who tells the
 * story is the one who approved it.
 *
 * THE WORDS are Tim's, laid out as in his Word files, with these changes
 * (all told to Tim in Tom's reply of 12 November 2026):
 * - Dr Cosme: "took care of my visa application" is "supported my visa
 *   preparation" (and the Portuguese), the site's approved wording, so no
 *   story reads as WSA giving regulated immigration advice.
 * - Chipo Mwansa: "understanding the visa options available after my
 *   studies" is "thinking about my options after my studies", same reason.
 * - Richard Musembi: Tim's caption "Tim, Andrew (me), Hank and Greta
 *   overview of Clevedon Pier (1969)" is "Tim, Richard (me), Hank and Greta
 *   overlooking Clevedon Pier": the story is signed Richard, and the pier
 *   opened in 1869.
 * - Typos: "receiveing", "Toque Pessoa", "a MSc", "to turn to make",
 *   "World Student Advisors early clients", a missing comma after "Advisors".
 *
 * THE PHOTOGRAPHS are Tim's, at most 1200 pixels, with all hidden data
 * (EXIF, GPS) removed. The Kenilworth photograph with Arop has the house
 * number and name beside the door blurred, because with its caption it gave
 * away a home address. The Clevedon Pier picture is AI-made (Tom Arrington,
 * 12 November 2026: "It's an Ai version of dad"), so the page labels it an
 * illustration. Tim has been asked which of the others are AI-made; those
 * get the same label.
 */
import type { StoryBlock, StoryImage, SuccessStory, SuccessStoryCountrySlug, StoryVersion } from "./successStories";

const IMG = "/success-stories";
const p = (text: string): StoryBlock => ({ kind: "paragraph", text });
const sig = (...lines: string[]): StoryBlock => ({ kind: "signature", lines });
const img = (src: string, alt: string, width: number, height: number, caption?: string): StoryBlock => {
  const image: StoryImage = { src: `${IMG}/${src}.jpg`, alt, width, height, illustration: false, ...(caption ? { caption } : {}) };
  return { kind: "image", image };
};
/** An AI-made or staged picture: the page labels it "Illustration". */
const illustration = (src: string, alt: string, width: number, height: number, caption?: string): StoryBlock => {
  const block = img(src, alt, width, height, caption);
  return block.kind === "image" ? { kind: "image", image: { ...block.image, illustration: true } } : block;
};
const en = (v: Omit<StoryVersion, "language" | "lang">): StoryVersion => ({ language: "English", lang: "en-GB", ...v });
const pt = (v: Omit<StoryVersion, "language" | "lang">): StoryVersion => ({ language: "Português", lang: "pt", ...v });

interface Content {
  id: string;
  name: string;
  countrySlug: SuccessStoryCountrySlug;
  versions: StoryVersion[];
  studentWasChild?: boolean;
  includesSensitiveData?: boolean;
}

/** Tom Arrington, 12 November 2026: "They have approved", then "live". */
const APPROVED = "2026-11-12";
const EVIDENCE =
  "Tim Hunt's story and photographs of 11 November 2026 (16_WEBSITE_AI/14_Student Success Stories); approval confirmed by Tom Arrington, 12 November 2026";

function released(c: Content): SuccessStory {
  return {
    id: c.id,
    identity: { kind: "named", displayName: c.name },
    countrySlug: c.countrySlug,
    versions: c.versions,
    evidence: { reference: EVIDENCE, evidenceDate: APPROVED, reviewOwner: "Tim Hunt" },
    consent: {
      recorded: true,
      scope: ["website"],
      // Approved without an end date; a withdrawal takes it down everywhere.
      duration: { from: APPROVED, until: null },
      finalWordingApproved: true,
      finalVisualApproved: true,
      studentWasChild: c.studentWasChild ?? false,
      parentOrGuardianConsent: c.studentWasChild ?? false,
    },
    publication: { status: "published", publishedLocations: ["website"] },
    outcomeClaimsVerified: true,
    includesSensitiveData: c.includesSensitiveData ?? false,
    sensitiveDataAuthority: c.includesSensitiveData ? `Approved for the website with these words, ${APPROVED}` : "",
    claimsRegulatedImmigrationAdvice: false,
    regulatedAdviceAuthority: "",
    humanApprovalToPublish: true,
  };
}

export const STORY_CONTENT: Content[] = [
  {
    id: "angola-edivalda-diogo",
    name: "Edivalda Correia Felix Diogo",
    countrySlug: "angola",
    versions: [
      en({
        title: "From Angola to a Master’s at Salford",
        byline: ["Edivalda Correia Felix Diogo", "MSc in Safety, Health and Environment", "University of Salford, United Kingdom", "Graduated 2025"],
        blocks: [
          img("angola/edivalda-graduation", "Edivalda in her graduation gown with her young son outside the University of Salford", 1200, 1200),
          p("My journey from Angola to the United Kingdom began with my father, who discovered the University of Salford while researching study opportunities. I am deeply grateful for his initiative and support. Without him, I might never have considered this possibility."),
          p("Moving to the UK was a major step for me, both personally and professionally. I already had qualifications and work experience from Angola, but I was unsure how a British university would recognise them. World Student Advisors helped me understand how my previous learning could support my application."),
          p("Timothy Hunt, Managing Director of World Student Advisors, guided me through the Accreditation of Prior Learning (APL) process and explained what I needed to do. Pedro Bezerra supported me throughout the journey. His understanding of the Angolan and British education systems, and his ability to explain things in Portuguese and English, made the process much easier to follow."),
          p("Studying at Salford gave me the chance to learn in a new environment, meet people from different backgrounds and develop my knowledge. Completing my MSc in Safety, Health and Environment was an important achievement and strengthened my confidence in my professional career."),
          p("What I particularly appreciated was that WSA’s support continued beyond my university offer. Tim visited me in Manchester, and Pedro came to Manchester for my graduation. Those personal gestures meant a great deal to me."),
          p("My experience also encouraged other Angolans to explore studying in the UK. When people asked how I had done it, I was pleased to put them in touch with Pedro. He showed them the same interest and patience that he had shown me."),
          p("My advice to other Angolan students is to research your options, ask questions and seek guidance. The process can feel confusing, but the right information and support can help you move forward. I completed this journey as the mother of a toddler. If I could do it, you can too. Keep going and believe in what you can achieve."),
        ],
      }),
      pt({
        title: "De Angola a um mestrado em Salford",
        byline: ["Edivalda Correia Felix Diogo", "MSc in Safety, Health and Environment", "Universidade de Salford, Reino Unido", "Concluído em 2025"],
        blocks: [
          img("angola/edivalda-graduation", "Edivalda com a beca de graduação e o filho pequeno junto à Universidade de Salford", 1200, 1200),
          p("A minha jornada de Angola para o Reino Unido começou com o meu pai, que descobriu a Universidade de Salford enquanto pesquisava oportunidades de estudo. Estou profundamente grata pela sua iniciativa e pelo seu apoio. Sem ele, talvez nunca tivesse considerado esta possibilidade."),
          p("Mudar-me para o Reino Unido foi um passo importante, tanto a nível pessoal como profissional. Já tinha qualificações e experiência profissional adquiridas em Angola, mas não sabia como seriam reconhecidas por uma universidade britânica. A World Student Advisors ajudou-me a compreender de que forma a minha formação anterior poderia apoiar a minha candidatura."),
          p("Timothy Hunt, Director-Geral da World Student Advisors, orientou-me no processo de reconhecimento de aprendizagens anteriores, designado Accreditation of Prior Learning (APL), e explicou-me o que precisava de fazer. Pedro Bezerra acompanhou-me ao longo de todo o percurso. O seu conhecimento dos sistemas de ensino angolano e britânico, bem como a sua capacidade de explicar os procedimentos em português e em inglês, tornaram o processo muito mais fácil de compreender."),
          p("Estudar em Salford deu-me a oportunidade de aprender num novo ambiente, conhecer pessoas de diferentes origens e aprofundar os meus conhecimentos. Concluir o meu mestrado em Segurança, Saúde e Ambiente foi uma conquista importante e reforçou a minha confiança no meu percurso profissional."),
          p("O que mais apreciei foi o facto de o apoio da WSA ter continuado depois de receber a minha oferta de admissão. O Tim visitou-me em Manchester e o Pedro deslocou-se a Manchester para assistir à minha cerimónia de graduação. Estes gestos de atenção significaram muito para mim."),
          p("A minha experiência também incentivou outros angolanos a explorar a possibilidade de estudar no Reino Unido. Quando me perguntavam como tinha conseguido, tinha todo o gosto em pô-los em contacto com o Pedro. Ele demonstrou o mesmo interesse e a mesma paciência que tinha tido comigo."),
          p("O meu conselho para outros estudantes angolanos é que pesquisem as opções disponíveis, façam perguntas e procurem orientação. O processo pode parecer confuso, mas a informação e o apoio certos podem ajudar-vos a avançar. Concluí este percurso sendo mãe de uma criança pequena. Se eu consegui, vocês também podem conseguir. Continuem a lutar e a acreditar naquilo que são capazes de alcançar."),
        ],
      }),
    ],
  },
  {
    id: "angola-antonio-cosme",
    name: "Dr António Gaspar Cosme",
    countrySlug: "angola",
    includesSensitiveData: true,
    versions: [
      en({
        title: "First Class Support with a Personal Touch",
        byline: [],
        blocks: [
          img("angola/antonio-cosme", "Dr António Gaspar Cosme", 347, 313),
          p("World Student Advisors helped me choose and enrol on a six-month English language course at New College Group’s Manchester campus. The whole experience was amazing. From the beginning, their service was friendly, personal and first class."),
          p("Pedro Bezerra, WSA’s Director for Angola, was a huge asset. He is British Angolan, completed both his undergraduate degree and Master’s in the UK, and speaks fluent English and Portuguese. Being able to discuss everything in Portuguese with someone who understood life and education in the UK made a real difference."),
          p("Pedro has known Tim Hunt, WSA’s Managing Director, for many years, and they worked together brilliantly to support me. WSA recommended NCG and handled my course application, while Eldah Therone, one of WSA’s British Council trained Student Counsellors, supported my visa preparation."),
          p("I also needed some Portuguese documents translated. WSA arranged this through a translation service in the UK and charged me exactly what they paid, with nothing added. To my surprise, there was no fee at all for WSA’s own services."),
          p("Tim even travelled to Manchester to meet me personally. I was impressed that the Managing Director would make that effort. He is a very pleasant, modest man who clearly cares about the people WSA supports."),
          p("What stood out was how much the whole team cared. I felt supported throughout, and I would happily recommend World Student Advisors to anyone considering studying abroad."),
          sig("Dr António Gaspar Cosme", "Angola"),
        ],
      }),
      pt({
        title: "Apoio de Excelência com um Toque Pessoal",
        byline: [],
        blocks: [
          img("angola/antonio-cosme", "Dr António Gaspar Cosme", 347, 313),
          p("A World Student Advisors ajudou-me a escolher e a inscrever-me num curso de inglês de seis meses no campus de Manchester do New College Group. Toda a experiência foi extraordinária. Desde o início, o atendimento foi simpático, personalizado e de excelência."),
          p("Pedro Bezerra, Director da WSA para Angola, foi uma enorme mais-valia. É britânico e angolano, concluiu a licenciatura e o mestrado no Reino Unido e fala fluentemente inglês e português. Poder conversar sobre todos os assuntos em português com alguém que conhecia bem a vida e o ensino no Reino Unido fez uma grande diferença."),
          p("O Pedro conhece Tim Hunt, Director-Geral da WSA, há muitos anos, e ambos trabalharam de forma excelente para me apoiar. A WSA recomendou o NCG e tratou da minha candidatura ao curso, enquanto Eldah Therone, uma das suas orientadoras de estudantes com formação do British Council, me apoiou na preparação do pedido de visto."),
          p("Também precisei de traduzir alguns documentos em português. A WSA organizou a tradução através de um serviço no Reino Unido e cobrou-me exactamente o valor que pagou, sem qualquer acréscimo. Para minha surpresa, os serviços da própria WSA foram inteiramente gratuitos."),
          p("O Tim chegou mesmo a deslocar-se a Manchester para me conhecer pessoalmente. Fiquei impressionado com o facto de o Director-Geral fazer questão de realizar essa visita. É uma pessoa muito simpática e modesta, que demonstra uma preocupação sincera com as pessoas que a WSA apoia."),
          p("O que mais me marcou foi a atenção e a dedicação de toda a equipa. Senti-me apoiado ao longo de todo o processo e recomendo, com todo o gosto, a World Student Advisors a quem esteja a pensar estudar no estrangeiro."),
          sig("Dr António Gaspar Cosme", "Angola"),
        ],
      }),
    ],
  },
  {
    id: "ghana-gladys-aberystwyth",
    name: "Gladys Banhu Naadi",
    countrySlug: "ghana",
    versions: [
      en({
        title: "From Ghana to Wales: Gladys Meets Her Students at Aberystwyth",
        byline: [],
        blocks: [
          p("Meeting the Ghanaian students was a highlight of Gladys Banhu Naadi’s first visit to the UK. Together with Tim Hunt, WSA’s Managing Director, she met ten students she had helped place at Aberystwyth University. It was a wonderful meeting. The students were happy with their experience, particularly the free student accommodation included in their offers. For Gladys, seeing them settled and enjoying university life made the journey especially worthwhile."),
          img("ghana/students-aberystwyth", "Ghanaian students at Aberystwyth University", 1200, 600),
          p("In May 2026, Aberystwyth University hosted an agents’ conference attended by agents from around the world. World Student Advisors was represented by Tim Hunt, Managing Director, and Gladys Banhu Naadi, Director for Ghana."),
          p("Gladys flew with Turkish Airlines from Accra via Istanbul to Birmingham Airport, before travelling by train to Aberystwyth, where Jack Latchford-Coates welcomed her on arrival. Tim drove from his hometown of Clevedon in North Somerset."),
          p("Aberystwyth’s hospitality was second to none. Gladys and Tim enjoyed two excellent days exploring the university’s fantastic facilities and learning more about what it offers international students."),
          p("On the final evening, the university hosted a farewell dinner. Gladys had quietly brought a surprise gift for Jack: a traditional Ghanaian smock, known as a fugu, with a matching cap. She presented it to him during the evening, and he wore it with pride, bringing a touch of Ghana to the celebrations in Wales."),
          img(
            "ghana/gladys-jack-tim",
            "Gladys Banhu Naadi, Jack Latchford-Coates in a Ghanaian smock and cap, and Tim Hunt",
            1200,
            865,
            "Pictured from left to right: Gladys Banhu Naadi, WSA’s Director for Ghana; Jack Latchford-Coates, Aberystwyth University’s Regional Manager for International Recruitment and Development; and Tim Hunt, WSA’s Managing Director.",
          ),
          p("Tim then drove Gladys back to Clevedon, where she stayed at the Walton Park Hotel. The following day, they visited the University of the West of England in Bristol. There was also time for Tim to show Gladys around his home region, the West Country, before driving her to Birmingham Airport for her flight home."),
          p("Gladys returned to Ghana sporting a big smile, with first-hand experience of the universities and places she recommends to her students."),
        ],
      }),
    ],
  },
  {
    id: "kenya-sylvester-kututa",
    name: "Sylvester Kututa",
    countrySlug: "kenya",
    studentWasChild: true,
    versions: [
      en({
        title: "From a Son’s Education to a Lasting Friendship",
        byline: ["Sylvester Kututa, Parent, Kenya", "Brooke House College, United Kingdom", "Foundation Studies and Football, September 2022"],
        blocks: [
          img("kenya/sylvester-kututa", "Sylvester Kututa", 1200, 1200),
          p("Sending my son from Kenya to the United Kingdom was a big step for our family. We wanted him to receive a good education, develop his passion for football and feel supported while living far from home."),
          p("World Student Advisors helped us arrange his place at Brooke House College, combining foundation studies with football. What stood out was the personal care shown by Tim Hunt, WSA’s Managing Director. Tim collected my son from Birmingham Airport and took him to the college himself. As a parent thousands of miles away, knowing someone was there to welcome him and ensure he arrived safely meant a great deal."),
          p("That personal connection grew into a lasting friendship. When I visited Britain, I stayed with Tim in Kenilworth. We enjoyed a memorable 12-mile countryside walk with his dog Angus, stopping for lunch with his friend Les. Tim later visited me in Mombasa, and our friendship has continued across the continents."),
          p("I would happily recommend World Student Advisors to other Kenyan families seeking experienced, trustworthy and personal support with education in the UK. What began with my son’s education became a friendship for life."),
        ],
      }),
    ],
  },
  {
    id: "kenya-richard-musembi",
    name: "Richard Musembi",
    countrySlug: "kenya",
    versions: [
      en({
        title: "Nairobi, Kenya to Bristol, England, UK",
        byline: [],
        blocks: [
          illustration("kenya/richard-clevedon-pier", "Illustration of Tim Hunt with Richard and two friends beside Clevedon Pier", 1200, 800, "Tim, Richard (me), Hank and Greta overlooking Clevedon Pier"),
          p("World Student Advisors helped me choose the right course and supported me throughout my BEng Aeronautical Engineering degree at UWE Bristol, where I graduated in 2024."),
          p("The personal welcome made a lasting impression. Tim Hunt met me at Bristol Airport and took me to my student accommodation. You don’t get much better service than that! Throughout my studies, Tim and the WSA team remained approachable and helpful whenever I needed advice."),
          p("Bristol was a wonderful place to study, particularly given its strong aerospace heritage. WSA’s head office in Clevedon was also nearby, around half an hour away by car or roughly an hour from Bristol by bus."),
          p("One particularly enjoyable visit to Clevedon was with two friends I had met at UWE: an exchange student, Hank, from New York and a fellow student from Finland called Greta. Studying at a UK university really does give you the chance to meet people from all over the world."),
          p("Tim met us and showed us Clevedon Pier, which opened in 1869. He also told us about his late father’s name being commemorated on the pier, giving our visit a personal connection to the town."),
          p("What stood out about WSA was the support beyond the application itself. Their Student Support Library podcasts cover a wide range of topics, from preparing to study abroad to making the most of life at a UK university. Alongside personal advice and student visa mock interview preparation, these resources help students feel better informed, prepared and confident."),
          p("For me, WSA’s service meant having someone to turn to, from choosing my course and arriving in Britain to settling into university life and exploring the local area."),
          p("I highly recommend World Student Advisors to anyone considering studying abroad."),
          sig("Richard Musembi, Kenya", "BEng Aeronautical Engineering, UWE Bristol", "Attendance: 2021 to 2024"),
        ],
      }),
    ],
  },
  {
    id: "malawi-madalitso-dube",
    name: "Madalitso Dube",
    countrySlug: "malawi",
    versions: [
      en({
        title: "From Student to WSA Director for Malawi",
        byline: [],
        blocks: [
          img("malawi/madalitso-dube", "Madalitso Dube, WSA Director for Malawi", 1024, 1024),
          p("I was among World Student Advisors’ early clients from Malawi. I was pleasantly surprised when Tim Hunt, the Managing Director, greeted me with ‘Muli bwanji, Madalitso!’"),
          p("I discovered that Tim had visited Malawi several times and that two of his former students had become Government Printers of Malawi. His connections with our country made the relationship feel personal from the beginning."),
          p("I was so impressed with the support I received that I am now WSA’s Director for Malawi, helping others from my own country pursue their education abroad. I am happy to recommend WSA because I know the care and personal attention students can expect. They understand Africa and take a real interest in the people they support. Having experienced that service myself, I am proud to help other Malawians benefit from it."),
          sig("Madalitso Dube", "WSA Director for Malawi", "Master’s study in Education, Bath Spa University"),
        ],
      }),
    ],
  },
  {
    id: "nigeria-joe-agi",
    name: "Joe Agi",
    countrySlug: "nigeria",
    studentWasChild: true,
    includesSensitiveData: true,
    versions: [
      en({
        byline: ["Joe Agi, Parent, Nigeria", "ONCAMPUS Coventry, United Kingdom", "BSc Computer Science pathway, September 2020"],
        blocks: [
          img("nigeria/joe-agi", "Joe Agi", 900, 1200),
          p("Sending your child overseas to study is one of the biggest decisions any parent can make. You want them to receive an excellent education, but equally important is knowing that someone genuinely cares about their wellbeing when you cannot be there yourself."),
          p("When my son travelled from Nigeria to begin his studies at ONCAMPUS Coventry, he was just 17 years old and needed a guardian in the United Kingdom."),
          p("I contacted Tim Hunt, Managing Director of World Student Advisors, to discuss the situation. Without hesitation, Tim offered to act as his guardian."),
          p("For me, that gesture meant a great deal. It was reassuring to know that my son had someone experienced, trustworthy and caring whom he could turn to while adjusting to life and education in a new country."),
          p("What began as a professional relationship gradually developed into something much more meaningful. Tim became a trusted friend of our family, and we remained in contact throughout my son's educational journey."),
          p("One of my happiest memories was visiting Tim at his home with my family for lunch on a Saturday in August 2021. It reflected how a professional relationship had grown into a lasting friendship."),
          img("nigeria/agi-family-clevedon", "Joe Agi and his family with Tim Hunt", 1200, 1200, "Joe Agi and his family with Tim Hunt at Tim’s home in Clevedon, August 2021."),
          p("Looking back, I realise that the greatest value of World Student Advisors is not simply helping young people gain admission to British institutions. It is the personal relationships, genuine care and commitment to students and their families."),
          p("My son gained an education, but our family also gained a lifelong friend."),
          p("I would gladly recommend World Student Advisors to Nigerian parents seeking someone who understands that sending a child abroad is about much more than obtaining a university place."),
        ],
      }),
    ],
  },
  {
    id: "south-sudan-arop-deng",
    name: "Arop Deng",
    countrySlug: "south-sudan",
    studentWasChild: true,
    versions: [
      en({
        title: "A lasting friendship and an education journey",
        byline: ["Arop Deng, parent, South Sudan"],
        blocks: [
          img("south-sudan/arop-deng", "Arop Deng", 1200, 1200),
          p("My relationship with Tim Hunt, Managing Director of World Student Advisors, began many years ago in Rome, where I was working with the United Nations Food and Agriculture Organisation (FAO). What started as a professional acquaintance developed into a lasting friendship. Over the years, Tim has helped my family through several stages of our children’s education in the United Kingdom."),
          img("south-sudan/tim-arop-fao-rome", "Tim Hunt and Arop Deng outside the FAO headquarters in Rome", 1200, 800, "Tim & Arop, UN Rome"),
          p("My son Leek was among the first in our family to benefit from Tim’s guidance. He studied for a master’s degree in Cybersecurity at the University of the West of England, Bristol, and subsequently became a lecturer at Weston College."),
          p("I particularly remember staying with Tim at his home in Kenilworth. We travelled to Bristol together to visit Leek at university. As a parent, it was reassuring to have someone alongside me who understood British higher education and took a personal interest in my son’s progress and wellbeing."),
          img("south-sudan/tim-arop-kenilworth", "Tim Hunt and Arop Deng outside Tim’s house", 768, 1024, "Tim & Arop, Tim’s house, Kenilworth"),
          img("south-sudan/leek-arop-tim-uwe", "Leek, Arop and Tim at a table at UWE Bristol", 1200, 900, "From left: Leek, Arop and Tim during a visit to UWE Bristol."),
          p("During that stay, Tim also invited me to join his friends, a group known as the “Epicureans”, at the Old Bakery pub. I did not know what to expect, but it became one of the most enjoyable evenings I have ever had. The lively conversation and the warmth of their welcome made me feel immediately among friends."),
          img("south-sudan/old-bakery-kenilworth", "Arop with Tim and his friends at the Old Bakery pub", 1200, 600, "The Old Bakery, Kenilworth. Arop meeting Tim’s friends."),
          p("Tim’s support continued with my daughter, Agot, who joined Aberystwyth University in Wales alongside her friend from South Sudan, Winner Emmanuel. Agot studied Marketing for three years, and we were delighted to celebrate her graduation together with Tim."),
          img("south-sudan/agot-graduation-interview", "Agot in her graduation cap and gown", 1200, 1027),
          img("south-sudan/agot-receiving-degree", "Agot crossing the stage at her graduation ceremony", 1200, 898, "Agot receiving her degree from Prof. Jon Timmis, VC Aberystwyth University"),
          p("Seeing Agot graduate was a proud moment for our family. It was particularly special to have her brothers, Deng and Leek, there to share the occasion."),
          img("south-sudan/family-graduation", "Deng, Agot, Arop and Leek at Aberystwyth University", 1200, 1200, "From left: Deng, Agot, Arop & Leek – family united."),
          p("When it was time to plan the next stage of education for my youngest son, Deng, I once again turned to Tim and World Student Advisors. WSA helped arrange his place on a GCSE programme at Bath Academy, where he began studying in September 2026."),
          img("south-sudan/deng-bath-academy", "Deng outside Bath Academy", 960, 1200, "Deng at Bath Academy"),
          p("A family friend also went on to study at Queen’s University Belfast with similar support, extending this connection beyond our immediate family."),
          p("Sending a child overseas to study requires considerable trust. Knowing someone who understands your family, respects your aspirations and remains available throughout the journey makes the experience much more reassuring."),
          p("What I value most about Tim and World Student Advisors is that the relationship continues long after a school or university place has been secured. The support is personal, and the connection endures."),
          p("Tim has become much more than an education adviser. He is a trusted friend of our family."),
          p("I am grateful for his guidance across different stages of my children’s education, and I would gladly recommend World Student Advisors to other families seeking knowledgeable, reliable and personal support for studying in the United Kingdom."),
        ],
      }),
    ],
  },
  {
    id: "tanzania-neema-mwakalinga",
    name: "Neema Mwakalinga",
    countrySlug: "tanzania",
    includesSensitiveData: true,
    versions: [
      en({
        byline: [],
        blocks: [
          img("tanzania/neema-mwakalinga", "Neema Mwakalinga", 1200, 1037),
          p("I almost dropped my phone when Tim Hunt, Managing Director of World Student Advisors, replied to me in Kiswahili! I later discovered that he had visited Tanzania several times and had a research interest in Tanzanian political history."),
          p("Tim introduced me to Eldah Therone, a British Council trained WSA Student Counsellor, who was extremely helpful. Eldah set up a WhatsApp group, making it easy to stay in touch and ask questions. She always responded with useful advice and practical tips."),
          p("Another pleasant surprise was WSA’s Student Support Library, with podcasts covering so many aspects of studying abroad. Whenever I had a question, there seemed to be a resource to help."),
          p("I was particularly nervous about the student visa interview. WSA arranged a mock interview for me, and the guidance was invaluable. Their practical advice helped me feel prepared and gave me the confidence to succeed."),
          p("With their support, I went on to study for a master’s degree in International Marketing at the University of Greenwich."),
          p("The support continued after I arrived. Tim visited Greenwich, where we met for coffee, and helped me with some initial research into placement opportunities with the United Nations."),
          p("WSA were full of pleasant surprises. One of the best was discovering that their advice and university application support were free of charge. I would happily recommend them to other students."),
          sig("Neema Mwakalinga, Tanzania", "Master’s study in International Marketing", "University of Greenwich"),
        ],
      }),
    ],
  },
  {
    id: "uganda-bakuyiira-ssegona",
    name: "Bakuyiira Ssegona",
    countrySlug: "uganda",
    versions: [
      en({
        byline: [],
        blocks: [
          img("uganda/bakuyiira-ssegona", "Bakuyiira Ssegona", 1200, 900),
          p("I had a wonderful experience with World Student Advisors. One unexpected connection was discovering that Tim Hunt’s daughter, Anita, spoke fluent Luganda! It was a lovely surprise and made the relationship feel personal from the beginning."),
          p("I had initially hoped to study in London, but the costs were beyond my budget. My WSA Student Counsellor, British Council Trained, Manet Khamayo, listened carefully to my circumstances and helped me explore alternatives. With her guidance, I chose to study for an MSc Business Management in Cyprus, which has been a wonderful experience."),
          p("What I particularly appreciated was that Manet took my budget seriously. She offered practical, realistic advice and worked hard to help me find a suitable option. Whenever I had questions, she was helpful, ready to respond and patient in explaining the next steps."),
          p("WSA’s free advice was supported by their Student Support Library, with podcasts covering applications, interview preparation and life as an international student. Their mock interview support also helped me prepare, understand what to expect and feel more confident."),
          p("The support continued after I arrived in Cyprus. Manet and the WSA team remained easy to contact whenever I needed guidance. Having someone familiar to turn to made settling into a new country much more reassuring."),
          p("I would happily recommend World Student Advisors to other students considering studying abroad, especially those looking for an option that suits both their ambitions and their budget."),
          sig("Bakuyiira Ssegona, Uganda", "MSc Business Management", "Studying in Cyprus"),
        ],
      }),
    ],
  },
  {
    id: "zambia-chipo-mwansa",
    name: "Chipo Mwansa",
    countrySlug: "zambia",
    versions: [
      en({
        byline: [],
        blocks: [
          img("zambia/chipo-mwansa", "Chipo Mwansa at the University of Portsmouth", 1200, 900),
          p("World Student Advisors helped me take an important step in my education. With their guidance, I chose the MBA at the University of Portsmouth, where I graduated in 2020."),
          p("My Student Counsellor, Glenice Owino, was knowledgeable, patient and approachable. Her British Council training showed in the clear, practical advice she provided. Whenever I had questions about my application or preparations for studying abroad, she was ready to help."),
          p("The interview preparation was particularly reassuring. Practising questions and receiving constructive feedback helped me explain my study plans with greater confidence. WSA’s podcasts also provided useful guidance that I could revisit in my own time."),
          p("I was pleasantly surprised to discover that Tim Hunt spoke a little Chichewa! His greeting, “Muli Bwanji, Chipo,” made me feel welcome. Later, we met for coffee when he visited Portsmouth. It was lovely to know that the support continued after I had arrived and begun my course."),
          p("As I approached graduation, I also appreciated guidance on preparing my CV and thinking about my options after my studies. WSA encouraged me to think carefully about my next steps and how to present my qualifications and experience to employers."),
          p("Studying for an MBA was demanding and rewarding. Having a supportive team to turn to made the journey easier, and I would happily recommend World Student Advisors to other students considering studying abroad."),
          sig("Chipo Mwansa, Zambia", "MBA, University of Portsmouth", "Graduated in 2020"),
        ],
      }),
    ],
  },
  {
    id: "zimbabwe-darlene-makwangudze",
    name: "Darlene Makwangudze",
    countrySlug: "zimbabwe",
    versions: [
      en({
        byline: [],
        blocks: [
          img("zimbabwe/london-south-bank", "Students walking along London’s South Bank", 1200, 900),
          p("I wanted to study for an MBA in London, but moving to a city where I did not know anyone felt daunting. Choosing a university was only part of the challenge. I also wanted to know how I would settle in and find a community."),
          p("World Student Advisors understood those concerns. They helped me with my application to London South Bank University and offered practical advice about preparing for life in the UK. Their support was personal and free of charge, and there was always someone I could contact when I had questions."),
          p("One particularly valuable introduction was to the Zimbabwe Association, where I found helpful advice about settling into life in Britain. Having a connection to people who understood my background made the move feel much less overwhelming."),
          p("Once I joined London South Bank University, I also became involved in the Students’ Union’s African Society. Meeting other students and sharing experiences helped me feel more at home. London gradually became somewhere I could enjoy living as well as studying."),
          p("What impressed me about WSA was their understanding that students need different kinds of support. Alongside individual guidance, their Student Support Library podcasts cover topics ranging from applications and interview preparation to adjusting to university life. Mock interview support also helps students prepare to explain their study plans with confidence."),
          p("For me, the most important thing was feeling that I had support beyond the university application. WSA helped me think about the life I would be building in London, including the friendships and community that would make it rewarding."),
          p("I would happily recommend World Student Advisors to other Zimbabwean students considering studying abroad. Their practical advice and personal approach can make a big move feel much more manageable."),
          sig("Darlene Makwangudze, Zimbabwe", "MBA, London South Bank University"),
        ],
      }),
    ],
  },
];

export const STORY_RECORDS: readonly SuccessStory[] = STORY_CONTENT.map(released);
