// Single source of truth for the briefing text and the X thread.
// Markup: **bold**, _italic_, [@id,id2] = citation(s) keyed to data/sources.json.
// Sections 1-4 hold sourced facts only. Section 5 holds analysis only.

const AS_OF = '31 October 2026';

const briefing = [
  { type: 'kicker', text: `COMMUNITY BRIEFING  ·  PREPARED FOR THE REDBELLY DAO  ·  ${AS_OF.toUpperCase()}` },
  { type: 'title', text: 'Redbelly’s incoming CEO: Christian Westerlind Wigstrom' },
  { type: 'subtitle', text: 'His professional record, what Redbelly said about the appointment, and what it could mean for Tokeniser' },
  {
    type: 'guide',
    text: '**How to read this briefing.** Sections 1 to 4 are sourced fact. Section 5 is analysis and is marked as such. Section 6 lists open questions. Bracketed numbers link to the sources in Annex A; every link was checked on 31 October 2026. Dollar figures are as reported by the companies named.',
  },
  {
    type: 'glance',
    title: 'At a glance',
    rows: [
      ['New role', 'Chief Executive Officer of Redbelly Network, starting Monday 2 November 2026 [@redbelly,bankingday]'],
      ['Known for', 'Co-founding Australian payments company Monoova and leading it for 9.5 years; in May 2026 Monoova announced he was stepping down as CEO [@monoova-ceo]'],
      ['Track record', 'Monoova reported over $1 billion processed by October 2019 and close to $200 billion by May 2026 [@cuscal,monoova-ceo]'],
      ['Industry roles', 'FinTech Australia board member and Treasurer; Alternate Director of the Australian Payments Network [@fta-2023,auspaynet]'],
      ['Why Redbelly hired him', 'Redbelly says he “joins to lead the company’s push into regulated tokenisation” [@redbelly]'],
    ],
  },

  { type: 'h1', num: '1', text: 'The appointment', tag: 'fact' },
  {
    type: 'p',
    text: 'On 16 September 2026, Redbelly Network announced Christian Westerlind Wigstrom as its Chief Executive Officer, starting in November 2026. It said he “joins to lead the company’s push into regulated tokenisation” [@redbelly]. The announcement was also issued as a press release through Medianet [@medianet] and covered by SMB Tech [@smbtech]. Banking Day, a banking and finance news service, reported his start date as Monday, 2 November 2026 [@bankingday].',
  },

  { type: 'h1', num: '2', text: 'Professional background', tag: 'fact' },
  { type: 'h2', text: 'Before payments' },
  {
    type: 'p',
    text: 'He holds a master’s degree in economics and a PhD in international relations from the University of Oxford [@tierone]. As a doctoral student he worked with Robert Skidelsky on economic policy and theory [@inet], and he was an economic adviser and speechwriter in the House of Lords [@tierone,bizconv]. In 2010 the two co-edited _The Economic Crisis and the State of Economics_ (Palgrave Macmillan) [@econpapers]. From September 2010 he was also executive secretary of the UK branch of an economics-curriculum task force run by the Institute for New Economic Thinking [@inet]. He then spent three years as Chief of Staff at a Harare-based agricultural group in Zimbabwe [@tierone,bizconv], and arrived in Australia in late 2016 [@bizconv].',
  },
  { type: 'h2', text: 'Monoova, 2017 to 2026' },
  {
    type: 'p',
    text: 'Monoova was founded in 2017 as Moneytech Payments [@cuscal] and rebranded as Monoova in 2019 [@about]. It is a business-to-business payments company: other businesses connect to it through one software integration (an API) to receive, manage and pay funds [@about]. Monoova describes him as a co-founder [@monoova-ceo]. It works inside the regulated system. Monoova is the authorised representative of Monoova Global Payments, which holds Australian Financial Services (AFS) Licence 421414, and both companies are enrolled as reporting entities with AUSTRAC [@about]. An AFS licence is generally needed to run a financial services business in Australia [@asic-afs], and AUSTRAC is Australia’s anti-money-laundering regulator and financial intelligence unit [@homeaffairs].',
  },
  {
    type: 'table',
    widths: [880, 5300, 2300, 1300],
    head: ['Year', 'Milestone', 'Reported scale', 'Source'],
    rows: [
      ['2019', 'Connects to the New Payments Platform (NPP), adding real-time payments for its clients, as one of a very small group of non-bank institutions enabled on it. He is quoted as Head of Monoova.', 'Over $1 billion processed since 2017', '[@cuscal]'],
      ['2022', 'Merges with foreign-exchange fintech Moneytech FX to add cross-border payments; team of around 70. Named Fintech Organisation of the Year.', 'About $50 billion since launch', '[@startupdaily,about]'],
      ['2023–24', 'First mover on PayTo, a new way to authorise payments from a bank account, in 2023. By mid-2024 it handles “a comfortable majority of all PayTo activity”.', '$75 billion processed to date (May 2023)', '[@tierone,payto,about]'],
      ['2025', 'Named Company of the Year at the Global FinTech Awards in London.', '–', '[@about]'],
      ['2026', 'Steps down as CEO after 9.5 years (announced 18 May); a new CEO starts on 1 July.', 'Close to $200 billion since he joined', '[@monoova-ceo]'],
    ],
    note: 'Reported scale is the cumulative value of payments processed, as stated by Monoova or in coverage at the time. It is not revenue. No independent audit of these figures was found.',
  },
  {
    type: 'p',
    text: '**Clients and reach.** Monoova’s clients have included Wise and Nium [@tierone], Hnry [@startupdaily] and the listed business Carsales [@monoova-ceo]. A 2023 profile says it also served “a significant portion of the Australian digital-currency industry” [@tierone]. By May 2026 it transacted with more than 10% of all Australians [@monoova-ceo]. Redbelly says Monoova became Australia’s largest PayTo processor and issued almost a quarter of the country’s PayIDs [@redbelly]. PayTo lets people authorise and manage payment agreements in their online banking [@payto]; a PayID is an easy-to-remember detail, such as a mobile number or email address, linked to a bank account [@payid].',
  },
  {
    type: 'p',
    text: '**In his own words.** According to the notes of a 2023 podcast episode, in a 2018 talk titled “The Death of Payments 2030” he “argued that while payments would not die, paying would” [@tierone]. In 2019 he said that by fully automating how funds are received and managed, businesses can spend more time servicing their customers [@cuscal].',
  },
  { type: 'h2', text: 'Industry roles and recognition', keepNext: true },
  {
    type: 'table',
    widths: [3150, 4300, 1250, 1100],
    head: ['Organisation', 'Role', 'When', 'Source'],
    rows: [
      ['FinTech Australia', 'Elected to the board', 'Dec 2022', '[@fta-2022]'],
      ['FinTech Australia', 'Appointed Treasurer', 'Nov 2023', '[@fta-2023]'],
      ['FinTech Australia', 'Re-elected as a director; reappointed Treasurer for a second term', 'Nov–Dec 2024', '[@monoova-fta,fta-2024]'],
      ['Australian Payments Network (AusPayNet)', 'Alternate Director, elected by non-bank payment service providers to represent their interests', 'Mar 2025', '[@auspaynet]'],
    ],
  },
  {
    type: 'p',
    text: 'FinTech Australia is the peak body for the Australian fintech sector [@monoova-fta]. AusPayNet is the payments industry’s self-regulatory body and works with government regulators on policy development [@auspaynet]. In September 2026, Banking Day described him as sitting on the FinTech Australia board and serving as an alternate director at AusPayNet [@bankingday]. He was a finalist for FinTech Australia’s Outstanding Fintech Leader of the Year in 2020, 2021 and 2022 [@tierone].',
  },

  { type: 'h1', num: '3', text: 'What Redbelly said', tag: 'fact' },
  {
    type: 'p',
    text: '**The thesis.** Redbelly links the hire to one idea from his Monoova years: “payments infrastructure must be good enough to disappear into the background” [@redbelly]. It says he is applying the same thesis to regulated capital-markets infrastructure, which “must be secure, scalable and fast enough to support enterprise-level use cases behind the scenes” [@redbelly].',
  },
  {
    type: 'p',
    text: '**The timing.** Redbelly says tokenisation in Australia has moved beyond pilots, and points to two developments [@redbelly]:',
    keepNext: true,
  },
  {
    type: 'bullets',
    items: [
      '**A new law.** The Corporations Amendment (Digital Assets Framework) Act 2026 is listed on the federal legislation register as Act No. 38 of 2026, dated 8 April 2026 [@legislation]. It creates a regulatory framework for digital asset platforms, which hold digital tokens for clients, and tokenised custody platforms, which record clients’ assets as digital tokens [@asic]. ASIC (the Australian Securities and Investments Commission) says these laws commence on 8 April 2027, and it is consulting on its guidance until 27 November 2026 [@asic].',
      '**Project Acacia.** The Reserve Bank of Australia (RBA) and the Digital Finance Cooperative Research Centre released the project’s findings on 18 May 2026. Industry participants tested 20 wholesale tokenised-asset use cases, with settlement options that included a pilot wholesale central bank digital currency [@rba-acacia]. “Wholesale” here means for financial institutions and other large institutions [@rba-money]. Redbelly says it was “the only public Layer 1 carrying real central bank claims on public infrastructure” [@redbelly]. A Layer 1 is the main blockchain in a multi-level blockchain network [@glossary].',
    ],
  },
  {
    type: 'p',
    text: '**Why him.** Redbelly says he “is not a crypto tourist” and has “spent years inside the regulated financial system, learning how new rails get adopted” [@redbelly]. It quotes him twice [@redbelly]:',
    keepNext: true,
  },
  {
    type: 'quote',
    paras: [
      '“One of Redbelly’s many strengths is its regulatory credibility. In payments, I learnt that success belonged to the company that saw compliance as a product edge rather than a tick box. The same thing applies to capital-markets infrastructure. As new regulation takes effect, this insight stops being philosophical and starts being existential.”',
      '“The next era of finance won’t be won by the loudest chain,” he is quoted as saying. “It’ll be won by the chain that institutions can actually use.”',
    ],
  },

  { type: 'h1', num: '4', text: 'Redbelly and Tokeniser in brief', tag: 'fact' },
  {
    type: 'p',
    text: 'Redbelly Network describes itself as “a Layer 1 blockchain built for regulated finance, with native identity and compliance” [@redbelly]. Its consensus method, the way the network’s computers agree that they hold the same set of records [@glossary], is patented and grew out of research at the University of Sydney and CSIRO, Australia’s government science agency [@tok-tech]. Banking Day notes that the research was led by Professor Vincent Gramoli, Redbelly’s founder and CTO [@bankingday]. Figures published by Redbelly Network date the main network’s launch to October 2024 and put its validators, the computers that process transactions and add new blocks [@glossary], at more than 400 [@tok-tech].',
  },
  {
    type: 'p',
    text: 'Tokeniser describes itself as “a Redbelly Network project”, provided by the Australian company Tokeniser Pty Ltd [@tokeniser]. Redbelly says its tokenisation strategy is delivered through Tokeniser, which “brings fund and equity administration on-chain for regulated markets” [@redbelly].',
    keepNext: true,
  },
  {
    type: 'bullets',
    items: [
      '**Who it serves.** Funds, corporate share registries and asset administrators, with one platform that handles everything from issuance to settlement [@tokeniser]. Banking Day lists equities, notes and bonds, private credit, derivatives and commodities among the asset types [@bankingday].',
      '**Rules built in.** Identity, know-your-customer (KYC), anti-money-laundering and counter-terrorism-financing (AML/CTF) checks, and wholesale and sophisticated-investor tests, are programmed into each asset, with “every transfer checked against the asset’s rules” [@tokeniser]. Products issued through Tokeniser operate under the issuer’s existing licensing [@tokeniser].',
      '**Partners and team.** It works with IQ-EQ for customers that need a globally licensed institutional operator, and it has its own leadership team, chaired by Alan Burt [@tok-about].',
    ],
  },

  { type: 'h1', num: '5', text: 'Analysis: what this could mean for Tokeniser', tag: 'analysis' },
  {
    type: 'analysis',
    label: '**Analysis, not fact.** This section interprets the sourced facts in Sections 1 to 4. It is not a statement of Redbelly’s plans, a forecast or financial advice.',
    items: [
      '**Infrastructure that disappears.** From his 2018 talk to the 2026 announcement, his public record keeps returning to payments that run in the background [@tierone,cuscal,redbelly]. Tokeniser already offers “a familiar experience” with Redbelly running underneath [@tokeniser,tok-tech]. Tokeniser may therefore be pitched to fund managers and registries as back-office infrastructure rather than as a crypto product.',
      '**Growth through partners.** Monoova grew by acting “behind the scenes” of other brands [@redbelly]. Tokeniser has comparable channels through share registries, asset administrators and IQ-EQ [@tokeniser,tok-about]. Progress may show up first as institutions and assets onboarded, rather than as public attention.',
      '**Compliance as a selling point.** He led a business that operates under an AFS licence arrangement and is enrolled with AUSTRAC [@about], and he calls compliance “a product edge rather than a tick box” [@redbelly]. With the new rules due to commence on 8 April 2027 [@asic], Tokeniser’s built-in eligibility checks [@tokeniser] could move to the centre of Redbelly’s message.',
      '**Policy experience.** His FinTech Australia and AusPayNet roles involved working alongside policymakers and regulators [@monoova-fta,auspaynet]. That could matter while the rules are still being settled. ASIC’s consultation runs to 27 November 2026 [@asic], and the RBA is exploring a regulatory “sandbox” to give industry “a more structured pathway from experimentation to commercialisation” [@rba-acacia].',
      '**Getting new rails adopted.** Monoova was early on the NPP in 2019 and on PayTo in 2023 [@cuscal,tierone]. The RBA says its next program will focus on “overcoming long standing co-ordination challenges” [@rba-acacia], that is, getting many institutions to move together. Experience with that problem may be the most transferable part of his record.',
    ],
    subhead: 'Where the fit is less direct',
    items2: [
      '**Different buyers.** Monoova served businesses that move money [@about]; Tokeniser serves funds, registries and asset administrators [@tokeniser].',
      '**A public network.** Redbelly runs on more than 400 validators [@tok-tech], which has no clear parallel at a business-to-business payments firm.',
      '**New territory.** None of the sources reviewed shows an earlier role leading a blockchain network, although Monoova served digital-currency businesses [@tierone].',
      '**Shared leadership.** Redbelly’s founder is its CTO [@bankingday]; the announcement does not say how responsibilities will be divided [@redbelly].',
    ],
  },

  { type: 'h1', num: '6', text: 'Open questions', tag: 'questions' },
  { type: 'p', text: 'These are questions, not claims. The announcement does not address [@redbelly]:', keepNext: true },
  {
    type: 'bullets',
    items: [
      'His first priorities, targets or timelines, and whether Tokeniser’s product plans will change.',
      'How Redbelly and Tokeniser will prepare for the new licensing rules before 8 April 2027 [@asic], and how ASIC’s final guidance treats Tokeniser’s position that public digital token infrastructure sits outside custody licensing [@tok-tech].',
      'How work will be divided between Redbelly’s leadership and Tokeniser’s own team [@tok-about].',
      'Any effect on the DAO, validators or community programs.',
    ],
  },
];

