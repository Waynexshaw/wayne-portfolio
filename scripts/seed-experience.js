const { createClient } = require('@supabase/supabase-js');

const url = 'https://fvkywedtcwbqtqvgwqhn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a3l3ZWR0Y3dicXRxdmd3cWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTExNjg3NiwiZXhwIjoyMTA0NjkyODc2fQ.Uk0HkeLr56G6iVoYfdgJJprULxgXUfFXmfBcDZ6iEXk';

const supabase = createClient(url, key);

const experiences = [
  {
    organization: "PEVRA",
    role: "Founder",
    start_date: "2026-01-01",
    end_date: null,
    link: "https://pevranetwork.com.ng",
    order_index: 0,
    description: "PEVRA is a blockchain telecommunications platform focused on permanent, non-recyclable phone numbers using blockchain and soulbound-token technology on Polygon.\n\nBuilding PEVRA has given me direct experience taking an idea from concept toward an actual business. It has also forced me to think about strategy from the operator's side, where decisions have real consequences.",
    achievements: [
      "Product design and product direction",
      "Tokenomics & technical roadmap planning",
      "Developer partnerships & telecom/university partnerships",
      "Go-to-market strategy & brand/product positioning",
      "Community and waitlist growth",
      "Licensing and compliance research"
    ]
  },
  {
    organization: "RiddimzHub",
    role: "Growth Strategist",
    start_date: "2025-06-01",
    end_date: "2026-01-01",
    link: null,
    order_index: 1,
    description: "Worked across the project's growth, branding, community and visibility (6+ months). Positioned around creators who perform, speak and move culture, with a focus on bringing live music and podcasts onchain. I rebuilt how a new user encountered and understood the project, designed an automated onboarding flow, structured the ambassador program, and developed the whitepaper and tokenomics from scratch.",
    achievements: [
      "Grew community from 12 members to 1,000+ members in roughly two months",
      "Hosted high-impact X Spaces with prominent industry speakers and active listeners",
      "Developed whitepaper and designed tokenomics model from scratch",
      "Designed self-guided onboarding flow and moderator welcome systems",
      "Structured ambassador program with clear onboarding and performance metrics",
      "Executed creator campaigns, community invites, and Founders Night activations"
    ]
  },
  {
    organization: "Doruzuonape",
    role: "Community & Growth",
    start_date: "2025-03-01",
    end_date: "2025-05-01",
    link: null,
    order_index: 2,
    description: "Joined when the project had no established community structure. Focused on building the systems needed to bring people in, keep them active and help them understand the project. Created activities that gave members reasons to participate rather than simply joining and becoming inactive. Strengthened my understanding of community as an active system rather than simply a member count.",
    achievements: [
      "Grew community from 0 to 1,000+ members in two months",
      "Recorded strong NFT sales through active community engagement and lore development",
      "Developed NFT storytelling, lore, daily community activities and game nights",
      "Hosted daily X Spaces and community education sessions",
      "Represented project in ecosystem gaming competition: 1st place individual, 5th place project finish"
    ]
  },
  {
    organization: "MetaKeySwap",
    role: "Growth Strategist",
    start_date: "2025-01-01",
    end_date: "2025-03-01",
    link: null,
    order_index: 3,
    description: "MetaKeySwap was building a decentralized exchange focused on swapping, farming, liquidity pools and IDO functionality. When I joined, the project had weak branding, limited community structure and poor visibility. I built and executed a growth structure around branding, community, and visibility. The project eventually folded — an invaluable lesson that growth structure cannot replace a team's core ability to keep building and operating.",
    achievements: [
      "Executed hands-on growth strategy across branding, community, and visibility",
      "Structured referral campaigns and community activations driving measurable activity boosts",
      "Transformed weak branding into clear messaging and narrative",
      "Hands-on execution of daily growth and visibility initiatives"
    ]
  },
  {
    organization: "Profunda Academy",
    role: "DeFi Research, Content & Internship",
    start_date: "2024-06-01",
    end_date: "2024-12-01",
    link: null,
    order_index: 4,
    description: "Completed formal training in DeFi research through Profunda Academy and continued with a free internship. This marked an important stage in my transition from simply learning about Web3 to developing professional research, protocol analysis, and structured communication skills.",
    achievements: [
      "Rigorous protocol analysis and DeFi market research",
      "Structured research communication and complex concept breakdown",
      "Published research breakdowns and educational articles"
    ]
  },
  {
    organization: "Early Web3 Writing & Research",
    role: "Writer & Researcher",
    start_date: "2023-01-01",
    end_date: "2024-05-01",
    link: null,
    order_index: 5,
    description: "My entry into Web3 began through writing and research. I started by studying protocols, breaking down projects, and publishing what I learned. Over time, my questions shifted from 'What does this project do?' toward 'Why would someone use it? Why would they leave? What makes it useful? How does it grow?' — laying the foundation for my strategy and growth work today.",
    achievements: [
      "In-depth research on emerging DeFi protocols, token design, and ecosystem mechanics",
      "Authored educational articles, breakdowns, and threads clarifying decentralized finance",
      "Developed the foundational mental models that evolved into the Web3 Chessboard Strategy"
    ]
  }
];

async function seed() {
  console.log("Clearing existing experience rows...");
  await supabase.from('experience').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Inserting new experience records...");
  const { data, error } = await supabase.from('experience').insert(experiences).select();
  if (error) {
    console.error("Error inserting experiences:", error);
  } else {
    console.log("Successfully inserted " + data.length + " experience records!");
  }
}

seed();