// X thread. Each post must stay within 280 weighted characters (every URL counts as 23).
const thread = [
  {
    text: 'Redbelly Network has named Christian Westerlind Wigstrom as its new CEO. He starts on Monday 2 November 2026. Here is a short, sourced briefing on his professional record and what it could mean for Tokeniser. (1/8)',
    links: ['redbelly', 'bankingday'],
  },
  {
    text: 'Who is he? He co-founded Australian payments company Monoova, first known as Moneytech Payments, and led it for 9.5 years. In May 2026 Monoova announced he was stepping down as CEO; a new CEO started on 1 July. (2/8)',
    links: ['monoova-ceo'],
  },
  {
    text: 'Scale, as reported: Monoova processed over $1bn by October 2019 and close to $200bn by May 2026. Redbelly says Monoova became Australia’s largest PayTo processor. These are company-reported figures. (3/8)',
    links: ['cuscal', 'monoova-ceo', 'redbelly'],
  },
  {
    text: 'Before payments: a master’s in economics and a PhD from Oxford, work as an economic adviser and speechwriter in the House of Lords, and three years as Chief of Staff at an agricultural group in Zimbabwe. (4/8)',
    links: ['tierone', 'bizconv'],
  },
  {
    text: 'Industry roles: FinTech Australia board member from 2022 and Treasurer from 2023; Alternate Director of the Australian Payments Network, the payments industry’s self-regulatory body, from 2025. (5/8)',
    links: ['fta-2022', 'fta-2023', 'auspaynet'],
  },
  {
    text: 'Redbelly says he joins “to lead the company’s push into regulated tokenisation”. In his words: “In payments, I learnt that success belonged to the company that saw compliance as a product edge rather than a tick box.” (6/8)',
    links: ['redbelly'],
  },
  {
    text: 'Context: ASIC says Australia’s new laws for digital asset and tokenised custody platforms commence on 8 April 2027. Tokeniser, a Redbelly Network project, serves funds, share registries and asset administrators. (7/8)',
    links: ['asic', 'tokeniser'],
  },
  {
    text: 'Analysis, not fact: his record centres on infrastructure that runs in the background, sold through partners, with compliance as a feature. That may shape how Tokeniser is pitched to institutions. The announcement does not set out his priorities. (8/8)',
    links: ['redbelly'],
  },
];

module.exports = { AS_OF, briefing, thread };
